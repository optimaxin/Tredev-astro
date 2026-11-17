"""``kundali_sessions`` / ``kundali_messages`` — the two tables backing the
Kundali chat.

Table-name configurability: the prior production bug this service must not
repeat was a table name hardcoded in one place (e.g. a raw SQL query) that
silently drifted from the literal used elsewhere (an ORM model, a migration).
The fix is not "read an env var somewhere" — it is making it structurally
impossible for two literals to disagree, by routing every consumer through
one cached resolver function. **No file in this codebase may spell
"kundali_sessions" or "kundali_messages" as a string literal** — always call
:func:`resolve_table_names`. That includes Alembic's ``env.py``, any raw SQL
in ``processing/turn_runner.py``, and health checks.

Changing ``TABLES__SESSIONS`` / ``TABLES__MESSAGES`` after migrations have
run is a deploy-time decision requiring a rename migration or a fresh
database — not a request-time knob.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from functools import lru_cache
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import Enum, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from kundali_chat.models.base import Base, created_at_col, updated_at_col, uuid_pk
from kundali_chat.models.enums import KundaliFetchStatus, MessageRole, MessageStatus, SessionState


class _TableNameEnv(BaseSettings):
    """Reads only ``TABLES__SESSIONS`` / ``TABLES__MESSAGES``. Deliberately
    NOT part of the main ``Settings`` tree (``config.py``) — resolving a
    table name must never require Postgres/Redis to be configured, since
    importing this module (e.g. from a script, a test, or Alembic) shouldn't
    force the whole settings tree to validate."""

    model_config = SettingsConfigDict(env_prefix="TABLES__", case_sensitive=False, extra="ignore")

    sessions: str = "kundali_sessions"
    messages: str = "kundali_messages"


@lru_cache(maxsize=1)
def resolve_table_names() -> dict[str, str]:
    """The single source of truth for this service's table names, read from
    env once and cached. Every consumer of a table name literal — ORM model
    class bodies, Alembic, raw SQL — must call this instead of typing the
    string again."""
    env = _TableNameEnv()
    return {"sessions": env.sessions, "messages": env.messages}


_NAMES = resolve_table_names()


class KundaliSession(Base):
    """One chat session opened after a free-kundali generation. Anonymous —
    no FK to a ``users`` table, mirroring ai-core's ``playground_sessions``
    isolation (these are public end users, not staff, and this data must
    never be swept up by an unrelated erasure cascade)."""

    __tablename__ = _NAMES["sessions"]
    __table_args__ = (
        Index(
            "ix_kundali_sessions_anon_last_id",
            "anon_user_id",
            "last_activity_at",
            "id",
        ),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    kundali_session_ref: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    # Value of the X-User-Id-style anonymous header. No FK — see module docstring.
    anon_user_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True))

    kundali_cache: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    kundali_fetch_status: Mapped[KundaliFetchStatus] = mapped_column(
        Enum(KundaliFetchStatus, name="kundali_fetch_status"),
        nullable=False,
        default=KundaliFetchStatus.pending,
        server_default="'pending'::kundali_fetch_status",
    )

    greeting_sent: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )

    # Counted from day one; no cap enforced in v1. Wired so a future cap
    # check is a one-line addition, not a restructuring.
    message_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )

    state: Mapped[SessionState] = mapped_column(
        Enum(SessionState, name="kundali_session_state"),
        nullable=False,
        default=SessionState.active,
        server_default="'active'::kundali_session_state",
    )

    created_at: Mapped[datetime] = created_at_col()
    last_activity_at: Mapped[datetime] = updated_at_col()


class KundaliMessage(Base):
    """One row per chat turn-message. FK to ``KundaliSession`` is fine here —
    it is intra-service, not a cross-reference to ``users``."""

    __tablename__ = _NAMES["messages"]
    __table_args__ = (
        Index("ix_kundali_messages_session_created_id", "session_id", "created_at", "id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    session_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey(f"{_NAMES['sessions']}.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole, name="kundali_message_role"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Processing is async (Redis Streams) — the poll endpoint reads this.
    status: Mapped[MessageStatus] = mapped_column(
        Enum(MessageStatus, name="kundali_message_status"),
        nullable=False,
        default=MessageStatus.pending,
        server_default="'pending'::kundali_message_status",
    )

    classified_language: Mapped[str | None] = mapped_column(String(16))
    llm_provider: Mapped[str | None] = mapped_column(String(32))
    llm_model: Mapped[str | None] = mapped_column(String(64))
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    cost_paise: Mapped[float | None] = mapped_column(Numeric(10, 4))

    # Which safety rule fired, if any (null = clean).
    safety_flag: Mapped[str | None] = mapped_column(String(32))
    # Which remedy/product hook was surfaced this turn, for conversion analytics.
    hook_event: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = created_at_col()
