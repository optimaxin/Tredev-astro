"""The Kundali API client contract.

``KundaliChartData`` mirrors the REAL internal Kundali API's report shape
(confirmed against a real sample response, 2026-07-08) — trimmed down from
that API's ~150-key, multi-megabyte payload to the subset the brief
actually asks for: basic details, panchang, lagna (D1), moon (Chandra),
shodashvarga, and the current dasha. The full report also carries pre-
rendered marketing HTML for career/love/gemstone/dosha copy — deliberately
dropped by the adapter in ``real_client.py``, since stuffing that into an
LLM prompt would blow the token budget for no benefit (the model reasons
about astrology from the structured placements and writes its own copy).

``real_client.py`` implements :class:`KundaliApiClient` against that real
API. ``placeholder_client.py`` remains the fixture used when
``KUNDALI_API__BASE_URL`` is unset (local dev / this API isn't reachable
yet) — see ``api/app.py``'s lifespan for the one-line switch between them.
"""

from __future__ import annotations

import hashlib
from typing import Protocol, TypedDict


class BirthDetails(TypedDict):
    """The birth data the user enters — the input the kundali engine needs to
    compute a chart. Time components are the LOCAL time at the birth place;
    the engine derives the timezone from lat/long."""

    name: str
    gender: str
    year: int
    month: int
    day: int
    hour: int
    minute: int
    second: int
    latitude: float
    longitude: float
    place: str  # human-readable label for display only, e.g. "Kanpur, India"
    # Minutes to ADD to local time to get UTC (e.g. India = -330). Needed by
    # TredevAstroKundaliClient, which (unlike the third-party engine) doesn't
    # derive timezone from lat/long itself.
    timezone_offset_minutes: int


def birth_cache_ref(birth: BirthDetails) -> str:
    """A stable id for one set of birth details — used as the Redis cache key
    and stored as ``kundali_session_ref``. Same birth data -> same ref, so a
    repeat signup reuses the cached chart instead of re-hitting the engine."""
    raw = (
        f"{birth['year']:04d}-{birth['month']:02d}-{birth['day']:02d}"
        f"T{birth['hour']:02d}:{birth['minute']:02d}:{birth['second']:02d}"
        f"@{birth['latitude']:.4f},{birth['longitude']:.4f}"
        f"|{birth['name'].strip().lower()}|{birth['gender'].strip().lower()}"
    )
    # sha1 is fine here: this is a cache key, not a security primitive.
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


class BasicDetails(TypedDict):
    name: str
    gender: str
    dob: str
    time_of_birth: str
    city: str
    state: str
    country: str
    latitude: str
    longitude: str


class PanchangData(TypedDict, total=False):
    tithi: str
    paksha: str
    nakshatra: str
    yoga: str
    karana: str
    sunrise: str
    sunset: str


class PlanetPosition(TypedDict):
    planet: str
    sign: str
    house: int
    degree: float
    nakshatra: str
    pada: int
    retrograde: bool
    combust: bool
    nakshatra_lord: str
    sign_lord: str


class ChartData(TypedDict):
    ascendant_sign: str
    planets: list[PlanetPosition]


class DashaPeriod(TypedDict):
    lord: str
    start_date: str
    end_date: str


class DashaData(TypedDict):
    mahadasha: DashaPeriod
    antardasha: DashaPeriod


class KundaliChartData(TypedDict):
    session_ref: str
    basic_details: BasicDetails
    panchang: PanchangData
    lagna_chart: ChartData  # D1, houses counted from the ascendant
    moon_chart: ChartData  # Chandra Lagna, houses counted from the Moon
    shodashvarga: dict[str, dict[str, str]]  # varga name -> {planet: sign}
    dasha: DashaData
    yogas: list[str]


class KundaliApiClient(Protocol):
    """Anything that can turn a user's birth details into a computed chart."""

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData: ...
