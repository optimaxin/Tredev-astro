"""The real internal Kundali API client.

Adapts the API's actual report payload (confirmed against a real sample
response, 2026-07-08 — ~150 top-level keys, whole-sign D1 planetary
positions in ``LAAGNA_TABLE``, 19 divisional charts in
``SODASHVARGA_TABLES``, current dasha in
``VIMSHOTTARI_CONTENT.currentDasha``) into the compact
:class:`KundaliChartData` shape the rest of this service consumes. See
``client.py``'s module docstring for why most of the raw payload (the
pre-rendered marketing HTML for career/love/gemstone/dosha copy) is
deliberately dropped rather than passed through.

**Request contract is an ASSUMPTION, not a confirmed spec.** Only a sample
*response* body was supplied so far — not the endpoint URL, HTTP method, or
auth header shape. Assumed here: ``GET {base_url}/api/kundali?session_id=
{session_ref}`` with ``Authorization: Bearer {api_key}``. If the real
contract differs, :meth:`RealKundaliApiClient.fetch_kundali` is the only
place that needs to change — :func:`adapt_kundali_response` and everything
downstream (the graph, the cache, the DB column) stays the same regardless
of how the bytes were fetched.
"""

from __future__ import annotations

from typing import Any, cast

import httpx

from kundali_chat.kundali.client import (
    BasicDetails,
    ChartData,
    DashaData,
    DashaPeriod,
    KundaliChartData,
    PanchangData,
    PlanetPosition,
)

_SIGN_ABBREV_TO_NAME = {
    "Ari": "Aries",
    "Tau": "Taurus",
    "Gem": "Gemini",
    "Can": "Cancer",
    "Leo": "Leo",
    "Vir": "Virgo",
    "Lib": "Libra",
    "Sco": "Scorpio",
    "Sag": "Sagittarius",
    "Cap": "Capricorn",
    "Aqu": "Aquarius",
    "Pis": "Pisces",
}

_PLANET_ABBREV_TO_NAME = {
    "As": "Ascendant",
    "Su": "Sun",
    "Mo": "Moon",
    "Ma": "Mars",
    "Me": "Mercury",
    "Ju": "Jupiter",
    "Ve": "Venus",
    "Sa": "Saturn",
    "Ra": "Rahu",
    "Ke": "Ketu",
    "Ur": "Uranus",
    "Ne": "Neptune",
    "Pl": "Pluto",
}


def _house_from_reference(planet_rashi_index: int, reference_rashi_index: int) -> int:
    """Whole-sign house number of a planet counted from a reference sign —
    the ascendant for the lagna/D1 chart, the Moon's own sign for the
    Chandra/moon chart. ``rashiIndex`` from the API is 1-based
    (Aries=1 .. Pisces=12)."""
    return ((planet_rashi_index - reference_rashi_index) % 12) + 1


def _build_chart(lagna_rows: list[dict[str, Any]], *, reference_planet_abbrev: str) -> ChartData:
    """``ascendant_sign`` is the REFERENCE planet's own sign, not always the
    true Ascendant's — for the moon/Chandra chart, the Moon's sign is
    conventionally treated as that chart's "Lagna" (house 1)."""
    by_abbrev = {row["planet"]: row for row in lagna_rows}
    reference_rashi_index = by_abbrev[reference_planet_abbrev]["rashiIndex"]

    planets: list[PlanetPosition] = []
    for row in lagna_rows:
        if row["planet"] == "As":
            continue
        planets.append(
            cast(
                "PlanetPosition",
                {
                    "planet": _PLANET_ABBREV_TO_NAME.get(row["planet"], row["planet"]),
                    "sign": row["rashi"],
                    "house": _house_from_reference(row["rashiIndex"], reference_rashi_index),
                    "degree": row["degree"],
                    "nakshatra": row["nakshatra"],
                    "pada": row["pada"],
                    "retrograde": row["isretrograde"],
                    "combust": row["iscombust"],
                    "nakshatra_lord": row["NL"],
                    "sign_lord": row["RL"],
                },
            )
        )
    return {
        "ascendant_sign": by_abbrev[reference_planet_abbrev]["rashi"],
        "planets": planets,
    }


def _build_shodashvarga(tables: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
    return {
        str(table["type"]): {
            _PLANET_ABBREV_TO_NAME.get(abbrev, abbrev): _SIGN_ABBREV_TO_NAME.get(str(sign), str(sign))
            for abbrev, sign in table.items()
            if abbrev != "type"
        }
        for table in tables
    }


def _build_dasha(raw: dict[str, Any]) -> DashaData:
    current = raw["VIMSHOTTARI_CONTENT"]["currentDasha"]

    def _period(p: dict[str, Any]) -> DashaPeriod:
        return {"lord": p["planet"], "start_date": p["startDate"], "end_date": p["endDate"]}

    return {"mahadasha": _period(current["mahaDasha"]), "antardasha": _period(current["antarDasha"])}


def _build_yogas(raw: dict[str, Any]) -> list[str]:
    """The API's yoga/dosha detail (``YOGS_CONTENT`` / ``DOSH_CONTENT``) is
    pre-rendered marketing HTML, not structured names — deliberately not
    scraped here (fragile, heavy, and the astrologer LLM identifies yogas
    from the chart placements directly). Only the one cleanly structured
    signal the API exposes (Manglik dosh) is surfaced."""
    if raw.get("IS_MANGLIK") and raw.get("MANGALIK_TYPE"):
        return [raw["MANGALIK_TYPE"]]
    return []


def adapt_kundali_response(raw: dict[str, Any], *, session_ref: str) -> KundaliChartData:
    """Pure function: real API payload -> :class:`KundaliChartData`. Kept
    separate from the HTTP call so it's testable without a network."""
    basic_details: BasicDetails = {
        "name": raw.get("NAME", ""),
        "gender": raw.get("GENDER", ""),
        "dob": raw.get("DOB", ""),
        "time_of_birth": raw.get("TIME_OF_BIRTH", ""),
        "city": raw.get("CITY", ""),
        "state": raw.get("STATE", ""),
        "country": raw.get("COUNTRY", ""),
        "latitude": raw.get("LATITUDE", ""),
        "longitude": raw.get("LONGITUDE", ""),
    }
    panchang: PanchangData = {
        "tithi": raw.get("TITHI", ""),
        "paksha": raw.get("PAKSHA", ""),
        "nakshatra": raw.get("NAKSHATRA_NAME", ""),
        "yoga": raw.get("YOGA", ""),
        "karana": raw.get("KARANA", ""),
        "sunrise": raw.get("SUN_RISE", ""),
        "sunset": raw.get("SUN_SET", ""),
    }

    lagna_rows = raw["LAAGNA_TABLE"]

    return {
        "session_ref": session_ref,
        "basic_details": basic_details,
        "panchang": panchang,
        "lagna_chart": _build_chart(lagna_rows, reference_planet_abbrev="As"),
        "moon_chart": _build_chart(lagna_rows, reference_planet_abbrev="Mo"),
        "shodashvarga": _build_shodashvarga(raw.get("SODASHVARGA_TABLES", [])),
        "dasha": _build_dasha(raw),
        "yogas": _build_yogas(raw),
    }


class RealKundaliApiClient:
    """Calls the internal Kundali API and adapts its response. See the
    module docstring for the ASSUMED request contract — confirm/correct
    against the actual endpoint before relying on this in production."""

    def __init__(self, *, base_url: str, api_key: str | None, timeout_s: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout_s = timeout_s

    async def fetch_kundali(self, session_ref: str) -> KundaliChartData:
        headers = {"Authorization": f"Bearer {self._api_key}"} if self._api_key else {}
        async with httpx.AsyncClient(timeout=self._timeout_s) as client:
            resp = await client.get(
                f"{self._base_url}/api/kundali",
                params={"session_id": session_ref},
                headers=headers,
            )
            resp.raise_for_status()
        return adapt_kundali_response(resp.json(), session_ref=session_ref)
