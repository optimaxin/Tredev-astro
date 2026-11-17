"""Cache-aside behavior for CachedKundaliClient — no real Redis, no real client."""

from __future__ import annotations

import json

import pytest

from kundali_chat.kundali.cache import CachedKundaliClient, kundali_key
from kundali_chat.kundali.client import BirthDetails, KundaliChartData, birth_cache_ref


def _birth(name: str = "Dev") -> BirthDetails:
    return {
        "name": name,
        "gender": "male",
        "year": 1999,
        "month": 8,
        "day": 1,
        "hour": 12,
        "minute": 5,
        "second": 0,
        "latitude": 26.4619,
        "longitude": 79.4927,
        "place": "Kanpur",
    }


class _FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.set_calls: list[tuple[str, str, int | None]] = []

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value
        self.set_calls.append((key, value, ex))


class _FakeKundaliClient:
    def __init__(self, payload: KundaliChartData) -> None:
        self.payload = payload
        self.call_count = 0

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData:
        self.call_count += 1
        return self.payload


def _payload(session_ref: str = "abc123") -> KundaliChartData:
    return {
        "session_ref": session_ref,
        "basic_details": {},
        "panchang": {},
        "lagna_chart": {"ascendant_sign": "Aries", "planets": []},
        "moon_chart": {"ascendant_sign": "Taurus", "planets": []},
        "shodashvarga": {},
        "dasha": {
            "mahadasha": {"lord": "Venus", "start_date": "2020-01-01", "end_date": "2040-01-01"},
            "antardasha": {"lord": "Sun", "start_date": "2026-01-01", "end_date": "2026-07-01"},
        },
        "yogas": [],
    }


@pytest.mark.asyncio
async def test_cache_miss_fetches_and_writes_with_ttl():
    redis = _FakeRedis()
    upstream = _FakeKundaliClient(_payload())
    cached = CachedKundaliClient(client=upstream, redis=redis, ttl_s=3600)
    birth = _birth()

    result = await cached.fetch_kundali(birth)

    assert result == upstream.payload
    assert upstream.call_count == 1
    key, value, ex = redis.set_calls[0]
    assert key == kundali_key(birth_cache_ref(birth))
    assert json.loads(value) == upstream.payload
    assert ex == 3600


@pytest.mark.asyncio
async def test_cache_hit_skips_upstream_fetch():
    redis = _FakeRedis()
    payload = _payload()
    birth = _birth()
    redis.store[kundali_key(birth_cache_ref(birth))] = json.dumps(payload)
    upstream = _FakeKundaliClient(payload)
    cached = CachedKundaliClient(client=upstream, redis=redis, ttl_s=3600)

    result = await cached.fetch_kundali(birth)

    assert result == payload
    assert upstream.call_count == 0


@pytest.mark.asyncio
async def test_corrupt_cache_entry_falls_through_to_upstream():
    redis = _FakeRedis()
    birth = _birth()
    redis.store[kundali_key(birth_cache_ref(birth))] = "not valid json{{"
    upstream = _FakeKundaliClient(_payload())
    cached = CachedKundaliClient(client=upstream, redis=redis, ttl_s=3600)

    result = await cached.fetch_kundali(birth)

    assert result == upstream.payload
    assert upstream.call_count == 1


@pytest.mark.asyncio
async def test_different_birth_details_use_different_keys():
    redis = _FakeRedis()
    upstream = _FakeKundaliClient(_payload())
    cached = CachedKundaliClient(client=upstream, redis=redis, ttl_s=3600)

    await cached.fetch_kundali(_birth("Alice"))
    await cached.fetch_kundali(_birth("Bob"))

    assert upstream.call_count == 2
    assert kundali_key(birth_cache_ref(_birth("Alice"))) in redis.store
    assert kundali_key(birth_cache_ref(_birth("Bob"))) in redis.store
