"""Redis async client factory.

One client per process, shared by the kundali cache (``kundali/cache.py``)
and the Redis Streams processing layer (``processing/stream.py``).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import redis.asyncio as redis

if TYPE_CHECKING:
    from kundali_chat.config import RedisSettings


def create_client(settings: RedisSettings) -> redis.Redis:
    """Create an async Redis client. Caller is responsible for ``.aclose()`` on shutdown.

    ``socket_timeout`` is set explicitly (not left at the redis-py default of
    ``None``) — see ``RedisSettings.socket_timeout_s``'s docstring for why
    blocking Redis Streams reads need this.
    """
    return redis.Redis.from_url(
        str(settings.url),
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=settings.socket_timeout_s,
    )


async def close_client(client: redis.Redis) -> None:
    await client.aclose()
