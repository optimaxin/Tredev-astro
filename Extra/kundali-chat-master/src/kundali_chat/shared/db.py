"""asyncpg connection pool factory.

Mirrors ``ai_core.shared.db`` — a JSONB codec is registered on every
connection so reads decode to ``dict`` instead of ``str``. ``kundali_cache``
and ``hook_event`` are both JSONB columns that depend on this.
"""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import asyncpg

if TYPE_CHECKING:
    from kundali_chat.config import PostgresSettings


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Per-connection setup: install JSONB codec so reads decode to Python dicts."""
    await conn.set_type_codec(
        "jsonb",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )
    await conn.set_type_codec(
        "json",
        encoder=json.dumps,
        decoder=json.loads,
        schema="pg_catalog",
        format="text",
    )


async def create_pool(settings: PostgresSettings) -> asyncpg.Pool:
    """Create and initialise an asyncpg connection pool."""
    return await asyncpg.create_pool(
        dsn=settings.dsn,
        min_size=settings.pool_min,
        max_size=settings.pool_max,
        server_settings={
            "statement_timeout": str(settings.statement_timeout_ms),
            "application_name": "kundali-chat",
        },
        command_timeout=settings.statement_timeout_ms / 1000,
        init=_init_connection,
    )


async def close_pool(pool: asyncpg.Pool) -> None:
    """Gracefully close an asyncpg pool — drains in-flight queries first."""
    await pool.close()
