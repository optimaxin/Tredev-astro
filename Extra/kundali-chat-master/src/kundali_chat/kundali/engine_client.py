"""Client for the Astro Kundli Engine (the real chart engine).

Base URL (hosted): ``https://kundali.astroarunpandit.org/api``. Auth is a
never-expiring ``permanent_access`` JWT minted from the public
``POST /auth/generate-token`` endpoint with an ``appId`` — this client mints
one lazily on first use and reuses it. Birth details go in as query params
(``year..second``, ``lat``, ``long``, ``name``); the engine derives the
timezone from lat/long.

One chart needs three of the engine's per-chart endpoints, fetched
concurrently and folded into the compact :class:`KundaliChartData` shape the
rest of this service consumes:

  * ``/d1chart/generate``        -> lagna (D1) placements  -> lagna + moon charts
  * ``/vimshottari-dasha/generate`` -> ``result.currentDasha`` -> dasha
  * ``/panchang/generate``       -> ``panchangeInfo``       -> panchang

The pure ``adapt_*`` functions are kept separate from the HTTP calls so they
are testable without a network. Moon (Chandra) chart is derived from the same
D1 rows by counting houses from the Moon's own sign — no extra call.
"""

from __future__ import annotations

import asyncio
from typing import Any, cast

import httpx

from kundali_chat.kundali.client import (
    BasicDetails,
    BirthDetails,
    ChartData,
    DashaData,
    DashaPeriod,
    KundaliChartData,
    PanchangData,
    PlanetPosition,
    birth_cache_ref,
)
from kundali_chat.shared.logging import get_logger

_log = get_logger("kundali_chat.kundali.engine_client")

# Only the nine classical grahas + ascendant go into the chart/prompt; the
# engine also returns Ur/Ne/Pl, which Vedic charts conventionally omit.
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
}
_VEDIC_PLANETS = frozenset(_PLANET_ABBREV_TO_NAME) - {"As"}


class KundaliEngineError(Exception):
    """The engine call failed (auth, HTTP, or malformed payload)."""


def _house_from_reference(planet_rashi_index: int, reference_rashi_index: int) -> int:
    """Whole-sign house number counted from a reference sign (ascendant for
    the D1 chart, the Moon's sign for the Chandra chart). ``rashiIndex`` is
    1-based (Aries=1 .. Pisces=12)."""
    return ((planet_rashi_index - reference_rashi_index) % 12) + 1


def _build_chart(planet_info: list[dict[str, Any]], *, reference_abbrev: str) -> ChartData:
    by_abbrev = {row["planet"]: row for row in planet_info}
    reference_rashi_index = by_abbrev[reference_abbrev]["rashiIndex"]

    planets: list[PlanetPosition] = []
    for row in planet_info:
        abbrev = row["planet"]
        if abbrev not in _VEDIC_PLANETS:
            continue
        planets.append(
            cast(
                "PlanetPosition",
                {
                    "planet": _PLANET_ABBREV_TO_NAME[abbrev],
                    "sign": row["rashi"],
                    "house": _house_from_reference(row["rashiIndex"], reference_rashi_index),
                    "degree": round(float(row.get("degree", 0.0)), 2),
                    "nakshatra": row.get("nakshatra", ""),
                    "pada": row.get("pada", 0),
                    "retrograde": bool(row.get("isretrograde", False)),
                    "combust": bool(row.get("iscombust", False)),
                    "nakshatra_lord": "",
                    "sign_lord": "",
                },
            )
        )
    return {"ascendant_sign": by_abbrev[reference_abbrev]["rashi"], "planets": planets}


def _adapt_dasha(dasha_raw: dict[str, Any]) -> DashaData:
    current = dasha_raw["result"]["currentDasha"]

    def _period(p: dict[str, Any]) -> DashaPeriod:
        return {
            "lord": p["planet"],
            "start_date": str(p["startDate"])[:10],
            "end_date": str(p["endDate"])[:10],
        }

    return {"mahadasha": _period(current["mahaDasha"]), "antardasha": _period(current["antarDasha"])}


def _adapt_panchang(panchang_raw: dict[str, Any]) -> PanchangData:
    info = panchang_raw.get("panchangeInfo", {})

    def _first(value: str) -> str:
        # Several fields carry a trailing "- HH:MM:SS" end-time; keep the name.
        return str(value).split(" - ")[0].strip()

    return {
        "tithi": _first(info.get("todayTithi", "")),
        "paksha": info.get("todayPaksha", ""),
        "nakshatra": _first(info.get("todaysNakshatra", "")),
        "yoga": _first(info.get("todaysYoga", "")),
        "karana": info.get("todaysKarana", ""),
        "sunrise": info.get("todaysSunRiseTime", ""),
        "sunset": info.get("todaysSunSetTime", ""),
    }


def adapt_engine_response(
    *,
    birth: BirthDetails,
    d1: dict[str, Any],
    dasha: dict[str, Any],
    panchang: dict[str, Any],
) -> KundaliChartData:
    """Pure: the three engine payloads + birth details -> KundaliChartData."""
    planet_info = d1["planetInfo"]
    basic_details: BasicDetails = {
        "name": birth["name"],
        "gender": birth["gender"],
        "dob": f"{birth['day']:02d}/{birth['month']:02d}/{birth['year']:04d}",
        "time_of_birth": f"{birth['hour']:02d}:{birth['minute']:02d}:{birth['second']:02d}",
        "city": birth.get("place", ""),
        "state": "",
        "country": "",
        "latitude": str(birth["latitude"]),
        "longitude": str(birth["longitude"]),
    }
    return {
        "session_ref": birth_cache_ref(birth),
        "basic_details": basic_details,
        "panchang": _adapt_panchang(panchang),
        "lagna_chart": _build_chart(planet_info, reference_abbrev="As"),
        "moon_chart": _build_chart(planet_info, reference_abbrev="Mo"),
        "shodashvarga": {},
        "dasha": _adapt_dasha(dasha),
        "yogas": [],
    }


class EngineKundaliClient:
    """Calls the Astro Kundli Engine and adapts its response."""

    def __init__(
        self,
        *,
        base_url: str,
        app_id: str = "kundali-chat",
        token: str | None = None,
        timeout_s: float = 15.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._app_id = app_id
        self._token = token
        self._timeout_s = timeout_s
        self._token_lock = asyncio.Lock()

    async def _ensure_token(self, client: httpx.AsyncClient) -> str:
        if self._token:
            return self._token
        async with self._token_lock:
            if self._token:  # another coroutine won the race
                return self._token
            resp = await client.post("/auth/generate-token", json={"appId": self._app_id})
            if resp.status_code != 200:
                raise KundaliEngineError(f"token mint failed: {resp.status_code} {resp.text[:200]}")
            token = resp.json().get("token")
            if not token:
                raise KundaliEngineError("token mint returned no token")
            self._token = token
            return token

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData:
        params = {
            "year": birth["year"],
            "month": birth["month"],
            "day": birth["day"],
            "hour": birth["hour"],
            "minute": birth["minute"],
            "second": birth["second"],
            "lat": birth["latitude"],
            "long": birth["longitude"],
            "name": birth["name"] or "user",
        }
        try:
            async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout_s) as client:
                token = await self._ensure_token(client)
                headers = {"Authorization": f"Bearer {token}"}

                async def _get(path: str) -> dict[str, Any]:
                    r = await client.get(path, params=params, headers=headers)
                    if r.status_code != 200:
                        raise KundaliEngineError(f"{path}: {r.status_code} {r.text[:200]}")
                    return r.json()

                d1, dasha, panchang = await asyncio.gather(
                    _get("/d1chart/generate"),
                    _get("/vimshottari-dasha/generate"),
                    _get("/panchang/generate"),
                )
        except httpx.HTTPError as exc:
            raise KundaliEngineError(f"engine transport error: {exc}") from exc

        return adapt_engine_response(birth=birth, d1=d1, dasha=dasha, panchang=panchang)
