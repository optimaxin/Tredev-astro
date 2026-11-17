"""End-to-end through the compiled graph with a fake provider — proves the
3 nodes are actually wired together correctly, not just individually correct."""

from __future__ import annotations

import pytest

from kundali_chat.graph.turn import build_turn_graph
from kundali_chat.llm.active_route import ActiveRoute
from kundali_chat.llm.providers import ChatResult, TokenUsage
from kundali_chat.safety.lifespan_death_detector import LIFESPAN_OR_DEATH


class _FakeProvider:
    provider_id = "gemini"

    def __init__(self, texts: list[str]) -> None:
        self._texts = texts
        self.call_count = 0

    async def chat(self, messages, *, model, max_tokens, temperature):
        text = self._texts[min(self.call_count, len(self._texts) - 1)]
        self.call_count += 1
        return ChatResult(
            text=text,
            usage=TokenUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            latency_ms=5,
            provider_id=self.provider_id,
            model_id=model,
        )


_ROUTE = ActiveRoute(provider="gemini", model="m", max_tokens=500, temperature=0.4)


@pytest.mark.asyncio
async def test_safe_answer_flows_through_end_to_end():
    provider = _FakeProvider(["Aapka lagna Simha hai, career strong dikh raha hai."])
    graph = build_turn_graph(providers={"gemini": provider}, route=_ROUTE)

    result = await graph.ainvoke(
        {
            "session_id": "s1",
            "user_message": "career kaisa rahega?",
            "kundali": {"lagna_chart": {}},
            "message_history": [],
        }
    )

    assert result["final_answer"] == "Aapka lagna Simha hai, career strong dikh raha hai."
    assert result["safety_flag"] is None
    assert result["is_first_turn"] is True


@pytest.mark.asyncio
async def test_unsafe_answer_never_reaches_final_answer():
    unsafe = "Shani dasha se pata chalta hai ki aap kab marunga."
    provider = _FakeProvider([unsafe, unsafe])  # draft, then regen (still unsafe)
    graph = build_turn_graph(providers={"gemini": provider}, route=_ROUTE)

    result = await graph.ainvoke(
        {
            "session_id": "s1",
            "user_message": "main kab marunga?",
            "kundali": {},
            "message_history": [],
        }
    )

    assert result["final_answer"] != unsafe
    assert result["safety_flag"] == LIFESPAN_OR_DEATH
