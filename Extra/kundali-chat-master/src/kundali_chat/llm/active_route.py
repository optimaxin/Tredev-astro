"""Single env-driven active LLM route — deliberately NOT a routing table.

ai-core's ``ROUTE_TABLE`` (``ai_core.llm.routing``) earns its complexity from
many genuinely different jobs needing different models (classifier vs.
composer vs. judge). This service has exactly one job — astrologer
completion — so a table keyed on one row would be pure ceremony. "Pluggable
via config" and "designed for A/B" are satisfied by making the *active*
provider/model an env var (``LLM__PROVIDER`` / ``LLM__MODEL``), flippable
per environment/overlay.

Promote this to a table only if a second real axis of variation (e.g.
per-language model choice) actually appears — don't pre-build it.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import TYPE_CHECKING

from kundali_chat.llm.providers import ChatMessage, ChatResult, LLMProvider, TransientProviderError

if TYPE_CHECKING:
    from kundali_chat.config import LLMSettings


@dataclass(frozen=True, slots=True)
class ActiveRoute:
    provider: str
    model: str
    max_tokens: int
    temperature: float
    fallback_provider: str | None = None
    fallback_model: str | None = None


def get_active_route(settings: LLMSettings) -> ActiveRoute:
    return ActiveRoute(
        provider=settings.provider,
        model=settings.model,
        max_tokens=settings.max_tokens,
        temperature=settings.temperature,
        fallback_provider=settings.fallback_provider,
        fallback_model=settings.fallback_model,
    )


# Transient errors include OpenRouter's intermittent partial/"error" responses
# (HTTP 200 with finish_reason="error" — an upstream Google/OpenRouter blip that
# can spike to a high rate). They clear on retry, so retry the SAME provider
# several times with a short backoff before giving up / falling back.
_PRIMARY_ATTEMPTS = 5
_RETRY_BACKOFF_S = 0.4


async def complete(
    route: ActiveRoute,
    providers: dict[str, LLMProvider],
    messages: list[ChatMessage],
) -> ChatResult:
    """Call the active provider (retrying a few times on transient errors); on
    a persistent transient failure, try the configured fallback once. Re-raises
    if no fallback is configured or the fallback also fails."""
    primary = providers[route.provider]
    last_exc: TransientProviderError | None = None
    for attempt in range(_PRIMARY_ATTEMPTS):
        try:
            return await primary.chat(
                messages,
                model=route.model,
                max_tokens=route.max_tokens,
                temperature=route.temperature,
            )
        except TransientProviderError as exc:
            last_exc = exc
            if attempt < _PRIMARY_ATTEMPTS - 1:
                await asyncio.sleep(_RETRY_BACKOFF_S)

    if route.fallback_provider is None or route.fallback_model is None:
        raise last_exc  # type: ignore[misc]  # set after at least one attempt
    fallback = providers[route.fallback_provider]
    return await fallback.chat(
        messages,
        model=route.fallback_model,
        max_tokens=route.max_tokens,
        temperature=route.temperature,
    )
