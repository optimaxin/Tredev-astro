"""Dev/fallback client — used when ``KUNDALI_API__BASE_URL`` is unset (see
``api/app.py``'s lifespan). Returns a deterministic, shape-correct fixture
matching the real API's adapted shape (``kundali/real_client.py``).
"""

from __future__ import annotations

from kundali_chat.kundali.client import BirthDetails, KundaliChartData, birth_cache_ref


class StaticPlaceholderKundaliClient:
    """Fixture implementation of :class:`KundaliApiClient` — used when no
    engine base URL is configured. It echoes the entered birth details into
    ``basic_details`` (so the UI reflects what the user typed) but the chart
    placements stay fixed values (no real ephemeris computation here)."""

    async def fetch_kundali(self, birth: BirthDetails) -> KundaliChartData:
        return _placeholder_payload(birth)


def _placeholder_payload(birth: BirthDetails) -> KundaliChartData:
    return {
        "session_ref": birth_cache_ref(birth),
        "basic_details": {
            "name": birth["name"] or "Placeholder User",
            "gender": birth["gender"] or "unspecified",
            "dob": f"{birth['day']:02d}/{birth['month']:02d}/{birth['year']:04d}",
            "time_of_birth": f"{birth['hour']:02d}:{birth['minute']:02d}:{birth['second']:02d}",
            "city": birth.get("place", "New Delhi"),
            "state": "",
            "country": "",
            "latitude": str(birth["latitude"]),
            "longitude": str(birth["longitude"]),
        },
        "panchang": {
            "tithi": "Panchami",
            "paksha": "Shukla",
            "nakshatra": "Rohini",
            "yoga": "Siddhi",
            "karana": "Bava",
            "sunrise": "06:45:00",
            "sunset": "18:10:00",
        },
        "lagna_chart": {
            "ascendant_sign": "Aries",
            "planets": [
                {
                    "planet": "Sun",
                    "sign": "Capricorn",
                    "house": 10,
                    "degree": 15.0,
                    "nakshatra": "Shravana",
                    "pada": 2,
                    "retrograde": False,
                    "combust": False,
                    "nakshatra_lord": "Moon",
                    "sign_lord": "Saturn",
                }
            ],
        },
        "moon_chart": {
            "ascendant_sign": "Taurus",
            "planets": [
                {
                    "planet": "Moon",
                    "sign": "Rohini",
                    "house": 1,
                    "degree": 4.0,
                    "nakshatra": "Rohini",
                    "pada": 1,
                    "retrograde": False,
                    "combust": False,
                    "nakshatra_lord": "Moon",
                    "sign_lord": "Venus",
                }
            ],
        },
        "shodashvarga": {"Navamsa": {"Sun": "Leo", "Moon": "Taurus"}},
        "dasha": {
            "mahadasha": {"lord": "Venus", "start_date": "2020-01-01", "end_date": "2040-01-01"},
            "antardasha": {"lord": "Sun", "start_date": "2026-01-01", "end_date": "2026-07-01"},
        },
        "yogas": ["Gaja Kesari Yoga"],
    }
