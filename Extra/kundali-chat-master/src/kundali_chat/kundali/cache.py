"""Redis cache-aside wrapper around any :class:`KundaliApiClient`.

Mirrors ai-core's ``tools/cache.py`` (``CachedKundliClient``) pattern: key by
a stable identifier, TTL-bound, JSON-serialised. Depends only on the
Protocol, so it needs zero changes when the placeholder client is swapped
for the real one.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import TYPE_CHECKING

from kundali_chat.kundali.client import birth_cache_ref
from kundali_chat.shared.logging import get_logger

if TYPE_CHECKING:
    from redis.asyncio import Redis

    from kundali_chat.kundali.client import BirthDetails, KundaliApiClient, KundaliChartData

_log = get_logger("kundali_chat.kundali.cache")


def kundali_key(cache_ref: str) -> str:
    return f"kundali_chat:kundali:{cache_ref}"


class CachedKundaliClient:
    """Wraps a :class:`KundaliApiClient` with Redis cache-aside semantics,
    keyed by a stable hash of the birth details (same birth data -> one cache
    entry, so a repeat signup skips the engine call)."""

    def __init__(self, *, client: KundaliApiClient, redis: Redis, ttl_s: int) -> None:
        self._client = client
        self._redis = redis
        self._ttl_s = ttl_s

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData:
        key = kundali_key(birth_cache_ref(birth))
        cached = await self._read(key)
        if cached is not None:
            return cached  # type: ignore[return-value]
        value = await self._client.fetch_kundali(birth)
        await self._write(key, value)
        return value

    async def _read(self, key: str) -> dict | None:
        raw = await self._redis.get(key)
        if raw is None:
            return None
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except (ValueError, TypeError) as exc:
            _log.warning("corrupt kundali cache entry; refreshing", key=key, error=str(exc))
        return None

    async def _write(self, key: str, value: Mapping[str, object]) -> None:
        await self._redis.set(key, json.dumps(value), ex=self._ttl_s)
