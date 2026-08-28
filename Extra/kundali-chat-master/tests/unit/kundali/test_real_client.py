"""adapt_kundali_response() against a representative fixture of the real
API's shape (not the full multi-megabyte report — just the fields the
adapter reads). Field values below are drawn from an actual sample
response the real API returned.
"""

from __future__ import annotations

import httpx
import pytest

from kundali_chat.kundali.real_client import (
    RealKundaliApiClient,
    _house_from_reference,
    adapt_kundali_response,
)

_RAW_FIXTURE = {
    "NAME": "Md Muntazir Ansari",
    "GENDER": "Male",
    "DOB": "20/10/2001",
    "TIME_OF_BIRTH": "00:00:00",
    "CITY": "Balewa",
    "STATE": "Haryana",
    "COUNTRY": "IN",
    "LATITUDE": "28.27607770",
    "LONGITUDE": "76.69757390",
    "TITHI": "Chaturthi",
    "PAKSHA": "Shukla",
    "NAKSHATRA_NAME": "Anuradha",
    "YOGA": "Saubhagya",
    "KARANA": "Vanij",
    "SUN_RISE": "6:29:54",
    "SUN_SET": "17:46:9",
    "IS_MANGLIK": True,
    "MANGALIK_TYPE": "Anshik Manglik Dosh",
    "LAAGNA_TABLE": [
        {
            "planet": "As",
            "rashi": "Cancer",
            "degree": 7.56,
            "rashiIndex": 4,
            "nakshatra": "Pushya",
            "pada": 2,
            "isretrograde": False,
            "iscombust": False,
            "NL": "Saturn",
            "RL": "Moon",
        },
        {
            "planet": "Su",
            "rashi": "Libra",
            "degree": 2.56,
            "rashiIndex": 7,
            "nakshatra": "Chitra",
            "pada": 3,
            "isretrograde": False,
            "iscombust": False,
            "NL": "Mars",
            "RL": "Venus",
        },
        {
            "planet": "Mo",
            "rashi": "Scorpio",
            "degree": 11.64,
            "rashiIndex": 8,
            "nakshatra": "Anuradha",
            "pada": 3,
            "isretrograde": False,
            "iscombust": False,
            "NL": "Saturn",
            "RL": "Mars",
        },
    ],
    "SODASHVARGA_TABLES": [
        {
            "type": "Navamsa",
            "As": "Vir",
            "Su": "Lib",
            "Mo": "Pis",
            "Ma": "Ari",
            "Me": "Tau",
            "Ju": "Gem",
            "Ve": "Can",
            "Sa": "Leo",
            "Ra": "Vir",
            "Ke": "Pis",
            "Ur": "Lib",
            "Ne": "Sco",
            "Pl": "Sag",
        }
    ],
    "VIMSHOTTARI_CONTENT": {
        "currentDasha": {
            "mahaDasha": {"planet": "Ketu", "startDate": "20/12/2025", "endDate": "19/12/2032"},
            "antarDasha": {
                "planet": "Venus",
                "startDate": "2026-05-18T08:54:18.624Z",
                "endDate": "2027-07-18T11:54:18.624Z",
            },
        }
    },
}


def test_house_from_reference_ascendant_is_house_one():
    assert _house_from_reference(4, 4) == 1


def test_house_from_reference_wraps_around():
    # rashiIndex 7 counted from reference 8 (e.g. Sun from Moon's chart)
    assert _house_from_reference(7, 8) == 12


def test_basic_details_mapped():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    assert result["basic_details"]["name"] == "Md Muntazir Ansari"
    assert result["basic_details"]["city"] == "Balewa"
    assert result["session_ref"] == "ext-1"


def test_panchang_mapped():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    assert result["panchang"]["tithi"] == "Chaturthi"
    assert result["panchang"]["nakshatra"] == "Anuradha"


def test_lagna_chart_houses_counted_from_ascendant():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    lagna = result["lagna_chart"]
    assert lagna["ascendant_sign"] == "Cancer"

    by_planet = {p["planet"]: p for p in lagna["planets"]}
    assert "Ascendant" not in by_planet  # As is surfaced via ascendant_sign, not in planets
    assert by_planet["Sun"]["house"] == 4  # rashiIndex 7 from ascendant rashiIndex 4
    assert by_planet["Moon"]["house"] == 5
    assert by_planet["Sun"]["nakshatra_lord"] == "Mars"
    assert by_planet["Sun"]["sign_lord"] == "Venus"


def test_moon_chart_houses_counted_from_moon():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    moon_chart = result["moon_chart"]
    by_planet = {p["planet"]: p for p in moon_chart["planets"]}
    assert by_planet["Moon"]["house"] == 1
    assert by_planet["Sun"]["house"] == 12


def test_moon_chart_ascendant_sign_is_the_moons_own_sign_not_the_true_ascendant():
    """Regression: the moon/Chandra chart's "Lagna" is conventionally the
    Moon's own sign, not the real Ascendant's — caught by running the
    adapter against the actual full sample response, where As=Cancer but
    Mo=Scorpio."""
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    assert result["lagna_chart"]["ascendant_sign"] == "Cancer"
    assert result["moon_chart"]["ascendant_sign"] == "Scorpio"


def test_shodashvarga_expands_abbreviations():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    navamsa = result["shodashvarga"]["Navamsa"]
    assert navamsa["Sun"] == "Libra"
    assert navamsa["Moon"] == "Pisces"
    assert "Ascendant" in navamsa


def test_dasha_extracted_from_vimshottari_current():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    assert result["dasha"]["mahadasha"] == {
        "lord": "Ketu",
        "start_date": "20/12/2025",
        "end_date": "19/12/2032",
    }
    assert result["dasha"]["antardasha"]["lord"] == "Venus"


def test_yogas_includes_manglik_when_present():
    result = adapt_kundali_response(_RAW_FIXTURE, session_ref="ext-1")
    assert result["yogas"] == ["Anshik Manglik Dosh"]


def test_yogas_empty_when_not_manglik():
    raw = {**_RAW_FIXTURE, "IS_MANGLIK": False}
    result = adapt_kundali_response(raw, session_ref="ext-1")
    assert result["yogas"] == []


def test_missing_optional_fields_default_to_empty_string():
    minimal = {
        "LAAGNA_TABLE": _RAW_FIXTURE["LAAGNA_TABLE"],
        "SODASHVARGA_TABLES": [],
        "VIMSHOTTARI_CONTENT": _RAW_FIXTURE["VIMSHOTTARI_CONTENT"],
    }
    result = adapt_kundali_response(minimal, session_ref="ext-1")
    assert result["basic_details"]["name"] == ""
    assert result["panchang"]["tithi"] == ""
    assert result["yogas"] == []


@pytest.mark.asyncio
async def test_real_client_calls_assumed_endpoint_shape(monkeypatch: pytest.MonkeyPatch):
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        return httpx.Response(200, json=_RAW_FIXTURE)

    real_async_client = httpx.AsyncClient

    def _client_factory(*args, **kwargs):
        kwargs.pop("transport", None)
        return real_async_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory)

    client = RealKundaliApiClient(base_url="https://kundali.internal", api_key="secret-key")
    result = await client.fetch_kundali("ext-ref-42")

    assert result["session_ref"] == "ext-ref-42"
    assert "session_id=ext-ref-42" in captured["url"]
    assert captured["headers"]["authorization"] == "Bearer secret-key"
