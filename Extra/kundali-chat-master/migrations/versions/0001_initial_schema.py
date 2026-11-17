"""initial_schema — kundali_sessions + kundali_messages.

Revision ID: 0001_initial_schema
Revises: None
Create Date: 2026-07-08 00:00:00.000000

Creates the two tables backing the Kundali chat, plus their supporting
Postgres ENUM types. Table names are resolved via
``kundali_chat.models.tables.resolve_table_names()`` (env-configurable),
never spelled as literals — see that module's docstring for why.

Note: this is the FIRST migration for this service, so each enum type is
created automatically by ``op.create_table()`` alongside its column
(default ``create_type=True``) rather than pre-created via raw SQL — the
``create_type=False`` + manual-``CREATE TYPE`` two-step (used elsewhere in
this repo's ai-core service) only earns its keep when a LATER migration
reuses a type an EARLIER one already created. There's no such history here.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from kundali_chat.models.tables import resolve_table_names

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_NAMES = resolve_table_names()


def upgrade() -> None:
    op.create_table(
        _NAMES["sessions"],
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("kundali_session_ref", sa.String(128), nullable=False),
        sa.Column("anon_user_id", PGUUID(as_uuid=True), nullable=True),
        sa.Column("kundali_cache", JSONB, nullable=False),
        sa.Column(
            "kundali_fetch_status",
            sa.Enum("pending", "ok", "error", name="kundali_fetch_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("greeting_sent", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("message_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "state",
            sa.Enum("active", "ended", name="kundali_session_state"),
            nullable=False,
            server_default="active",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        f"ix_{_NAMES['sessions']}_kundali_session_ref", _NAMES["sessions"], ["kundali_session_ref"]
    )
    op.create_index(
        "ix_kundali_sessions_anon_last_id",
        _NAMES["sessions"],
        ["anon_user_id", "last_activity_at", "id"],
    )

    op.create_table(
        _NAMES["messages"],
        sa.Column(
            "id",
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "session_id",
            PGUUID(as_uuid=True),
            sa.ForeignKey(f"{_NAMES['sessions']}.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.Enum("user", "assistant", name="kundali_message_role"),
            nullable=False,
        ),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "complete", "failed", name="kundali_message_status"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("classified_language", sa.String(16), nullable=True),
        sa.Column("llm_provider", sa.String(32), nullable=True),
        sa.Column("llm_model", sa.String(64), nullable=True),
        sa.Column("latency_ms", sa.Integer, nullable=True),
        sa.Column("prompt_tokens", sa.Integer, nullable=True),
        sa.Column("completion_tokens", sa.Integer, nullable=True),
        sa.Column("cost_paise", sa.Numeric(10, 4), nullable=True),
        sa.Column("safety_flag", sa.String(32), nullable=True),
        sa.Column("hook_event", JSONB, nullable=True),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(f"ix_{_NAMES['messages']}_session_id", _NAMES["messages"], ["session_id"])
    op.create_index(
        "ix_kundali_messages_session_created_id",
        _NAMES["messages"],
        ["session_id", "created_at", "id"],
    )


def downgrade() -> None:
    # Dropping each table also drops its columns' enum types (default
    # create_type=True is symmetric on create/drop) — no separate DROP TYPE
    # needed, and doing so would double-drop and error.
    op.drop_table(_NAMES["messages"])
    op.drop_table(_NAMES["sessions"])
