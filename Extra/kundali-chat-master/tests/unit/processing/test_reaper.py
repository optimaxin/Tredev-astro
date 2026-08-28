"""Reaper against fake pool + fake stream — never re-runs the LLM, only
resolves genuinely-stuck pending rows and ACKs everything it claims."""

from __future__ import annotations

import asyncio

import pytest

from kundali_chat.models.enums import MessageStatus
from kundali_chat.processing.reaper import reap_stuck_entries, run_reaper_loop


class _FakeConnection:
    def __init__(self, *, rows: dict[str, dict]):
        self.rows = rows
        self.executed: list[tuple] = []

    async def fetchrow(self, query, *args):
        message_id = args[0]
        return self.rows.get(message_id)

    async def execute(self, query, *args):
        self.executed.append((query, args))


class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class _FakePool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        return _AcquireCtx(self._conn)


class _FakeStream:
    def __init__(self, claimed):
        self._claimed = claimed
        self.acked: list[str] = []

    async def autoclaim_stuck(self, *, consumer_name, min_idle_ms, count=50):
        return self._claimed

    async def ack(self, entry_id):
        self.acked.append(entry_id)


@pytest.mark.asyncio
async def test_resolves_still_pending_message_and_acks():
    conn = _FakeConnection(
        rows={"m1": {"status": MessageStatus.pending.value, "classified_language": "latin_script"}}
    )
    pool = _FakePool(conn)
    stream = _FakeStream(claimed=[("1-0", {"message_id": "m1"})])

    resolved = await reap_stuck_entries(pool=pool, stream=stream, min_idle_ms=45_000)

    assert resolved == 1
    assert stream.acked == ["1-0"]
    _update_query, update_args = conn.executed[0]
    assert MessageStatus.failed.value in update_args


@pytest.mark.asyncio
async def test_does_not_touch_message_already_resolved_by_its_worker():
    conn = _FakeConnection(
        rows={"m1": {"status": MessageStatus.complete.value, "classified_language": None}}
    )
    pool = _FakePool(conn)
    stream = _FakeStream(claimed=[("1-0", {"message_id": "m1"})])

    resolved = await reap_stuck_entries(pool=pool, stream=stream, min_idle_ms=45_000)

    assert resolved == 0
    assert conn.executed == []
    assert stream.acked == ["1-0"]  # still acked so the entry leaves the PEL


@pytest.mark.asyncio
async def test_message_row_vanished_still_acks_without_update():
    conn = _FakeConnection(rows={})
    pool = _FakePool(conn)
    stream = _FakeStream(claimed=[("1-0", {"message_id": "gone"})])

    resolved = await reap_stuck_entries(pool=pool, stream=stream, min_idle_ms=45_000)

    assert resolved == 0
    assert conn.executed == []
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_entry_missing_message_id_field_is_acked_and_skipped():
    conn = _FakeConnection(rows={})
    pool = _FakePool(conn)
    stream = _FakeStream(claimed=[("1-0", {"session_id": "s1"})])  # no message_id field

    resolved = await reap_stuck_entries(pool=pool, stream=stream, min_idle_ms=45_000)

    assert resolved == 0
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_loop_runs_at_least_once_then_stops_on_event():
    conn = _FakeConnection(rows={})
    pool = _FakePool(conn)
    stream = _FakeStream(claimed=[])
    stop_event = asyncio.Event()

    async def _stop_after_one_pass():
        await asyncio.sleep(0.01)
        stop_event.set()

    await asyncio.gather(
        run_reaper_loop(
            pool=pool, stream=stream, min_idle_ms=1000, interval_s=1, stop_event=stop_event
        ),
        _stop_after_one_pass(),
    )

    assert stop_event.is_set()


@pytest.mark.asyncio
async def test_loop_survives_a_failing_pass():
    class _BoomStream:
        async def autoclaim_stuck(self, **kwargs):
            raise RuntimeError("redis down")

    stop_event = asyncio.Event()

    async def _stop_after_one_pass():
        await asyncio.sleep(0.01)
        stop_event.set()

    # Must not raise despite autoclaim_stuck blowing up every pass.
    await asyncio.gather(
        run_reaper_loop(
            pool=None, stream=_BoomStream(), min_idle_ms=1000, interval_s=1, stop_event=stop_event
        ),
        _stop_after_one_pass(),
    )
