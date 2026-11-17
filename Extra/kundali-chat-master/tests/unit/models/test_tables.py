"""Regression test for the table-name-configurability mechanism.

The prior production bug this design targets: a table name hardcoded in one
place drifted from the literal used elsewhere. ``resolve_table_names()`` is
the single source of truth — this test proves overriding the env actually
changes what it returns, that it's cached (stable) within a process, and
that resolving a table name never requires Postgres/Redis to be configured
(models must be importable on their own).
"""

from __future__ import annotations

import pytest

# Imported at module (collection) time, before any test's monkeypatch runs,
# so the ORM classes bind __tablename__ under clean/default env exactly
# once — deterministic regardless of pytest-randomly's test order. If this
# import were deferred into a test function body, whichever test happened
# to run first (and might have TABLES__* overridden via monkeypatch) would
# permanently decide the bound name for the rest of the process.
from kundali_chat.models.tables import KundaliMessage, KundaliSession


@pytest.fixture(autouse=True)
def _clear_cache():
    """``resolve_table_names()`` is a process-wide lru_cache by design
    (mirrors the production ``get_settings()`` singleton pattern). Tests
    that flip env vars must clear it before AND after, or the cached value
    leaks into sibling tests — pytest-randomly surfaces that immediately."""
    from kundali_chat.models import tables

    tables.resolve_table_names.cache_clear()
    yield
    tables.resolve_table_names.cache_clear()


def test_resolve_table_names_defaults():
    from kundali_chat.models import tables

    names = tables.resolve_table_names()

    assert names == {"sessions": "kundali_sessions", "messages": "kundali_messages"}


def test_resolve_table_names_respects_env_override(monkeypatch: pytest.MonkeyPatch):
    from kundali_chat.models import tables

    monkeypatch.setenv("TABLES__SESSIONS", "custom_sessions")
    monkeypatch.setenv("TABLES__MESSAGES", "custom_messages")
    tables.resolve_table_names.cache_clear()

    names = tables.resolve_table_names()

    assert names == {"sessions": "custom_sessions", "messages": "custom_messages"}


def test_resolve_table_names_is_cached(monkeypatch: pytest.MonkeyPatch):
    from kundali_chat.models import tables

    first = tables.resolve_table_names()
    monkeypatch.setenv("TABLES__SESSIONS", "should_not_take_effect")
    second = tables.resolve_table_names()

    assert first is second


def test_resolve_table_names_does_not_require_postgres_or_redis_env(
    monkeypatch: pytest.MonkeyPatch,
):
    """Importing/using the models module must not force the full Settings
    tree (Postgres/Redis) to validate — table names are a standalone concern."""
    monkeypatch.delenv("POSTGRES__DSN", raising=False)
    monkeypatch.delenv("REDIS__URL", raising=False)

    from kundali_chat.models import tables

    tables.resolve_table_names.cache_clear()

    names = tables.resolve_table_names()

    assert names == {"sessions": "kundali_sessions", "messages": "kundali_messages"}


def test_orm_model_tablenames_match_resolver():
    """The ORM classes must use the exact same names the resolver returns —
    this is what makes "two literals disagreeing" structurally impossible.

    ``KundaliSession``/``KundaliMessage`` are imported at module (collection)
    level in this file specifically so their ``__tablename__`` is bound
    under clean/default env — see the comment on that import."""
    assert KundaliSession.__tablename__ == "kundali_sessions"
    assert KundaliMessage.__tablename__ == "kundali_messages"
