"""Provider adapters against a mocked HTTP transport — no real network calls."""

from __future__ import annotations

import httpx
import pytest

from kundali_chat.llm.providers import (
    ChatMessage,
    GeminiProvider,
    OpenRouterProvider,
    PermanentProviderError,
    SarvamProvider,
    TransientProviderError,
    build_provider,
)

_RealAsyncClient = httpx.AsyncClient


def _client_factory(handler):
    def _make(*args, **kwargs):
        kwargs.pop("transport", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return _make


@pytest.mark.asyncio
async def test_gemini_parses_successful_response(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [{"text": "Namaste! "}, {"text": "Aapka lagna Aries hai."}]
                        },
                        "finishReason": "STOP",
                    }
                ],
                "usageMetadata": {
                    "promptTokenCount": 120,
                    "candidatesTokenCount": 40,
                    "totalTokenCount": 160,
                },
            },
        )

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = GeminiProvider("fake-key")

    result = await provider.chat(
        [
            ChatMessage(role="system", content="be an astrologer"),
            ChatMessage(role="user", content="hi"),
        ],
        model="gemini-2.5-flash",
        max_tokens=500,
        temperature=0.4,
    )

    assert result.text == "Namaste! Aapka lagna Aries hai."
    assert result.usage.prompt_tokens == 120
    assert result.usage.completion_tokens == 40
    assert result.provider_id == "gemini"
    assert result.finish_reason == "STOP"


@pytest.mark.asyncio
async def test_gemini_maps_auth_error_to_permanent(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="invalid api key")

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = GeminiProvider("bad-key")

    with pytest.raises(PermanentProviderError):
        await provider.chat(
            [ChatMessage(role="user", content="hi")],
            model="gemini-2.5-flash",
            max_tokens=100,
            temperature=0.4,
        )


@pytest.mark.asyncio
async def test_gemini_maps_rate_limit_to_transient(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, text="rate limited")

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = GeminiProvider("key")

    with pytest.raises(TransientProviderError):
        await provider.chat(
            [ChatMessage(role="user", content="hi")],
            model="gemini-2.5-flash",
            max_tokens=100,
            temperature=0.4,
        )


@pytest.mark.asyncio
async def test_sarvam_parses_successful_response(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": "Aapki kundali mein..."}, "finish_reason": "stop"}
                ],
                "usage": {"prompt_tokens": 90, "completion_tokens": 30, "total_tokens": 120},
            },
        )

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = SarvamProvider("fake-key")

    result = await provider.chat(
        [ChatMessage(role="user", content="mera rashi kya hai")],
        model="sarvam-2b",
        max_tokens=300,
        temperature=0.4,
    )

    assert result.text == "Aapki kundali mein..."
    assert result.usage.total_tokens == 120
    assert result.provider_id == "sarvam"


@pytest.mark.asyncio
async def test_openrouter_parses_successful_response_and_sends_bearer_auth(
    monkeypatch: pytest.MonkeyPatch,
):
    seen: dict[str, str] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers.get("authorization", "")
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": "Namaste! Aapka lagna..."}, "finish_reason": "stop"}
                ],
                "usage": {"prompt_tokens": 80, "completion_tokens": 25, "total_tokens": 105},
            },
        )

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = OpenRouterProvider("fake-key")

    result = await provider.chat(
        [ChatMessage(role="user", content="mera lagna kya hai")],
        model="google/gemini-2.5-flash",
        max_tokens=300,
        temperature=0.4,
    )

    assert result.text == "Namaste! Aapka lagna..."
    assert result.usage.total_tokens == 105
    assert result.provider_id == "openrouter"
    assert result.model_id == "google/gemini-2.5-flash"
    assert seen["auth"] == "Bearer fake-key"


@pytest.mark.asyncio
async def test_openrouter_error_finish_reason_is_transient(monkeypatch: pytest.MonkeyPatch):
    # HTTP 200 but partial content + finish_reason "error" (OpenRouter hiccup).
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "Rad"}, "finish_reason": "error"}],
                "usage": {"prompt_tokens": 10, "completion_tokens": 0, "total_tokens": 10},
            },
        )

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = OpenRouterProvider("k")

    with pytest.raises(TransientProviderError):
        await provider.chat(
            [ChatMessage(role="user", content="hi")],
            model="google/gemini-2.5-flash",
            max_tokens=1200,
            temperature=0.4,
        )


@pytest.mark.asyncio
async def test_openrouter_maps_auth_error_to_permanent(monkeypatch: pytest.MonkeyPatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="invalid key")

    monkeypatch.setattr(httpx, "AsyncClient", _client_factory(handler))
    provider = OpenRouterProvider("bad-key")

    with pytest.raises(PermanentProviderError):
        await provider.chat(
            [ChatMessage(role="user", content="hi")],
            model="google/gemini-2.5-flash",
            max_tokens=100,
            temperature=0.4,
        )


def test_build_provider_selects_gemini():
    provider = build_provider("gemini", gemini_api_key="k", sarvam_api_key=None)
    assert provider.provider_id == "gemini"


def test_build_provider_selects_sarvam():
    provider = build_provider("sarvam", gemini_api_key=None, sarvam_api_key="k")
    assert provider.provider_id == "sarvam"


def test_build_provider_selects_openrouter():
    provider = build_provider(
        "openrouter", gemini_api_key=None, sarvam_api_key=None, openrouter_api_key="k"
    )
    assert provider.provider_id == "openrouter"


def test_build_provider_missing_key_raises_permanent_error():
    with pytest.raises(PermanentProviderError):
        build_provider("gemini", gemini_api_key=None, sarvam_api_key=None)


def test_build_provider_openrouter_missing_key_raises_permanent_error():
    with pytest.raises(PermanentProviderError):
        build_provider("openrouter", gemini_api_key=None, sarvam_api_key=None)


def test_build_provider_unknown_name_raises_permanent_error():
    with pytest.raises(PermanentProviderError):
        build_provider("openai", gemini_api_key="k", sarvam_api_key="k")
