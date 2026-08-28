"""Node 2 against a fake LLM provider — no real network, no real graph."""

from __future__ import annotations

import pytest

from kundali_chat.graph.nodes.astrologer_answer import (
    build_messages,
    make_astrologer_answer_node,
    strip_leading_greeting,
    tag_hook_event,
)
from kundali_chat.llm.active_route import ActiveRoute
from kundali_chat.llm.providers import ChatResult, TokenUsage


class _FakeProvider:
    provider_id = "gemini"

    def __init__(self, text: str) -> None:
        self._text = text
        self.received_messages = None

    async def chat(self, messages, *, model, max_tokens, temperature):
        self.received_messages = messages
        return ChatResult(
            text=self._text,
            usage=TokenUsage(prompt_tokens=100, completion_tokens=50, total_tokens=150),
            latency_ms=200,
            provider_id=self.provider_id,
            model_id=model,
        )


def _state(**overrides):
    base = {
        "session_id": "s1",
        "user_message": "mera career kaisa rahega?",
        "kundali": {"lagna_chart": {"planets": []}},
        "message_history": [],
        "is_first_turn": False,
        "language_hint": "latin_script",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_calls_provider_and_returns_telemetry():
    provider = _FakeProvider("Aapka career achha rahega Guru ki dasha mein.")
    route = ActiveRoute(
        provider="gemini", model="gemini-2.5-flash", max_tokens=500, temperature=0.4
    )
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state())

    assert result["draft_answer"] == "Aapka career achha rahega Guru ki dasha mein."
    assert result["llm_provider"] == "gemini"
    assert result["prompt_tokens"] == 100
    assert result["completion_tokens"] == 50
    assert result["latency_ms"] == 200


def test_strip_leading_greeting_removes_repeated_salutation():
    assert strip_leading_greeting("Radhe Radhe Dev!|||Aapka career...") == "Aapka career..."
    assert strip_leading_greeting("Radhe Radhe! It's great.") == "It's great."
    # no greeting -> unchanged
    assert strip_leading_greeting("Aapka lagna Simha hai.") == "Aapka lagna Simha hai."


@pytest.mark.asyncio
async def test_followup_strips_repeated_greeting():
    provider = _FakeProvider("Radhe Radhe Dev!|||Aapka career achha rahega.")
    route = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state(is_first_turn=False))
    assert not result["draft_answer"].lower().startswith("radhe radhe")
    assert "Aapka career achha rahega." in result["draft_answer"]


@pytest.mark.asyncio
async def test_out_of_scope_question_returns_polite_refusal():
    from kundali_chat.graph.directives import OUT_OF_SCOPE_TAG

    # model flags the off-topic question with the tag
    provider = _FakeProvider(OUT_OF_SCOPE_TAG)
    route = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state(is_first_turn=False, reply_language="english"))
    assert OUT_OF_SCOPE_TAG not in result["draft_answer"]
    assert "astrolog" in result["draft_answer"].lower()  # the canned refusal


def test_build_messages_includes_scope_guard_on_followup():
    from kundali_chat.graph.directives import OUT_OF_SCOPE_TAG

    messages = build_messages(_state(is_first_turn=False))
    assert "strictly within astrology" in messages[0].content
    assert OUT_OF_SCOPE_TAG in messages[0].content
    # greeting turn should NOT carry the scope guard
    greeting = build_messages(_state(is_first_turn=True))
    assert "strictly within astrology" not in greeting[0].content


@pytest.mark.asyncio
async def test_first_turn_keeps_greeting():
    provider = _FakeProvider("Radhe Radhe Dev!|||Aapka lagna Simha hai.")
    route = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state(is_first_turn=True))
    assert result["draft_answer"].lower().startswith("radhe radhe")


@pytest.mark.asyncio
async def test_no_hook_tagged_for_plain_answer():
    provider = _FakeProvider("Aapka lagna Simha hai aur career strong dikh raha hai.")
    route = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state())

    assert result["hook_event"] is None


@pytest.mark.asyncio
async def test_hook_tagged_when_remedy_and_product_mentioned():
    provider = _FakeProvider(
        "Aapko Shani ke liye ek upaay karna chahiye, aur rudraksha pehenna bhi accha rahega."
    )
    route = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)
    node = make_astrologer_answer_node(providers={"gemini": provider}, route=route)

    result = await node(_state())

    assert result["hook_event"] == {"remedy": True, "product": True, "conversion_nudge": False}


def test_build_messages_includes_greeting_directive_on_first_turn():
    messages = build_messages(_state(is_first_turn=True))
    assert "First message" in messages[0].content


def test_greeting_opens_with_radhe_radhe_and_user_name():
    messages = build_messages(
        _state(is_first_turn=True, kundali={"basic_details": {"name": "Ravi"}})
    )
    assert "Radhe Radhe Ravi" in messages[0].content


def test_build_messages_includes_enrichment_directive_on_followup():
    messages = build_messages(_state(is_first_turn=False))
    assert "Remedies" in messages[0].content


def test_build_messages_includes_format_directive_with_split_marker():
    from kundali_chat.graph.directives import MESSAGE_SPLIT_DELIMITER

    messages = build_messages(_state())
    assert MESSAGE_SPLIT_DELIMITER in messages[0].content
    assert "short messages" in messages[0].content.lower()


def test_build_messages_includes_followup_hook_on_every_reply():
    # follow-up hook applies to both the greeting and follow-up turns
    assert "your hook" in build_messages(_state(is_first_turn=False))[0].content.lower()
    assert "your hook" in build_messages(_state(is_first_turn=True))[0].content.lower()


def test_followup_directive_offers_remedies_for_dosha():
    from kundali_chat.graph.directives import FOLLOWUP_DIRECTIVE

    assert "remed" in FOLLOWUP_DIRECTIVE.lower()
    assert "dosha" in FOLLOWUP_DIRECTIVE.lower()


def test_build_messages_flattens_split_marker_in_assistant_history():
    from kundali_chat.graph.directives import MESSAGE_SPLIT_DELIMITER

    messages = build_messages(
        _state(
            message_history=[
                {"role": "assistant", "content": f"one{MESSAGE_SPLIT_DELIMITER}two"},
            ]
        )
    )
    assistant_turn = messages[1]
    assert MESSAGE_SPLIT_DELIMITER not in assistant_turn.content
    assert assistant_turn.content == "one\ntwo"


def test_build_messages_uses_raw_kundali_text_verbatim():
    messages = build_messages(
        _state(kundali={"raw": "Lagna Mesha, Moon Vrishabha, Shukra Mahadasha.", "basic_details": {}})
    )
    system = messages[0].content
    assert "Lagna Mesha, Moon Vrishabha, Shukra Mahadasha." in system
    # raw text is handed over as-is, not JSON-escaped
    assert '{"raw"' not in system


def test_build_messages_ends_with_user_message():
    messages = build_messages(_state(user_message="mera career kaisa hoga"))
    assert messages[-1].role == "user"
    assert messages[-1].content.startswith("mera career kaisa hoga")


def test_build_messages_pins_language_on_final_user_turn():
    en = build_messages(_state(user_message="When will I get a job?", reply_language="english"))
    assert "Reply in English only" in en[-1].content
    hi = build_messages(_state(user_message="naukri kab lagegi", reply_language="hinglish"))
    assert "Hinglish" in hi[-1].content


def test_build_messages_includes_history_between_system_and_user():
    messages = build_messages(
        _state(
            message_history=[
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "namaste"},
            ]
        )
    )
    roles = [m.role for m in messages]
    assert roles == ["system", "user", "assistant", "user"]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Just a plain career answer with no hooks.", None),
        (
            "Try this mantra as an upaay.",
            {"remedy": True, "product": False, "conversion_nudge": False},
        ),
        (
            "A rudraksha would suit you.",
            {"remedy": False, "product": True, "conversion_nudge": False},
        ),
        (
            "Our detailed report covers this in depth.",
            {"remedy": False, "product": False, "conversion_nudge": True},
        ),
    ],
)
def test_tag_hook_event(text, expected):
    assert tag_hook_event(text) == expected
