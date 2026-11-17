"""Node 1 — pure derivation, no IO (see ``graph/state.py``'s design note).

Two lexical, deterministic language signals are computed here:

* ``language_hint`` — raw script presence (Devanagari vs. Latin), kept for
  analytics / canned-text localization.
* ``reply_language`` — the concrete choice of what to ANSWER in: ``english``
  or ``hinglish``. English and Hinglish are both Latin script, so script
  alone can't separate them; we disambiguate with a small closed set of very
  common romanized-Hindi function words. This is deliberately a fixed, closed
  vocabulary (the kind this repo's rule allows), not an intent classifier —
  and it fixed a real bug where the model replied in Hinglish to plain
  English questions. Devanagari or any Hinglish marker -> ``hinglish``;
  otherwise plain-English -> ``english``.
"""

from __future__ import annotations

import re

from kundali_chat.graph.state import TurnState

_DEVANAGARI_RE = re.compile(r"[ऀ-ॿ]")
_LATIN_RE = re.compile(r"[A-Za-z]")
_WORD_RE = re.compile(r"[a-z]+")

# Common romanized-Hindi words. Deliberately excludes tokens that collide with
# ordinary English ("me", "to", "he", "is", "a", "i") to avoid false Hinglish.
_HINGLISH_MARKERS = frozenset(
    {
        "kya", "kaise", "kaisa", "kaisi", "kab", "kyun", "kyu", "kyon", "kahan",
        "mera", "meri", "mere", "aap", "aapka", "aapki", "aapke", "hai", "hain",
        "hoga", "hogi", "honge", "karna", "karega", "karegi", "ki", "ka", "ke",
        "ko", "mein", "nahi", "nahin", "kaun", "kitna", "kitne", "kitni",
        "shaadi", "vivah", "naukri", "nokri", "paisa", "paise", "dhan", "ghar",
        "jivan", "jeevan", "rahega", "rahegi", "batao", "btao", "bataye",
        "bataiye", "bta", "bata", "mujhe", "hume", "kuch", "achha", "accha",
        "theek", "raha", "rahi", "kyunki", "matlab", "sakta", "sakti",
        "chahiye", "hona", "haan", "hn", "hnn",
    }
)


def compute_language_hint(text: str) -> str:
    has_devanagari = bool(_DEVANAGARI_RE.search(text))
    has_latin = bool(_LATIN_RE.search(text))
    if has_devanagari and has_latin:
        return "mixed_script"
    if has_devanagari:
        return "hindi_script"
    if has_latin:
        return "latin_script"
    return "unknown"


def compute_reply_language(text: str) -> str:
    """``english`` or ``hinglish`` — the language to answer this message in."""
    if _DEVANAGARI_RE.search(text):
        return "hinglish"
    words = set(_WORD_RE.findall(text.lower()))
    if words & _HINGLISH_MARKERS:
        return "hinglish"
    return "english"


# A bare yes/agreement to a follow-up ("yes", "haan", "hnn", "ok", "batao",
# "tell me"...). Too short to language-detect reliably, so we inherit the
# conversation's language instead of letting a lone "yes" flip it to English.
_AFFIRMATION_RE = re.compile(
    r"^\s*(?:h[an]+|hmm+|ji|ok+|okay|sure|yes+|yep|yeah|bilkul|acha+|accha|theek|thik|"
    r"ba?tao|bata\s?do|bta\s?do|tell\s?me|please|pls)"
    r"(?:[\s,]+(?:ba?tao|bata\s?do|bta\s?do|tell\s?me|ji|please|na|zara|thoda))*"
    r"[\s!.,]*$",
    re.IGNORECASE,
)


def _is_affirmation(text: str) -> bool:
    return bool(_AFFIRMATION_RE.match(text.strip()))


async def context_assembly_node(state: TurnState) -> dict:
    history = state.get("message_history", [])
    is_first_turn = len(history) == 0
    user_message = state.get("user_message", "")
    if is_first_turn:
        # The greeting has no real user message yet -> default to warm Hinglish.
        reply_language = "hinglish"
    elif _is_affirmation(user_message):
        # "yes"/"haan"/"hnn btao" continues the thread — keep the language of
        # the last real (non-affirmation) user message, since a bare
        # affirmation is too short to language-detect. Default to Hinglish.
        prev = next(
            (
                t["content"]
                for t in reversed(history)
                if t.get("role") == "user" and not _is_affirmation(t.get("content", ""))
            ),
            None,
        )
        reply_language = compute_reply_language(prev) if prev else "hinglish"
    else:
        reply_language = compute_reply_language(user_message)
    return {
        "is_first_turn": is_first_turn,
        "language_hint": compute_language_hint(user_message),
        "reply_language": reply_language,
    }
