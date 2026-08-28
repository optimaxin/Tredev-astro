"""Localized canned text: safety redirects and the processing-timeout
fallback. Keyed by the same three language buckets the rest of the service
mirrors to: ``en``, ``hi``, ``hinglish``.
"""

from __future__ import annotations

from kundali_chat.safety.lifespan_death_detector import DISEASE_DIAGNOSIS, LIFESPAN_OR_DEATH

_DEFAULT_LANGUAGE = "en"

SAFETY_REDIRECTS: dict[str, dict[str, str]] = {
    LIFESPAN_OR_DEATH: {
        "en": (
            "I can't predict lifespan or the timing of death from a chart — no "
            "honest astrologer can. What I can genuinely help with is the themes "
            "of your current dasha and some remedies. Want me to look at that instead?"
        ),
        "hi": (
            "मैं कुंडली से आयु या मृत्यु का समय नहीं बता सकता — कोई भी ईमानदार ज्योतिषी यह नहीं "
            "बता सकता। मैं आपके वर्तमान दशा और उससे जुड़े उपाय जरूर बता सकता हूं। बताऊं?"
        ),
        "hinglish": (
            "Main kundli se lifespan ya death ka exact time nahi bata sakta — koi bhi "
            "honest astrologer ye nahi bata sakta. Haan, main aapke current dasha ke "
            "themes aur kuch upaay zaroor bata sakta hoon. Bataun?"
        ),
    },
    DISEASE_DIAGNOSIS: {
        "en": (
            "I'm not able to diagnose or predict a specific illness from your chart — "
            "that's a doctor's call, not astrology's. If you have health concerns, "
            "please consult a qualified medical professional. I'm happy to look at "
            "other areas of your chart in the meantime."
        ),
        "hi": (
            "मैं आपकी कुंडली से किसी बीमारी का निदान या भविष्यवाणी नहीं कर सकता — यह डॉक्टर का "
            "काम है, ज्योतिष का नहीं। स्वास्थ्य संबंधी चिंता होने पर कृपया किसी योग्य डॉक्टर से "
            "सलाह लें। इस बीच मैं आपकी कुंडली के अन्य पहलुओं पर बात कर सकता हूं।"
        ),
        "hinglish": (
            "Main aapki kundli se koi bimari diagnose ya predict nahi kar sakta — ye "
            "doctor ka kaam hai, astrology ka nahi. Health ko lekar chinta hai to please "
            "kisi qualified doctor se milein. Tab tak main aapki kundli ke baaki hisso "
            "pe baat kar sakta hoon."
        ),
    },
}

OUT_OF_SCOPE_MESSAGE: dict[str, str] = {
    "en": (
        "I'm your Vedic astrologer, so I can only help with your kundali and "
        "astrology — your chart, planets, dashas, remedies, and life questions "
        "read through it. Ask me anything about that and I'm happy to help!"
    ),
    "hi": (
        "मैं आपका ज्योतिषी हूं, इसलिए मैं केवल आपकी कुंडली और ज्योतिष से जुड़े सवालों में "
        "मदद कर सकता हूं — आपकी राशि, ग्रह, दशा, उपाय और जीवन से जुड़ी बातें। इनमें से "
        "कुछ भी पूछिए, मुझे मदद करके खुशी होगी!"
    ),
    "hinglish": (
        "Main aapka jyotishi hoon, isliye main sirf aapki kundali aur astrology "
        "se jude sawaalon mein madad kar sakta hoon — aapki rashi, grah, dasha, "
        "upaay aur jeevan se judi baatein. Inmein se kuch bhi poochiye!"
    ),
}

TIMEOUT_MESSAGE: dict[str, str] = {
    "en": "I'm having trouble getting your answer ready right now — please try again in a moment.",
    "hi": "अभी आपका जवाब तैयार करने में दिक्कत हो रही है — कृपया थोड़ी देर बाद फिर से कोशिश करें।",
    "hinglish": "Abhi aapka jawab taiyaar karne mein thodi dikkat ho rahi hai — please thodi der baad phir try karein.",
}

# The deterministic script-ratio hint (graph/nodes/context_assembly.py) is
# the only language signal available without a confirmed LLM-reported
# language — used wherever canned text needs to be localized without a
# second classification call. Both the safety filter and the reaper's
# timeout message route through this single mapping.
_LANGUAGE_FOR_HINT = {
    "hindi_script": "hi",
    "latin_script": "hinglish",
    "mixed_script": "hinglish",
}


def hint_to_language(language_hint: str | None) -> str:
    return _LANGUAGE_FOR_HINT.get(language_hint or "", _DEFAULT_LANGUAGE)


def get_out_of_scope_message(language: str) -> str:
    return OUT_OF_SCOPE_MESSAGE.get(language, OUT_OF_SCOPE_MESSAGE[_DEFAULT_LANGUAGE])


def get_safety_redirect(category: str, language: str) -> str:
    bank = SAFETY_REDIRECTS.get(category, SAFETY_REDIRECTS[DISEASE_DIAGNOSIS])
    return bank.get(language, bank[_DEFAULT_LANGUAGE])


def get_timeout_message(language: str) -> str:
    return TIMEOUT_MESSAGE.get(language, TIMEOUT_MESSAGE[_DEFAULT_LANGUAGE])
