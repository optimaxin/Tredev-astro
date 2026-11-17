"""Node 3 — the last line of defense. The original unsafe draft must never
ship, whether the regen succeeds, fails to fix it, or the regen call itself
errors."""

from __future__ import annotations

import pytest

from kundali_chat.graph.nodes.safety_filter import make_safety_filter_node
from kundali_chat.llm.active_route import ActiveRoute
from kundali_chat.llm.providers import ChatResult, TokenUsage, TransientProviderError
from kundali_chat.safety.lifespan_death_detector import DISEASE_DIAGNOSIS, LIFESPAN_OR_DEATH


class _FakeProvider:
    provider_id = "gemini"

    def __init__(self, texts: list[str] | None = None, error: Exception | None = None) -> None:
        self._texts = texts or []
        self._error = error
        self.call_count = 0

    async def chat(self, messages, *, model, max_tokens, temperature):
        self.call_count += 1
        if self._error is not None:
            raise self._error
        text = self._texts[min(self.call_count - 1, len(self._texts) - 1)]
        return ChatResult(
            text=text,
            usage=TokenUsage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
            latency_ms=10,
            provider_id=self.provider_id,
            model_id=model,
        )


_ROUTE = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)


def _state(draft_answer: str, **overrides):
    base = {
        "user_message": "kab marunga main?",
        "draft_answer": draft_answer,
        "language_hint": "latin_script",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_safe_draft_passes_through_unchanged():
    provider = _FakeProvider()
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state("Aapka career achha rahega is dasha mein."))

    assert result["final_answer"] == "Aapka career achha rahega is dasha mein."
    assert result["safety_flag"] is None
    assert provider.call_count == 0


@pytest.mark.asyncio
async def test_regen_succeeds_and_ships_the_regenerated_text():
    unsafe = "Shani dasha se pata chalta hai ki aap kab marunga."
    safe_regen = (
        "Main aapko lifespan ya death ka time nahi bata sakta, lekin remedies bata sakta hoon."
    )
    provider = _FakeProvider(texts=[safe_regen])
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state(unsafe))

    assert result["final_answer"] == safe_regen
    assert result["safety_flag"] is None
    assert result["regenerated"] is True
    assert provider.call_count == 1


@pytest.mark.asyncio
async def test_regen_still_unsafe_ships_canned_redirect_not_the_draft():
    unsafe = "Shani dasha se pata chalta hai ki aap kab marunga."
    still_unsafe = "Mangal dasha bhi indicate karta hai ki aap kab marunga."
    provider = _FakeProvider(texts=[still_unsafe])
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state(unsafe))

    assert result["safety_flag"] == LIFESPAN_OR_DEATH
    assert result["final_answer"] != unsafe
    assert result["final_answer"] != still_unsafe


@pytest.mark.asyncio
async def test_regen_provider_failure_ships_canned_redirect_not_the_draft():
    unsafe = "Mars placement causes cancer in your chart, doctors indicate."
    provider = _FakeProvider(error=TransientProviderError("provider down"))
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state(unsafe))

    assert result["safety_flag"] == DISEASE_DIAGNOSIS
    assert result["final_answer"] != unsafe


@pytest.mark.asyncio
async def test_canned_redirect_is_hinglish_for_hinglish_user():
    unsafe = "Shani dasha se pata chalta hai ki aap kab marunga."
    provider = _FakeProvider(texts=[unsafe])  # regen keeps failing
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state(unsafe, reply_language="hinglish"))

    assert "nahi bata sakta" in result["final_answer"]


@pytest.mark.asyncio
async def test_canned_redirect_is_english_for_english_user():
    unsafe = "Shani dasha se pata chalta hai ki aap kab marunga."
    provider = _FakeProvider(texts=[unsafe])  # regen keeps failing
    node = make_safety_filter_node(providers={"gemini": provider}, route=_ROUTE)

    result = await node(_state(unsafe, reply_language="english"))

    assert "can't predict" in result["final_answer"]
