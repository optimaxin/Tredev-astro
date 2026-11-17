"""The placeholder Kundali client must return a shape-correct fixture that
echoes the entered birth details — used when no engine base URL is set."""

from __future__ import annotations

import pytest

from kundali_chat.kundali.client import BirthDetails, birth_cache_ref
from kundali_chat.kundali.placeholder_client import StaticPlaceholderKundaliClient


def _birth(name: str = "Asha") -> BirthDetails:
    return {
        "name": name,
        "gender": "female",
        "year": 1990,
        "month": 3,
        "day": 15,
        "hour": 9,
        "minute": 30,
        "second": 0,
        "latitude": 28.6139,
        "longitude": 77.2090,
        "place": "Delhi",
    }


@pytest.mark.asyncio
async def test_returns_all_required_keys():
    client = StaticPlaceholderKundaliClient()

    result = await client.fetch_kundali(_birth())

    for key in (
        "session_ref",
        "basic_details",
        "panchang",
        "lagna_chart",
        "moon_chart",
        "shodashvarga",
        "dasha",
        "yogas",
    ):
        assert key in result


@pytest.mark.asyncio
async def test_echoes_entered_birth_details():
    client = StaticPlaceholderKundaliClient()

    result = await client.fetch_kundali(_birth("Asha"))

    assert result["session_ref"] == birth_cache_ref(_birth("Asha"))
    assert result["basic_details"]["name"] == "Asha"
    assert result["basic_details"]["dob"] == "15/03/1990"
    assert result["basic_details"]["city"] == "Delhi"


@pytest.mark.asyncio
async def test_dasha_has_mahadasha_and_antardasha():
    client = StaticPlaceholderKundaliClient()

    result = await client.fetch_kundali(_birth())

    assert "mahadasha" in result["dasha"]
    assert "antardasha" in result["dasha"]
    assert result["dasha"]["mahadasha"]["lord"]
