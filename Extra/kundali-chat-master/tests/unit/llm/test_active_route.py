"""ActiveRoute.complete() fallback behavior against fake providers (no HTTP)."""

from __future__ import annotations

import pytest

from kundali_chat.llm.active_route import ActiveRoute, complete
from kundali_chat.llm.providers import ChatMessage, ChatResult, TokenUsage, TransientProviderError


class _FakeProvider:
    def __init__(
        self, *, provider_id: str, result: ChatResult | None = None, error: Exception | None = None
    ):
        self.provider_id = provider_id
        self._result = result
        self._error = error
        self.calls: list[str] = []

    async def chat(self, messages, *, model, max_tokens, temperature):
        self.calls.append(model)
        if self._error is not None:
            raise self._error
        return self._result


def _result(provider_id: str) -> ChatResult:
    return ChatResult(
        text="ok",
        usage=TokenUsage(prompt_tokens=1, completion_tokens=1, total_tokens=2),
        latency_ms=10,
        provider_id=provider_id,
        model_id="m",
    )


@pytest.mark.asyncio
async def test_uses_primary_on_success():
    primary = _FakeProvider(provider_id="gemini", result=_result("gemini"))
    route = ActiveRoute(
        provider="gemini", model="gemini-2.5-flash", max_tokens=500, temperature=0.4
    )

    result = await complete(route, {"gemini": primary}, [ChatMessage(role="user", content="hi")])

    assert result.provider_id == "gemini"
    assert primary.calls == ["gemini-2.5-flash"]


class _FlakyProvider:
    """Fails with a transient error the first ``fail_times`` calls, then succeeds."""

    def __init__(self, *, provider_id: str, fail_times: int):
        self.provider_id = provider_id
        self._fail_times = fail_times
        self.calls = 0

    async def chat(self, messages, *, model, max_tokens, temperature):
        self.calls += 1
        if self.calls <= self._fail_times:
            raise TransientProviderError("transient blip")
        return _result(self.provider_id)


@pytest.mark.asyncio
async def test_retries_same_provider_on_transient_then_succeeds():
    primary = _FlakyProvider(provider_id="openrouter", fail_times=2)
    route = ActiveRoute(provider="openrouter", model="m", max_tokens=500, temperature=0.4)

    result = await complete(route, {"openrouter": primary}, [ChatMessage(role="user", content="hi")])

    assert result.provider_id == "openrouter"
    assert primary.calls == 3  # 2 transient failures + 1 success


@pytest.mark.asyncio
async def test_falls_back_once_on_transient_error():
    primary = _FakeProvider(provider_id="gemini", error=TransientProviderError("rate limited"))
    fallback = _FakeProvider(provider_id="sarvam", result=_result("sarvam"))
    route = ActiveRoute(
        provider="gemini",
        model="gemini-2.5-flash",
        max_tokens=500,
        temperature=0.4,
        fallback_provider="sarvam",
        fallback_model="sarvam-2b",
    )

    result = await complete(
        route, {"gemini": primary, "sarvam": fallback}, [ChatMessage(role="user", content="hi")]
    )

    assert result.provider_id == "sarvam"
    assert fallback.calls == ["sarvam-2b"]


@pytest.mark.asyncio
async def test_reraises_when_no_fallback_configured():
    primary = _FakeProvider(provider_id="gemini", error=TransientProviderError("down"))
    route = ActiveRoute(
        provider="gemini", model="gemini-2.5-flash", max_tokens=500, temperature=0.4
    )

    with pytest.raises(TransientProviderError):
        await complete(route, {"gemini": primary}, [ChatMessage(role="user", content="hi")])
