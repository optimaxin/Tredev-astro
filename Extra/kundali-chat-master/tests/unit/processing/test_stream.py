"""TurnStream against a fake redis client — verifies the exact Redis
Streams call shapes (group name, consumer name, ack args) without a real
Redis server."""

from __future__ import annotations

import pytest

from kundali_chat.processing.stream import TurnStream


class _FakeRedis:
    def __init__(self) -> None:
        self.xgroup_create_calls: list[tuple] = []
        self.xadd_calls: list[tuple] = []
        self.xreadgroup_calls: list[tuple] = []
        self.xack_calls: list[tuple] = []
        self.xautoclaim_calls: list[tuple] = []
        self.read_response: list = []
        self.autoclaim_response: tuple = ("0", [], [])
        self._raise_busygroup = False

    async def xgroup_create(self, name, groupname, id="0", mkstream=False):
        self.xgroup_create_calls.append((name, groupname, id, mkstream))
        if self._raise_busygroup:
            raise Exception("BUSYGROUP Consumer Group name already exists")

    async def xadd(self, name, fields):
        self.xadd_calls.append((name, fields))
        return "1-0"

    async def xreadgroup(self, groupname, consumername, streams, count=None, block=None):
        self.xreadgroup_calls.append((groupname, consumername, streams, count, block))
        return self.read_response

    async def xack(self, name, groupname, *ids):
        self.xack_calls.append((name, groupname, ids))

    async def xautoclaim(
        self, name, groupname, consumername, min_idle_time, start_id="0", count=None
    ):
        self.xautoclaim_calls.append(
            (name, groupname, consumername, min_idle_time, start_id, count)
        )
        return self.autoclaim_response


@pytest.mark.asyncio
async def test_ensure_group_creates_with_mkstream():
    redis = _FakeRedis()
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    await stream.ensure_group()

    name, groupname, _id, mkstream = redis.xgroup_create_calls[0]
    assert name == "kundali_chat:turns"
    assert groupname == "workers"
    assert mkstream is True


@pytest.mark.asyncio
async def test_ensure_group_swallows_busygroup():
    redis = _FakeRedis()
    redis._raise_busygroup = True
    stream = TurnStream(redis=redis, stream_key="s", consumer_group="g")

    await stream.ensure_group()  # must not raise


@pytest.mark.asyncio
async def test_ensure_group_reraises_other_errors():
    redis = _FakeRedis()

    async def _boom(*args, **kwargs):
        raise Exception("connection refused")

    redis.xgroup_create = _boom
    stream = TurnStream(redis=redis, stream_key="s", consumer_group="g")

    with pytest.raises(Exception, match="connection refused"):
        await stream.ensure_group()


@pytest.mark.asyncio
async def test_enqueue_passes_message_and_session_id():
    redis = _FakeRedis()
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    await stream.enqueue(message_id="m1", session_id="s1")

    name, fields = redis.xadd_calls[0]
    assert name == "kundali_chat:turns"
    assert fields == {"message_id": "m1", "session_id": "s1"}


@pytest.mark.asyncio
async def test_enqueue_greeting_sets_flag():
    redis = _FakeRedis()
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    await stream.enqueue(message_id="m1", session_id="s1", greeting=True)

    _name, fields = redis.xadd_calls[0]
    assert fields == {"message_id": "m1", "session_id": "s1", "greeting": "1"}


@pytest.mark.asyncio
async def test_read_flattens_stream_response():
    redis = _FakeRedis()
    redis.read_response = [
        ("kundali_chat:turns", [("1-0", {"message_id": "m1"}), ("2-0", {"message_id": "m2"})])
    ]
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    entries = await stream.read(consumer_name="pod-1-worker-0", count=1, block_ms=5000)

    assert entries == [("1-0", {"message_id": "m1"}), ("2-0", {"message_id": "m2"})]
    groupname, consumername, streams, count, block = redis.xreadgroup_calls[0]
    assert groupname == "workers"
    assert consumername == "pod-1-worker-0"
    assert streams == {"kundali_chat:turns": ">"}
    assert count == 1
    assert block == 5000


@pytest.mark.asyncio
async def test_read_handles_empty_response():
    redis = _FakeRedis()
    redis.read_response = None
    stream = TurnStream(redis=redis, stream_key="s", consumer_group="g")

    entries = await stream.read(consumer_name="c", count=1, block_ms=1000)

    assert entries == []


@pytest.mark.asyncio
async def test_ack_passes_entry_id():
    redis = _FakeRedis()
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    await stream.ack("3-0")

    name, groupname, ids = redis.xack_calls[0]
    assert name == "kundali_chat:turns"
    assert groupname == "workers"
    assert ids == ("3-0",)


@pytest.mark.asyncio
async def test_autoclaim_stuck_returns_claimed_entries():
    redis = _FakeRedis()
    redis.autoclaim_response = ("0", [("4-0", {"message_id": "m4"})], [])
    stream = TurnStream(redis=redis, stream_key="kundali_chat:turns", consumer_group="workers")

    claimed = await stream.autoclaim_stuck(consumer_name="reaper", min_idle_ms=45_000)

    assert claimed == [("4-0", {"message_id": "m4"})]
    _name, _groupname, consumername, min_idle, _start_id, _count = redis.xautoclaim_calls[0]
    assert consumername == "reaper"
    assert min_idle == 45_000
