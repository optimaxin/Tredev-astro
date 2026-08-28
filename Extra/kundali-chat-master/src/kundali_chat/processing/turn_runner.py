"""Pops a Redis Stream entry, loads what the graph needs from Postgres, runs
the LangGraph turn, persists the result, and ACKs.

Table names are ALWAYS resolved via ``resolve_table_names()`` — never a
literal — per ``models/tables.py``'s module docstring.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from kundali_chat.graph.directives import GREETING_TRIGGER_MESSAGE
from kundali_chat.models.enums import MessageRole, MessageStatus
from kundali_chat.models.tables import resolve_table_names
from kundali_chat.safety.canned_responses import get_timeout_message, hint_to_language
from kundali_chat.shared.logging import get_logger

if TYPE_CHECKING:
    import asyncpg
    from langgraph.graph.state import CompiledStateGraph

    from kundali_chat.processing.stream import TurnStream

_log = get_logger("kundali_chat.processing.turn_runner")

_HISTORY_LIMIT = 20


async def process_entry(
    *,
    pool: asyncpg.Pool,
    graph: CompiledStateGraph,
    stream: TurnStream,
    entry_id: str,
    fields: dict[str, str],
) -> None:
    names = resolve_table_names()
    message_id = fields["message_id"]
    session_id = fields["session_id"]
    is_greeting = fields.get("greeting") == "1"

    if is_greeting:
        # First-turn greeting: no user question, empty history.
        kundali = await _load_kundali(pool, names, session_id=session_id)
        if kundali is None:
            await stream.ack(entry_id)
            return
        user_message, history = GREETING_TRIGGER_MESSAGE, []
    else:
        loaded = await _load_turn_inputs(pool, names, session_id=session_id, message_id=message_id)
        if loaded is None:
            # Session or message vanished (e.g. cleaned up) — nothing to process.
            await stream.ack(entry_id)
            return
        kundali, user_message, history = loaded

    try:
        result: dict[str, Any] = await graph.ainvoke(
            {
                "session_id": session_id,
                "user_message": user_message,
                "kundali": kundali,
                "message_history": history,
            }
        )
    except Exception as exc:
        _log.error("turn_runner: graph invocation failed", message_id=message_id, error=str(exc))
        await _mark_failed(pool, names, message_id=message_id, error=str(exc))
        await stream.ack(entry_id)
        return

    await _mark_complete(
        pool,
        names,
        session_id=session_id,
        message_id=message_id,
        result=result,
        is_greeting=is_greeting,
    )
    await stream.ack(entry_id)


async def _load_kundali(
    pool: asyncpg.Pool, names: dict[str, str], *, session_id: str
) -> dict | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT kundali_cache FROM {names['sessions']} WHERE id = $1", session_id
        )
    if row is None:
        _log.warning("turn_runner: session missing for greeting", session_id=session_id)
        return None
    return row["kundali_cache"]


async def _load_turn_inputs(
    pool: asyncpg.Pool, names: dict[str, str], *, session_id: str, message_id: str
) -> tuple[dict, str, list[dict[str, str]]] | None:
    async with pool.acquire() as conn:
        session_row = await conn.fetchrow(
            f"SELECT kundali_cache FROM {names['sessions']} WHERE id = $1", session_id
        )
        if session_row is None:
            _log.warning("turn_runner: session missing", session_id=session_id)
            return None

        # ``message_id`` is the assistant PLACEHOLDER row (still empty/pending) —
        # it only confirms the turn exists. The actual question to answer is the
        # latest USER message in this session (loading the placeholder's own
        # content here was a bug: it's "", so language detection saw no text).
        placeholder = await conn.fetchrow(
            f"SELECT 1 FROM {names['messages']} WHERE id = $1", message_id
        )
        if placeholder is None:
            _log.warning("turn_runner: message missing", message_id=message_id)
            return None

        user_row = await conn.fetchrow(
            f"""
            SELECT id, content FROM {names["messages"]}
            WHERE session_id = $1 AND role = $2
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            """,
            session_id,
            MessageRole.user.value,
        )
        if user_row is None:
            _log.warning("turn_runner: no user message for turn", session_id=session_id)
            return None

        # History = prior complete turns, excluding this turn's placeholder AND
        # the current question (which is passed separately as user_message).
        history_rows = await conn.fetch(
            f"""
            SELECT role, content FROM {names["messages"]}
            WHERE session_id = $1 AND status = $2 AND id != $3 AND id != $4
            ORDER BY created_at DESC
            LIMIT {_HISTORY_LIMIT}
            """,
            session_id,
            MessageStatus.complete.value,
            message_id,
            user_row["id"],
        )

    history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]
    return session_row["kundali_cache"], user_row["content"], history


async def _mark_complete(
    pool: asyncpg.Pool,
    names: dict[str, str],
    *,
    session_id: str,
    message_id: str,
    result: dict[str, Any],
    is_greeting: bool = False,
) -> None:
    async with pool.acquire() as conn, conn.transaction():
        await conn.execute(
            f"""
                UPDATE {names["messages"]}
                SET status = $2, content = $3, classified_language = $4,
                    llm_provider = $5, llm_model = $6, latency_ms = $7,
                    prompt_tokens = $8, completion_tokens = $9,
                    safety_flag = $10, hook_event = $11
                WHERE id = $1
                """,
            message_id,
            MessageStatus.complete.value,
            result.get("final_answer", ""),
            result.get("language_hint"),
            result.get("llm_provider"),
            result.get("llm_model"),
            result.get("latency_ms"),
            result.get("prompt_tokens"),
            result.get("completion_tokens"),
            result.get("safety_flag"),
            result.get("hook_event"),
        )
        if is_greeting:
            # The greeting isn't a user turn — don't count it, just mark sent.
            await conn.execute(
                f"UPDATE {names['sessions']} SET greeting_sent = true, last_activity_at = now() "
                "WHERE id = $1",
                session_id,
            )
        else:
            await conn.execute(
                f"""
                    UPDATE {names["sessions"]}
                    SET message_count = message_count + 1, last_activity_at = now()
                    WHERE id = $1
                    """,
                session_id,
            )


async def _mark_failed(
    pool: asyncpg.Pool, names: dict[str, str], *, message_id: str, error: str
) -> None:
    async with pool.acquire() as conn:
        timeout_text = get_timeout_message(hint_to_language(None))
        await conn.execute(
            f"UPDATE {names['messages']} SET status = $2, content = $3, error = $4 WHERE id = $1",
            message_id,
            MessageStatus.failed.value,
            timeout_text,
            error[:2000],
        )
