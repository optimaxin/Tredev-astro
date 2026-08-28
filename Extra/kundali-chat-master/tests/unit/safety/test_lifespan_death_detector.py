"""The one hard safety rule this service must never break — tested heavily
in both directions: real violations must fire, and safe/refusal/neutral
text (including the detector's own canned redirects) must never fire."""

from __future__ import annotations

import pytest

from kundali_chat.safety.canned_responses import SAFETY_REDIRECTS
from kundali_chat.safety.lifespan_death_detector import (
    DISEASE_DIAGNOSIS,
    LIFESPAN_OR_DEATH,
    detect_unsafe_prediction,
)


@pytest.mark.parametrize(
    "text",
    [
        "Your Saturn dasha shows you will die at age 72.",
        "Based on your chart, death will come early in your life.",
        "Shani mahadasha indicates ki aap 80 saal tak jiyoge.",
        "Mars in the 8th house suggests when will i die.",
        "Aapki kundli mein Rahu-Ketu dasha se pata chalta hai ki aap kab marunga.",
    ],
)
def test_flags_lifespan_or_death_assertions(text):
    assert detect_unsafe_prediction(text) == LIFESPAN_OR_DEATH


@pytest.mark.parametrize(
    "text",
    [
        "Your Mars placement causes cancer in your 60s.",
        "Saturn in the 6th house indicates you will develop diabetes.",
        "Is dasha mein tumhe heart attack hoga.",
        "Your chart shows a kidney disease developing next year.",
    ],
)
def test_flags_disease_diagnosis_assertions(text):
    assert detect_unsafe_prediction(text) == DISEASE_DIAGNOSIS


@pytest.mark.parametrize(
    "text",
    [
        "Aapka lagna Aries hai aur aapki current Mahadasha Venus ki hai.",
        "Your Moon is in Taurus, giving you a calm and grounded nature.",
        "Saturn's transit through your 10th house favors career growth this year.",
        "This yoga in your chart suggests strong leadership qualities.",
        "",
        "Namaste! Aapki kundli dekh ke bahut accha lag raha hai baat karke.",
    ],
)
def test_does_not_flag_normal_astrology_answers(text):
    assert detect_unsafe_prediction(text) is None


@pytest.mark.parametrize(
    "text",
    [
        "I can't predict lifespan or the timing of death from a chart.",
        "Astrology cannot diagnose a disease — please consult a doctor for that.",
        "Main kundli se death ka time nahi bata sakta.",
    ],
)
def test_does_not_flag_explicit_safe_refusals(text):
    assert detect_unsafe_prediction(text) is None


def test_own_canned_redirects_never_self_trigger():
    """The safety filter's own redirect text necessarily mentions
    death/disease/charts — it must never re-trigger itself (infinite regen)."""
    for bank in SAFETY_REDIRECTS.values():
        for language_text in bank.values():
            assert detect_unsafe_prediction(language_text) is None


def test_mentioning_a_planet_alone_is_not_flagged():
    assert detect_unsafe_prediction("Saturn is currently transiting your 10th house.") is None


def test_mentioning_death_without_chart_factor_is_not_flagged():
    assert detect_unsafe_prediction("Death is a natural part of life.") is None
