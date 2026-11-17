"""Deterministic output gate for the one hard rule this service must never
break: no lifespan / death-timing / disease-diagnosis predictions from a
chart — regardless of how the user phrased the question.

This is a genuinely lexical, narrow-vocabulary check (a fixed list of
death/disease terms), which is exactly the kind of check this repo's
CLAUDE.md exempts from the "no regex for intent/meaning" rule — the rule
targets routing/intent/safety decisions that vary by *phrasing*, not a
closed, well-known vocabulary like this one. Mirrors the three-part pattern
in ``services/ai-core/src/ai_core/guardrails/disease_prediction.py``.

Detection requires ALL THREE, in the same sentence (or safely overridden):
  1. A death/lifespan OR disease term.
  2. A chart factor (planet / dasha / transit / house / etc.).
  3. An assertive prognosis / causation phrase.

A sentence containing a safe pattern (doctor referral, explicit
cannot-predict) is never flagged even if the other three signals are
present — this keeps the detector from firing on the safety filter's own
canned redirect text, which necessarily discusses death/disease/charts.

Lifespan and death-timing collapse into one category (``lifespan_or_death``)
rather than two — the vocabulary overlaps almost completely and the
response (redirect, no prediction) is identical either way. Splitting them
would add categories without adding any different behavior.
"""

from __future__ import annotations

import re

_DEATH_RE = re.compile(
    r"\b(die|dying|death|dead|demise|expire|expiry|passed?\s+away|"
    r"life\s*span|lifespan|longevity|how\s+long\s+will\s+i\s+live|"
    r"when\s+will\s+i\s+die|marne\s+ki|kab\s+marunga|kab\s+marungi|"
    r"kitne\s+saal\s+jiunga|kitne\s+saal\s+jiungi|jiyo(?:ge|gi)|"
    r"umar\s+kitni|"
    r"mrityu|maut|मृत्यु|मौत|मरने)\b",
    re.IGNORECASE,
)

_DISEASE_RE = re.compile(
    r"\b(cancer|tumou?r|diabetes|heart\s+(?:attack|disease)|stroke|kidney|"
    r"liver\s+disease|tuberculosis|\bTB\b|asthma|paralysis|depression|"
    r"disease|illness|ailment|uterus|uterine|ovar(?:y|ies|ian)|cervix|"
    r"cervical|prostate|miscarriage|infertilit|fibroid|PCOS|"
    r"bimari|beemari|rog|बीमारी|कैंसर|रोग)\b",
    re.IGNORECASE,
)

_CHART_FACTOR_RE = re.compile(
    r"\b(mars|saturn|rahu|ketu|jupiter|venus|mercury|sun|moon|shani|mangal|"
    r"dasha|mahadasha|antardasha|transit|gochar|house|grah|kundli|chart|"
    r"planet|lagna|rashi)\b",
    re.IGNORECASE,
)

_PROGNOSIS_RE = re.compile(
    r"\b(will\s+(get|have|cause|develop|lead\s+to|result\s+in|die|come|happen|occur|strike)|"
    r"causes?|indicates?|leads?\s+to|shows?|suggests?|predicts?|"
    r"pata\s+(chalta|chalega|lagta|lagega)\s+hai|"
    r"hoga|hogi|ho\s+jayega|ho\s+jayegi|"
    r"होगा|होगी)\b",
    re.IGNORECASE,
)

_SAFE_RE = re.compile(
    r"\b(consult\s+a?\s*(doctor|physician|specialist|medical)|"
    r"see\s+a?\s*(doctor|physician|specialist)|"
    r"cannot\s+(predict|diagnose|tell)|"
    r"can'?t\s+(predict|diagnose|tell)|"
    r"not\s+(able\s+to\s+)?(predict|diagnose)|"
    r"does?\s*n?'?t\s+indicate|"
    r"no\s+(disease|illness|condition)|"
    r"please\s+(see|visit|consult)\s+a?\s*(doctor|physician|specialist)|"
    r"doctor\s+se\s+(mile|milein|consult)|"
    r"nahi\s+(kar\s+sakta|kar\s+sakti|kar\s+sakte|bata\s+sakta|bata\s+sakti|bata\s+sakte))\b",
    re.IGNORECASE,
)

_SENTENCE_SPLIT_RE = re.compile(r"[.!?\n]")

LIFESPAN_OR_DEATH = "lifespan_or_death"
DISEASE_DIAGNOSIS = "disease_diagnosis"


def detect_unsafe_prediction(text: str) -> str | None:
    """Return the safety category that fired, or ``None`` if the text is safe.

    Categories: :data:`LIFESPAN_OR_DEATH`, :data:`DISEASE_DIAGNOSIS`.
    """
    has_death = bool(_DEATH_RE.search(text))
    has_disease = bool(_DISEASE_RE.search(text))
    has_chart = bool(_CHART_FACTOR_RE.search(text))
    has_prognosis = bool(_PROGNOSIS_RE.search(text))

    if not ((has_death or has_disease) and has_chart and has_prognosis):
        return None

    for sentence in _SENTENCE_SPLIT_RE.split(text):
        s = sentence.strip()
        if not s:
            continue

        s_has_death = bool(_DEATH_RE.search(s))
        s_has_disease = bool(_DISEASE_RE.search(s))
        if not (s_has_death or s_has_disease):
            continue
        if _SAFE_RE.search(s):
            continue

        s_has_chart = bool(_CHART_FACTOR_RE.search(s))
        s_has_prognosis = bool(_PROGNOSIS_RE.search(s))
        if not (s_has_chart or s_has_prognosis):
            continue

        return LIFESPAN_OR_DEATH if s_has_death else DISEASE_DIAGNOSIS

    return None
