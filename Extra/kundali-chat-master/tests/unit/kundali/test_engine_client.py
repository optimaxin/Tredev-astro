"""EngineKundaliClient against a mocked HTTP transport — no real network.

Covers the adapter (pure) and the client's fetch orchestration incl. lazy
token minting and the ``Authorization: Bearer`` header."""

from __future__ import annotations

import httpx
import pytest

from kundali_chat.kundali.client import BirthDetails
from kundali_chat.kundali.engine_client import (
    EngineKundaliClient,
    KundaliEngineError,
    adapt_engine_response,
)

_RealAsyncClient = httpx.AsyncClient


def _client_factory(handler):
    def _make(*args, **kwargs):
        kwargs.pop("transport", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return _make


def _birth() -> BirthDetails:
    return {
        "name": "Dev",
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


_D1 = {
    "lagna": {"rashi": "Libra", "rashiIndex": 7},
    "planetInfo": [
        {"planet": "As", "rashi": "Libra", "rashiIndex": 7, "degree": 9.6, "nakshatra": "Swati",
         "pada": 1, "isretrograde": False, "iscombust": False},
        {"planet": "Su", "rashi": "Cancer", "rashiIndex": 4, "degree": 14.7, "nakshatra": "Pushya",
         "pada": 4, "isretrograde": False, "iscombust": False},
        {"planet": "Mo", "rashi": "Pisces", "rashiIndex": 12, "degree": 0.4,
         "nakshatra": "Purva Bhadrapada", "pada": 4, "isretrograde": False, "iscombust": False},
        {"planet": "Ur", "rashi": "Capricorn", "rashiIndex": 10, "degree": 1.0, "nakshatra": "x",
         "pada": 1, "isretrograde": True, "iscombust": False},  # outer planet -> dropped
    ],
}
_DASHA = {
    "result": {
        "currentDasha": {
            "mahaDasha": {"planet": "Mercury", "startDate": "2022-01-29T00:00:00Z",
                          "endDate": "2039-01-29T00:00:00Z"},
            "antarDasha": {"planet": "Venus", "startDate": "2025-06-24T00:00:00Z",
                           "endDate": "2028-04-24T00:00:00Z"},
        }
    }
}
_PANCHANG = {
    "panchangeInfo": {
        "todayTithi": "Chaturthi - 09:56:19",
        "todayPaksha": "Krishna",
        "todaysNakshatra": "Purva Bhadrapada - 01/08/1999 - 11:39:12   ",
        "todaysYoga": "Atiganda - 10:17:08",
        "todaysKarana": "Balav - Kaulav",
        "todaysSunRiseTime": "05:41:00",
        "todaysSunSetTime": "18:53:59",
    }
}


def test_adapt_engine_response_builds_compact_shape():
    result = adapt_engine_response(birth=_birth(), d1=_D1, dasha=_DASHA, panchang=_PANCHANG)

    assert result["lagna_chart"]["ascendant_sign"] == "Libra"
    names = {p["planet"] for p in result["lagna_chart"]["planets"]}
    assert "Sun" in names and "Moon" in names
    assert "Uranus" not in names  # outer planets dropped
    # whole-sign house of the Sun (Cancer=4) from lagna Libra=7: ((4-7)%12)+1 = 10
    sun = next(p for p in result["lagna_chart"]["planets"] if p["planet"] == "Sun")
    assert sun["house"] == 10
    # moon chart: houses counted from the Moon's own sign -> Moon in house 1
    moon = next(p for p in result["moon_chart"]["planets"] if p["planet"] == "Moon")
    assert moon["house"] == 1
    assert result["dasha"]["mahadasha"]["lord"] == "Mercury"
    assert result["dasha"]["mahadasha"]["start_date"] == "2022-01-29"
    assert result["panchang"]["tithi"] == "Chaturthi"
    assert result["basic_details"]["dob"] == "01/08/1999"


@pytest.mark.asyncio
async def test_fetch_kundali_mints_token_then_calls_charts(monkeypatch: pytest.MonkeyPatch):
    seen_auth: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/generate-token"):
            return httpx.Response(200, json={"token": "tok-123"})
        seen_auth.append(request.headers.get("authorization", ""))
        if request.url.path.endswith("/d1chart/generate"):
            return httpx.Response(200, json=_D1)
        if request.url.path.endswith("/vimshottari-dasha/generate"):
            return httpx.Response(200, json=_DASHA)
        if request.url.path.endswith("/panchang/generate"):
            return httpx.Response(200, json=_PANCHANG)
        return httpx.Response(404, json={})

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    client = EngineKundaliClient(base_url="https://engine.test/api")

    result = await client.fetch_kundali(_birth())

    assert result["lagna_chart"]["ascendant_sign"] == "Libra"
    assert seen_auth and all(a == "Bearer tok-123" for a in seen_auth)


@pytest.mark.asyncio
async def test_fetch_kundali_raises_on_chart_error(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/generate-token"):
            return httpx.Response(200, json={"token": "tok-123"})
        return httpx.Response(500, text="boom")

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    client = EngineKundaliClient(base_url="https://engine.test/api")

    with pytest.raises(KundaliEngineError):
        await client.fetch_kundali(_birth())


@pytest.mark.asyncio
async def test_fetch_kundali_raises_on_token_failure(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="no token for you")

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    client = EngineKundaliClient(base_url="https://engine.test/api")

    with pytest.raises(KundaliEngineError):
        await client.fetch_kundali(_birth())


@pytest.mark.asyncio
async def test_preset_token_skips_minting(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/auth/generate-token"):
            raise AssertionError("should not mint when a token is supplied")
        if request.url.path.endswith("/d1chart/generate"):
            return httpx.Response(200, json=_D1)
        if request.url.path.endswith("/vimshottari-dasha/generate"):
            return httpx.Response(200, json=_DASHA)
        return httpx.Response(200, json=_PANCHANG)

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    client = EngineKundaliClient(base_url="https://engine.test/api", token="preset")

    result = await client.fetch_kundali(_birth())
    assert result["dasha"]["antardasha"]["lord"] == "Venus"
