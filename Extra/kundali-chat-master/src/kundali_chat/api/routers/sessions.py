"""The three chat endpoints. Session/message shape mirrors ai-core's
playground pattern: create session → send message (202, fire-and-poll) →
poll for the reply via a keyset cursor over ``(created_at, id)``.

Table names are ALWAYS resolved via ``resolve_table_names()`` — never a
literal — per ``models/tables.py``'s module docstring.
"""

from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import datetime
from typing import Any, cast

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from kundali_chat.api.deps import (
    AnonUserIdDep,
    GraphDep,
    KundaliClientDep,
    PoolDep,
    RedisDep,
    StreamDep,
)
from kundali_chat.graph.directives import GREETING_TRIGGER_MESSAGE
from kundali_chat.kundali.cache import kundali_key
from kundali_chat.kundali.client import BirthDetails, birth_cache_ref
from kundali_chat.models.enums import KundaliFetchStatus, MessageRole, MessageStatus
from kundali_chat.models.tables import resolve_table_names
from kundali_chat.safety.canned_responses import get_timeout_message, hint_to_language
from kundali_chat.shared.logging import get_logger

_log = get_logger("kundali_chat.api.routers.sessions")

# TTL for a kundali loaded from an uploaded text blob (test-mode ingestion).
_KUNDALI_TEXT_TTL_S = 24 * 60 * 60

router = APIRouter(prefix="/sessions")


# Size control: a full engine report is ~1MB — ~85% of it is the ENTIRE nested
# Vimshottari dasha tree, plus divisional charts and pre-rendered HTML. Feeding
# that to the LLM is slow (~300k tokens) and doesn't scale to many users. We
# shrink each upload to a few KB of ONLY the chat-relevant placements. This is
# structured extraction (not embeddings/RAG): the data is structured and we know
# which fields matter, so extraction is faster and lossless where it counts,
# with no extra per-query retrieval latency.
_MAX_STR_LEN = 600
_MAX_LIST_LEN = 120
_MAX_TOTAL_CHARS = 16_000  # compacted bigger than this -> slim hard
_MAX_SECTION_CHARS = 4_000  # drop any single section bigger than this when slimming
_MAX_RAW_CHARS = 20_000  # cap free-text uploads too

# Huge / chat-irrelevant sections dropped when slimming. The one thing still
# needed from the dasha tree — the CURRENT dasha — is lifted out first.
# NOTE: also drops dasha fields that CONFLICT with the current dasha — the raw
# balance-at-birth ("BALANCE_OF_DASHA": "Saturn ...") and the dasha ORDER list
# ("SORTED_DASHAS": ["Saturn", ...]) both start with a different planet and
# made the model report the wrong Mahadasha. Only the lifted ``current_dasha``
# should speak for the running period.
_DENY_SECTION_RE = re.compile(
    r"(vimshottari|pratyantar|antardasha_data|sample_dasha|mahadasha_header|"
    r"balance_of_dasha|sorted_dasha|sodashvarga|ashtakavarga|ashtakvarga|"
    r"sarvashtak|_content|_pages|_header|_rows|introduction|calendar)",
    re.IGNORECASE,
)
_KEEP_LARGE = {"LAAGNA_TABLE", "PLANET_INFO", "PLANETINFO"}


def _compact_json(value: Any) -> Any:
    """Recursively strip bulky prose (long strings) while keeping structured
    fields. First-pass shrink applied to every uploaded JSON."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            cv = _compact_json(v)
            if cv is not None:
                out[k] = cv
        return out
    if isinstance(value, list):
        return [_compact_json(v) for v in value[:_MAX_LIST_LEN]]
    if isinstance(value, str):
        return None if len(value) > _MAX_STR_LEN else value
    return value


def _find_name(value: Any) -> str:
    """Best-effort: pull the person's name out of an arbitrary kundali JSON.
    Checks any ``name``-ish key (NAME / name / Name / full_name ...) at the top
    level first, then nested objects."""
    if not isinstance(value, dict):
        return ""
    name_keys = ("name", "full_name", "fullname", "user_name", "username")
    for k, v in value.items():
        if str(k).strip().lower() in name_keys and isinstance(v, str) and v.strip():
            return v.strip()
    for v in value.values():
        if isinstance(v, dict):
            nested = _find_name(v)
            if nested:
                return nested
    return ""


def _slim_kundali(parsed: dict[str, Any]) -> dict[str, Any]:
    """Aggressive pass for oversized reports: keep only compact, chat-relevant
    sections. Lifts ``currentDasha`` out of the giant Vimshottari tree, drops
    that tree and other bulky/irrelevant sections, and drops any remaining
    oversized subtree."""
    out: dict[str, Any] = {}

    for vk in ("VIMSHOTTARI_CONTENT", "vimshottari_content", "VIMSHOTTARI_DASHA"):
        vc = parsed.get(vk)
        if isinstance(vc, dict) and isinstance(vc.get("currentDasha"), dict):
            out["current_dasha"] = _compact_json(vc["currentDasha"])
            break

    for k, v in parsed.items():
        if _DENY_SECTION_RE.search(str(k)):
            continue
        cv = _compact_json(v)
        if cv is None:
            continue
        if (
            str(k).upper() not in _KEEP_LARGE
            and len(json.dumps(cv, ensure_ascii=False)) > _MAX_SECTION_CHARS
        ):
            continue
        out[k] = cv
    return out


def kundali_from_text(content: str, name: str) -> dict[str, Any]:
    """Turn an uploaded kundali blob into the compact context the chat answers
    from.

    In production the kundali JSON comes from the engine API and is fed into
    Redis; this mirrors that. A JSON object is shrunk to a few KB of the
    chat-relevant placements (see the size-control note above) so the LLM reads
    it fast at scale; anything else is kept as (capped) free text under ``raw``.
    The person's name is taken from the file itself when present."""
    text = content.strip()
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        parsed = None
    if isinstance(parsed, dict):
        compact = _compact_json(parsed)
        if len(json.dumps(compact, ensure_ascii=False)) > _MAX_TOTAL_CHARS:
            compact = _slim_kundali(parsed)
        compact.setdefault("basic_details", {})
        # Name priority: basic_details.name -> any name-ish key in the file ->
        # the caller-supplied name.
        compact["basic_details"]["name"] = (
            compact["basic_details"].get("name") or _find_name(parsed) or name
        )
        return compact
    return {"raw": text[:_MAX_RAW_CHARS], "basic_details": {"name": name}}


class SessionCreateBody(BaseModel):
    """The user's birth details — the input the kundali engine needs."""

    name: str = Field(..., min_length=1, max_length=120)
    gender: str = Field("unspecified", max_length=32)
    dob: str = Field(..., description="Date of birth, YYYY-MM-DD.")
    tob: str = Field("12:00", description="Time of birth (local), HH:MM or HH:MM:SS.")
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    place: str = Field("", max_length=160, description="Human-readable birth place, display only.")
    timezone_offset_minutes: int = Field(
        330, ge=-720, le=840, description="Minutes to ADD to local time to get UTC (India = -330)."
    )

    def to_birth_details(self) -> BirthDetails:
        try:
            d = datetime.strptime(self.dob, "%Y-%m-%d")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="dob must be YYYY-MM-DD",
            ) from exc
        parts = self.tob.split(":")
        try:
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            second = int(parts[2]) if len(parts) > 2 else 0
            if not (0 <= hour < 24 and 0 <= minute < 60 and 0 <= second < 60):
                raise ValueError
        except (ValueError, IndexError) as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="tob must be HH:MM or HH:MM:SS",
            ) from exc
        return {
            "name": self.name,
            "gender": self.gender,
            "year": d.year,
            "month": d.month,
            "day": d.day,
            "hour": hour,
            "minute": minute,
            "second": second,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "place": self.place,
            "timezone_offset_minutes": self.timezone_offset_minutes,
        }


class SessionCreateOut(BaseModel):
    session_id: uuid.UUID
    kundali: dict[str, Any]


class MessageCreateBody(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageCreateOut(BaseModel):
    message_id: uuid.UUID


class MessageOut(BaseModel):
    id: uuid.UUID
    role: MessageRole
    content: str
    status: MessageStatus
    safety_flag: str | None
    hook_event: dict[str, Any] | None
    # Token usage per assistant reply — used by the playground's cost viewer.
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    created_at: datetime


class MessagesOut(BaseModel):
    messages: list[MessageOut]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreateBody,
    anon_user_id: AnonUserIdDep,
    pool: PoolDep,
    kundali_client: KundaliClientDep,
    graph: GraphDep,
) -> SessionCreateOut:
    birth = body.to_birth_details()
    try:
        kundali = await kundali_client.fetch_kundali(birth)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"could not generate kundali: {exc}",
        ) from exc

    kundali_dict = cast("dict[str, Any]", kundali)
    session_id = await _persist_session_and_greet(
        pool=pool,
        graph=graph,
        anon_user_id=anon_user_id,
        kundali_session_ref=birth_cache_ref(birth),
        kundali=kundali_dict,
    )
    return SessionCreateOut(session_id=session_id, kundali=kundali_dict)


class SessionFromTextBody(BaseModel):
    """Test-mode ingestion: a kundali payload (JSON or free text) that stands
    in for what the engine API would push into Redis in production."""

    name: str = Field("friend", max_length=120)
    content: str = Field(..., min_length=1, max_length=5_000_000)


@router.post("/from-text", status_code=status.HTTP_201_CREATED)
async def create_session_from_text(
    body: SessionFromTextBody,
    anon_user_id: AnonUserIdDep,
    pool: PoolDep,
    redis: RedisDep,
    stream: StreamDep,
) -> SessionCreateOut:
    """Create a session whose kundali comes from an uploaded blob instead of a
    live engine call — the chat then answers purely from that stored context.

    The greeting is generated ASYNCHRONOUSLY (enqueued to the stream, like any
    turn) so the upload returns instantly instead of blocking on the LLM."""
    kundali = kundali_from_text(body.content, body.name)
    ref = "text:" + hashlib.sha1(body.content.encode("utf-8")).hexdigest()

    # Mirror production's data flow: the kundali lands in Redis first.
    try:
        await redis.set(kundali_key(ref), json.dumps(kundali), ex=_KUNDALI_TEXT_TTL_S)
    except Exception as exc:  # cache mirror is best-effort; Postgres is source of truth
        _log.warning("from-text: redis mirror failed", error=str(exc))

    names = resolve_table_names()
    async with pool.acquire() as conn:
        session_row = await conn.fetchrow(
            f"""
            INSERT INTO {names["sessions"]}
              (kundali_session_ref, anon_user_id, kundali_cache, kundali_fetch_status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            ref,
            anon_user_id,
            kundali,
            KundaliFetchStatus.ok.value,
        )
        session_id = session_row["id"]
        greeting_row = await conn.fetchrow(
            f"""
            INSERT INTO {names["messages"]} (session_id, role, content, status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            session_id,
            MessageRole.assistant.value,
            "",
            MessageStatus.pending.value,
        )

    await stream.enqueue(
        message_id=str(greeting_row["id"]), session_id=str(session_id), greeting=True
    )
    return SessionCreateOut(session_id=session_id, kundali=cast("dict[str, Any]", kundali))


async def _persist_session_and_greet(
    *,
    pool: Any,
    graph: Any,
    anon_user_id: uuid.UUID | None,
    kundali_session_ref: str,
    kundali: dict[str, Any],
) -> uuid.UUID:
    """Insert the session row, generate the first-turn greeting synchronously,
    persist it, and mark ``greeting_sent``. Shared by both create paths."""
    names = resolve_table_names()
    async with pool.acquire() as conn:
        session_row = await conn.fetchrow(
            f"""
            INSERT INTO {names["sessions"]}
              (kundali_session_ref, anon_user_id, kundali_cache, kundali_fetch_status)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            """,
            kundali_session_ref,
            anon_user_id,
            kundali,
            KundaliFetchStatus.ok.value,
        )
        session_id = session_row["id"]

    greeting_status = MessageStatus.complete
    greeting_error: str | None = None
    try:
        greeting_result: dict[str, Any] = await graph.ainvoke(
            {
                "session_id": str(session_id),
                "user_message": GREETING_TRIGGER_MESSAGE,
                "kundali": kundali,
                "message_history": [],
            }
        )
    except Exception as exc:
        greeting_status = MessageStatus.failed
        greeting_error = str(exc)[:2000]
        greeting_result = {"final_answer": get_timeout_message(hint_to_language(None))}

    async with pool.acquire() as conn:
        await conn.execute(
            f"""
            INSERT INTO {names["messages"]}
              (session_id, role, content, status, classified_language,
               llm_provider, llm_model, latency_ms, prompt_tokens,
               completion_tokens, safety_flag, hook_event, error)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """,
            session_id,
            MessageRole.assistant.value,
            greeting_result.get("final_answer", ""),
            greeting_status.value,
            greeting_result.get("language_hint"),
            greeting_result.get("llm_provider"),
            greeting_result.get("llm_model"),
            greeting_result.get("latency_ms"),
            greeting_result.get("prompt_tokens"),
            greeting_result.get("completion_tokens"),
            greeting_result.get("safety_flag"),
            greeting_result.get("hook_event"),
            greeting_error,
        )
        await conn.execute(
            f"UPDATE {names['sessions']} SET greeting_sent = true WHERE id = $1", session_id
        )
    return session_id


@router.get("/{session_id}/kundali")
async def get_kundali(session_id: uuid.UUID, pool: PoolDep) -> dict[str, Any]:
    """Return the stored chart for a session (so the UI can render it)."""
    names = resolve_table_names()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT kundali_cache FROM {names['sessions']} WHERE id = $1", session_id
        )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown session")
    return row["kundali_cache"]


@router.post("/{session_id}/messages", status_code=status.HTTP_202_ACCEPTED)
async def send_message(
    session_id: uuid.UUID,
    body: MessageCreateBody,
    pool: PoolDep,
    stream: StreamDep,
) -> MessageCreateOut:
    names = resolve_table_names()

    async with pool.acquire() as conn:
        exists = await conn.fetchval(f"SELECT 1 FROM {names['sessions']} WHERE id = $1", session_id)
        if exists is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown session")

        async with conn.transaction():
            # created_at uses clock_timestamp() (real wall-clock, advances
            # WITHIN a transaction) rather than the default now() (transaction
            # start — identical for both rows). Otherwise the user row and its
            # assistant placeholder share a timestamp and the (created_at, id)
            # ordering falls to random UUIDs, so the pending reply can render
            # ABOVE the user's message.
            await conn.execute(
                f"""
                INSERT INTO {names["messages"]} (session_id, role, content, status, created_at)
                VALUES ($1, $2, $3, $4, clock_timestamp())
                """,
                session_id,
                MessageRole.user.value,
                body.content,
                MessageStatus.complete.value,
            )
            assistant_row = await conn.fetchrow(
                f"""
                INSERT INTO {names["messages"]} (session_id, role, content, status, created_at)
                VALUES ($1, $2, $3, $4, clock_timestamp())
                RETURNING id
                """,
                session_id,
                MessageRole.assistant.value,
                "",
                MessageStatus.pending.value,
            )
            assistant_message_id = assistant_row["id"]

    await stream.enqueue(message_id=str(assistant_message_id), session_id=str(session_id))

    return MessageCreateOut(message_id=assistant_message_id)


@router.get("/{session_id}/messages")
async def poll_messages(
    session_id: uuid.UUID,
    pool: PoolDep,
    after: uuid.UUID | None = None,
    limit: int = 50,
) -> MessagesOut:
    names = resolve_table_names()
    limit = max(1, min(limit, 200))

    async with pool.acquire() as conn:
        if after is not None:
            cursor = await conn.fetchrow(
                f"SELECT created_at FROM {names['messages']} WHERE id = $1", after
            )
            if cursor is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unknown cursor")
            rows = await conn.fetch(
                f"""
                SELECT id, role, content, status, safety_flag, hook_event,
                       prompt_tokens, completion_tokens, created_at
                FROM {names["messages"]}
                WHERE session_id = $1 AND (created_at, id) > ($2, $3)
                ORDER BY created_at ASC, id ASC
                LIMIT $4
                """,
                session_id,
                cursor["created_at"],
                after,
                limit,
            )
        else:
            rows = await conn.fetch(
                f"""
                SELECT id, role, content, status, safety_flag, hook_event,
                       prompt_tokens, completion_tokens, created_at
                FROM {names["messages"]}
                WHERE session_id = $1
                ORDER BY created_at ASC, id ASC
                LIMIT $2
                """,
                session_id,
                limit,
            )

    return MessagesOut(messages=[MessageOut(**dict(row)) for row in rows])
