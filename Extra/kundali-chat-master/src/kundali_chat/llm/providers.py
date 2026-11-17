"""LLM provider contract + the two concrete adapters (Gemini, Sarvam).

Mirrors ai-core's "every provider exposes one OpenAI-ish ``chat()`` method"
shape (``ai_core.llm.providers.base``), trimmed to what this service needs —
no tool-calling, no JSON-mode, no prompt-cache breakpoints, since the
astrologer-answer node makes exactly one kind of call.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

import httpx

Role = Literal["system", "user", "assistant"]
_VALID_ROLES = ("system", "user", "assistant")


@dataclass(frozen=True, slots=True)
class ChatMessage:
    role: Role
    content: str

    def __post_init__(self) -> None:
        if self.role not in _VALID_ROLES:
            raise ValueError(f"role must be one of {_VALID_ROLES}, got {self.role!r}")


@dataclass(frozen=True, slots=True)
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True, slots=True)
class ChatResult:
    """Normalised response shape — the graph node + message telemetry columns
    consume this, never a provider-specific response object."""

    text: str
    usage: TokenUsage
    latency_ms: int
    provider_id: str
    model_id: str
    finish_reason: str | None = None


class ProviderError(Exception):
    """Base class. Catch this when you want to know an LLM call failed."""


class TransientProviderError(ProviderError):
    """Retry/fallback-eligible: 5xx, rate limit (429), timeout, connection reset."""


class PermanentProviderError(ProviderError):
    """Give-up-immediately: 4xx auth, malformed request, invalid model id,
    missing API key."""


class LLMProvider(ABC):
    """One method. Concrete subclasses set ``provider_id``."""

    provider_id: str = ""

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str,
        max_tokens: int,
        temperature: float,
    ) -> ChatResult:
        """Execute one chat-completion request. Raises ProviderError on failure."""
        raise NotImplementedError


class GeminiProvider(LLMProvider):
    """Google Gemini via the REST ``generateContent`` endpoint."""

    provider_id = "gemini"
    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    def __init__(
        self, api_key: str, *, timeout_s: float = 20.0, base_url: str | None = None
    ) -> None:
        self._api_key = api_key
        self._timeout_s = timeout_s
        self._base_url = base_url or self._BASE_URL

    async def chat(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int, temperature: float
    ) -> ChatResult:
        system_parts = [m.content for m in messages if m.role == "system"]
        contents = [
            {"role": "model" if m.role == "assistant" else "user", "parts": [{"text": m.content}]}
            for m in messages
            if m.role != "system"
        ]
        body: dict = {
            "contents": contents,
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
        }
        if system_parts:
            body["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_parts)}]}

        url = f"{self._base_url}/models/{model}:generateContent"
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(url, params={"key": self._api_key}, json=body)
        except httpx.TimeoutException as exc:
            raise TransientProviderError(f"gemini timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise TransientProviderError(f"gemini transport error: {exc}") from exc
        latency_ms = int((time.monotonic() - start) * 1000)

        _raise_for_status(resp, provider="gemini")

        data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise TransientProviderError("gemini returned no candidates")
        candidate = candidates[0]
        parts = candidate.get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        usage_meta = data.get("usageMetadata", {})
        usage = TokenUsage(
            prompt_tokens=usage_meta.get("promptTokenCount", 0),
            completion_tokens=usage_meta.get("candidatesTokenCount", 0),
            total_tokens=usage_meta.get("totalTokenCount", 0),
        )
        return ChatResult(
            text=text,
            usage=usage,
            latency_ms=latency_ms,
            provider_id=self.provider_id,
            model_id=model,
            finish_reason=candidate.get("finishReason"),
        )


class SarvamProvider(LLMProvider):
    """Sarvam AI via its OpenAI-compatible ``chat/completions`` endpoint."""

    provider_id = "sarvam"
    _BASE_URL = "https://api.sarvam.ai/v1"

    def __init__(
        self, api_key: str, *, timeout_s: float = 20.0, base_url: str | None = None
    ) -> None:
        self._api_key = api_key
        self._timeout_s = timeout_s
        self._base_url = base_url or self._BASE_URL

    async def chat(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int, temperature: float
    ) -> ChatResult:
        body = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        headers = {"api-subscription-key": self._api_key}
        url = f"{self._base_url}/chat/completions"
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(url, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise TransientProviderError(f"sarvam timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise TransientProviderError(f"sarvam transport error: {exc}") from exc
        latency_ms = int((time.monotonic() - start) * 1000)

        _raise_for_status(resp, provider="sarvam")

        data = resp.json()
        choice = (data.get("choices") or [{}])[0]
        text = choice.get("message", {}).get("content", "")
        usage_raw = data.get("usage", {})
        usage = TokenUsage(
            prompt_tokens=usage_raw.get("prompt_tokens", 0),
            completion_tokens=usage_raw.get("completion_tokens", 0),
            total_tokens=usage_raw.get("total_tokens", 0),
        )
        return ChatResult(
            text=text,
            usage=usage,
            latency_ms=latency_ms,
            provider_id=self.provider_id,
            model_id=model,
            finish_reason=choice.get("finish_reason"),
        )


class OpenRouterProvider(LLMProvider):
    """OpenRouter via its OpenAI-compatible ``chat/completions`` endpoint.

    Same response shape as Sarvam (standard OpenAI ``choices``/``usage``); the
    only differences are the base URL and ``Authorization: Bearer`` auth."""

    provider_id = "openrouter"
    _BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(
        self, api_key: str, *, timeout_s: float = 20.0, base_url: str | None = None
    ) -> None:
        self._api_key = api_key
        self._timeout_s = timeout_s
        self._base_url = base_url or self._BASE_URL

    async def chat(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int, temperature: float
    ) -> ChatResult:
        body = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            # Disable "thinking"/reasoning tokens — this chat is a single
            # low-latency completion, and reasoning adds seconds + cost for no
            # gain here. Providers that don't support it ignore this key.
            "reasoning": {"enabled": False},
        }
        headers = {"Authorization": f"Bearer {self._api_key}"}
        url = f"{self._base_url}/chat/completions"
        start = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                resp = await client.post(url, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise TransientProviderError(f"openrouter timeout: {exc}") from exc
        except httpx.HTTPError as exc:
            raise TransientProviderError(f"openrouter transport error: {exc}") from exc
        latency_ms = int((time.monotonic() - start) * 1000)

        _raise_for_status(resp, provider="openrouter")

        data = resp.json()
        choice = (data.get("choices") or [{}])[0]
        text = choice.get("message", {}).get("content", "")
        finish = choice.get("finish_reason")
        # OpenRouter intermittently returns HTTP 200 with finish_reason="error"
        # (or a top-level error) and PARTIAL/empty content — an upstream hiccup.
        # Treat it as transient so the caller retries instead of shipping a
        # truncated reply. (finish_reason="length" is a real completion, allowed.)
        if data.get("error") or finish == "error" or not text.strip():
            raise TransientProviderError(
                f"openrouter incomplete response (finish_reason={finish})"
            )
        usage_raw = data.get("usage", {})
        usage = TokenUsage(
            prompt_tokens=usage_raw.get("prompt_tokens", 0),
            completion_tokens=usage_raw.get("completion_tokens", 0),
            total_tokens=usage_raw.get("total_tokens", 0),
        )
        return ChatResult(
            text=text,
            usage=usage,
            latency_ms=latency_ms,
            provider_id=self.provider_id,
            model_id=model,
            finish_reason=finish,
        )


class MockProvider(LLMProvider):
    """Zero-network canned-reply provider — lets the full turn pipeline
    (graph, safety filter, persistence, polling) run locally with no LLM API
    key configured. Not for production use."""

    provider_id = "mock"

    async def chat(
        self, messages: list[ChatMessage], *, model: str, max_tokens: int, temperature: float
    ) -> ChatResult:
        user_text = next((m.content for m in reversed(messages) if m.role == "user"), "")
        text = (
            "Radhe Radhe! Yeh ek mock astrologer reply hai (no real LLM key "
            f"configured). Aapne poocha: \"{user_text[:200]}\""
        )
        return ChatResult(
            text=text,
            usage=TokenUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency_ms=0,
            provider_id=self.provider_id,
            model_id=model,
            finish_reason="stop",
        )


def _raise_for_status(resp: httpx.Response, *, provider: str) -> None:
    if resp.status_code in (400, 401, 403, 404):
        raise PermanentProviderError(f"{provider} {resp.status_code}: {resp.text[:300]}")
    if resp.status_code == 429 or resp.status_code >= 500:
        raise TransientProviderError(f"{provider} {resp.status_code}: {resp.text[:300]}")
    resp.raise_for_status()


def build_provider(
    provider_name: str,
    *,
    gemini_api_key: str | None,
    sarvam_api_key: str | None,
    openrouter_api_key: str | None = None,
) -> LLMProvider:
    """The one-line-per-provider factory selected once at startup by
    ``LLM__PROVIDER``. See ``active_route.py`` for why this stays a plain
    if/else rather than a registry — a few providers doesn't earn one."""
    if provider_name == "gemini":
        if not gemini_api_key:
            raise PermanentProviderError("LLM__GEMINI_API_KEY is required for provider=gemini")
        return GeminiProvider(gemini_api_key)
    if provider_name == "sarvam":
        if not sarvam_api_key:
            raise PermanentProviderError("LLM__SARVAM_API_KEY is required for provider=sarvam")
        return SarvamProvider(sarvam_api_key)
    if provider_name == "openrouter":
        if not openrouter_api_key:
            raise PermanentProviderError(
                "LLM__OPENROUTER_API_KEY is required for provider=openrouter"
            )
        return OpenRouterProvider(openrouter_api_key)
    if provider_name == "mock":
        return MockProvider()
    raise PermanentProviderError(f"unknown LLM provider: {provider_name!r}")
