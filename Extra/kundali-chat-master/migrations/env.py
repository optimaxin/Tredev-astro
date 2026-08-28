"""Alembic environment.

Async via asyncpg. Target metadata is ``kundali_chat.models.Base.metadata``,
so importing ``kundali_chat.models`` is enough to populate the migration
target. Table names come from ``resolve_table_names()`` (via the model
classes), never spelled as literals here — see ``models/tables.py``.

``VERSION_TABLE`` is a distinct name (not Alembic's default
``alembic_version``) — cheap insurance if this database is ever shared with
another service's own Alembic history (discovered the hard way once,
migrating against a shared Postgres instance/database: the default name
collided with the other service's migration history table and every
``alembic upgrade`` failed trying to resolve its revision ids).
"""

from __future__ import annotations

import asyncio

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from kundali_chat.config import get_settings
from kundali_chat.models import Base

config = context.config

# Inject the DSN from Settings rather than alembic.ini.
settings = get_settings()
# asyncpg driver requires "postgresql+asyncpg://" prefix; tolerate either form.
dsn = settings.postgres.dsn
if dsn.startswith("postgresql://"):
    dsn = "postgresql+asyncpg://" + dsn[len("postgresql://") :]
config.set_main_option("sqlalchemy.url", dsn)

target_metadata = Base.metadata
VERSION_TABLE = "kundali_chat_alembic_version"


def run_migrations_offline() -> None:
    """Generate SQL without a live connection (``alembic upgrade --sql``)."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        version_table=VERSION_TABLE,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        version_table=VERSION_TABLE,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
