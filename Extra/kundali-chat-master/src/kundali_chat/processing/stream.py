"""Redis Streams producer/consumer-group wrapper for turn processing.

No Kafka: this service's stack is Redis + Postgres + LLM only. A Redis
Stream with a consumer group gives Kafka-like guarantees — durable, survives
pod restarts, redelivery via ``XAUTOCLAIM`` if a worker crashes mid-turn,
multiple pods share one group — without a second infra dependency, new
topics, or event-schema-guardian review.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

if TYPE_CHECKING:
    from redis.asyncio import Redis

StreamEntry = tuple[str, dict[str, str]]


class TurnStream:
    """One instance per process, shared by producer (API routes) and every
    consumer worker coroutine."""

    def __init__(self, *, redis: Redis, stream_key: str, consumer_group: str) -> None:
        self._redis = redis
        self._stream_key = stream_key
        self._consumer_group = consumer_group

    async def ensure_group(self) -> None:
        """Idempotent — safe to call from every pod's startup."""
        try:
            await self._redis.xgroup_create(
                self._stream_key, self._consumer_group, id="0", mkstream=True
            )
        except Exception as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def enqueue(self, *, message_id: str, session_id: str, greeting: bool = False) -> str:
        fields = {"message_id": message_id, "session_id": session_id}
        if greeting:
            # Marks a first-turn greeting turn (no user question to answer) so
            # the worker generates the greeting instead of loading a question.
            fields["greeting"] = "1"
        entry_id = await self._redis.xadd(self._stream_key, fields)  # type: ignore[arg-type]
        return str(entry_id)

    async def read(self, *, consumer_name: str, count: int, block_ms: int) -> list[StreamEntry]:
        """Read up to ``count`` new entries, blocking up to ``block_ms``."""
        response = await self._redis.xreadgroup(
            self._consumer_group,
            consumer_name,
            {self._stream_key: ">"},
            count=count,
            block=block_ms,
        )
        # redis-py's stubs type a stream's entries too loosely (Any | int |
        # str) to satisfy list.extend()'s Iterable bound — the actual
        # runtime shape from a successful XREADGROUP is a list of
        # (id, fields) tuples per stream.
        entries: list[StreamEntry] = []
        for _stream_name, stream_entries in response or []:
            entries.extend(cast("list[StreamEntry]", stream_entries))
        return entries

    async def ack(self, entry_id: str) -> None:
        await self._redis.xack(self._stream_key, self._consumer_group, entry_id)

    async def autoclaim_stuck(
        self, *, consumer_name: str, min_idle_ms: int, count: int = 50
    ) -> list[StreamEntry]:
        """Claim entries idle past ``min_idle_ms`` in another consumer's PEL.
        The caller (the reaper) decides what to do with them — this wrapper
        never reprocesses, only surfaces."""
        _next_cursor, claimed, _deleted = await self._redis.xautoclaim(
            self._stream_key,
            self._consumer_group,
            consumer_name,
            min_idle_time=min_idle_ms,
            start_id="0",
            count=count,
        )
        return claimed
