"""Client for OUR OWN Express backend's ``/api/calculators/kundli-full``
endpoint — the Swiss-Ephemeris-verified chart engine this whole product
already ships and trusts, as opposed to the third-party engine
(``engine_client.py``) or the internal-API assumption (``real_client.py``).

Richer than ``engine_client.py``'s adapter: our engine returns all 12
planets (not just the 9 classical grahas) and real divisional-chart
(shodashvarga) + yoga data, so those fields are populated here instead of
left empty.

The pure ``adapt_tredevastro_response`` function is kept separate from the
HTTP call so it's testable without a network.
"""

from __future__ import annotations

from datetime import date, datetime
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


class TredevAstroApiError(Exception):
    """The backend call failed (HTTP transport or malformed payload)."""


def _planet_name(planet_id: str) -> str:
    return planet_id.capitalize()


def _build_lagna_chart(kundli: dict[str, Any]) -> ChartData:
    planets: list[PlanetPosition] = [
        cast(
            "PlanetPosition",
            {
                "planet": _planet_name(p["id"]),
                "sign": p["rashi"],
                "house": p["house"],
                "degree": round(float(p["degreeInSign"]), 2),
                "nakshatra": p["nakshatra"],
                "pada": p["nakshatraPada"],
                "retrograde": bool(p["retrograde"]),
                "combust": False,  # our engine doesn't compute combustion yet
                "nakshatra_lord": p.get("nakshatraLord", ""),
                "sign_lord": "",  # not computed by our engine
            },
        )
        for p in kundli["planets"]
    ]
    return {"ascendant_sign": kundli["ascendant"]["rashi"], "planets": planets}


def _build_moon_chart(chandra_chart: dict[str, Any], kundli_planets: list[dict[str, Any]]) -> ChartData:
    # chandraChart rows carry {id, rashi, degreeInSign, house, retrograde} only
    # (no nakshatra/pada) — those are the SAME physical placements as the D1
    # chart, so pull nakshatra/pada from there by planet id.
    by_id = {p["id"]: p for p in kundli_planets}
    planets: list[PlanetPosition] = []
    for cp in chandra_chart["planets"]:
        src = by_id.get(cp["id"], {})
        planets.append(
            cast(
                "PlanetPosition",
                {
                    "planet": _planet_name(cp["id"]),
                    "sign": cp["rashi"],
                    "house": cp["house"],
                    "degree": round(float(cp["degreeInSign"]), 2),
                    "nakshatra": src.get("nakshatra", ""),
                    "pada": src.get("nakshatraPada", 0),
                    "retrograde": bool(cp["retrograde"]),
                    "combust": False,
                    "nakshatra_lord": src.get("nakshatraLord", ""),
                    "sign_lord": "",
                },
            )
        )
    return {"ascendant_sign": chandra_chart["moonRashi"], "planets": planets}


def _build_shodashvarga(varga_charts: dict[str, Any]) -> dict[str, dict[str, str]]:
    return {
        varga_name: {_planet_name(p["id"]): p["rashi"] for p in chart["planets"]}
        for varga_name, chart in varga_charts.items()
    }


def _active_antardasha(antardashas: list[dict[str, Any]], today: date) -> dict[str, Any]:
    for a in antardashas:
        starts = datetime.strptime(a["startsAt"], "%Y-%m-%d").date()
        ends = datetime.strptime(a["endsAt"], "%Y-%m-%d").date()
        if starts <= today < ends:
            return a
    return antardashas[0] if antardashas else {"lord": "", "startsAt": "", "endsAt": ""}


def _build_dasha(mahadasha_timeline: list[dict[str, Any]]) -> DashaData:
    empty = {"lord": "", "startsAt": "", "endsAt": "", "antardashas": []}
    current = next((m for m in mahadasha_timeline if m.get("active")), None) or (
        mahadasha_timeline[0] if mahadasha_timeline else empty
    )
    antar = _active_antardasha(current.get("antardashas", []), datetime.utcnow().date())

    def _period(lord: str, starts: str, ends: str) -> DashaPeriod:
        return {"lord": _planet_name(lord) if lord else "", "start_date": starts, "end_date": ends}

    return {
        "mahadasha": _period(current["lord"], current["startsAt"], current["endsAt"]),
        "antardasha": _period(antar["lord"], antar["startsAt"], antar["endsAt"]),
    }


def _build_panchang(panchang: dict[str, Any]) -> PanchangData:
    def _hms(value: str | None) -> str:
        # ISO instant ("...T05:12:34.000Z") -> "05:12:34"; already-plain values pass through.
        return value[11:19] if value and len(value) > 11 and "T" in value else (value or "")

    return {
        "tithi": panchang.get("tithi", {}).get("name", ""),
        "paksha": panchang.get("tithi", {}).get("paksha", ""),
        "nakshatra": panchang.get("nakshatra", {}).get("name", ""),
        "yoga": panchang.get("yoga", ""),
        "karana": panchang.get("karana", ""),
        "sunrise": _hms(panchang.get("sunrise")),
        "sunset": _hms(panchang.get("sunset")),
    }


def adapt_tredevastro_response(raw: dict[str, Any], *, birth: BirthDetails) -> KundaliChartData:
    """Pure: our backend's ``/kundli-full`` payload + birth details ->
    KundaliChartData. Kept separate from the HTTP call so it's testable
    without a network."""
    kundli = raw["kundli"]
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
        "panchang": _build_panchang(raw.get("panchang", {})),
        "lagna_chart": _build_lagna_chart(kundli),
        "moon_chart": _build_moon_chart(raw["chandraChart"], kundli["planets"]),
        "shodashvarga": _build_shodashvarga(raw.get("vargaCharts", {})),
        "dasha": _build_dasha(raw.get("mahadashaTimeline", [])),
        "yogas": [y["name"] for y in raw.get("yogas", []) if y.get("present")],
    }


class TredevAstroKundaliClient:
    """Calls our own Express backend and adapts its response. Preferred
    kundli source — see ``api/app.py::_build_kundali_origin_client``."""

    def __init__(self, *, base_url: str, timeout_s: float = 15.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout_s = timeout_s

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData:
        body = {
            "date": f"{birth['year']:04d}-{birth['month']:02d}-{birth['day']:02d}",
            "time": f"{birth['hour']:02d}:{birth['minute']:02d}",
            "timezoneOffsetMinutes": birth["timezone_offset_minutes"],
            "latitude": birth["latitude"],
            "longitude": birth["longitude"],
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(f"{self._base_url}/api/calculators/kundli-full", json=body)
        except httpx.HTTPError as exc:
            raise TredevAstroApiError(f"backend transport error: {exc}") from exc
        if resp.status_code != 200:
            raise TredevAstroApiError(f"kundli-full: {resp.status_code} {resp.text[:200]}")
        payload = resp.json()
        if not payload.get("success"):
            raise TredevAstroApiError(f"kundli-full: unsuccessful response {resp.text[:200]}")
        return adapt_tredevastro_response(payload["data"], birth=birth)
