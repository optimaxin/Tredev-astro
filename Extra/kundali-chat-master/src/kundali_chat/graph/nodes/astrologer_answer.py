"""Node 2 — drafts the astrologer's reply (or the first-turn greeting),
folding remedy/product-hook enrichment into the SAME LLM call rather than a
second generation pass (one call per turn, half the cost/latency). Which
hook category actually appeared is tagged afterward via a lightweight
keyword scan of the response — not a second model call.
"""

from __future__ import annotations

import json
import re
from typing import Any

from kundali_chat.graph.directives import (
    ASTROLOGER_LENS_DIRECTIVE,
    ENRICHMENT_DIRECTIVE,
    FOLLOWUP_DIRECTIVE,
    FORMAT_DIRECTIVE,
    MESSAGE_SPLIT_DELIMITER,
    OUT_OF_SCOPE_TAG,
    SCOPE_DIRECTIVE,
    answer_opening_directive,
    current_time_directive,
    greeting_directive,
    language_mirror_directive,
)
from kundali_chat.graph.state import TurnState
from kundali_chat.graph.types import NodeFn
from kundali_chat.llm.active_route import ActiveRoute, complete
from kundali_chat.llm.providers import ChatMessage, LLMProvider
from kundali_chat.safety.canned_responses import get_out_of_scope_message

_REMEDY_HOOK_RE = re.compile(
    r"\b(upaay|upay|remedy|remedies|daan|mantra|puja|vrat|fasting)\b", re.IGNORECASE
)
_PRODUCT_HOOK_RE = re.compile(r"\b(rudraksha|gemstone|ratna|gem\s*stone)\b", re.IGNORECASE)
_CONVERSION_HOOK_RE = re.compile(
    r"\b(detailed\s+report|full\s+report|paid\s+report|vistrit\s+report|complete\s+kundli)\b",
    re.IGNORECASE,
)

# "Radhe Radhe ...!" salutation at the very start of a reply — belongs only to
# the first-turn greeting. Model sometimes repeats it on follow-ups despite the
# instruction, so we strip it deterministically (plus any trailing split marker).
_LEADING_GREETING_RE = re.compile(
    r"^\s*radhe\s+radhe[^\n|.!?]*[.!?]?\s*(?:\|\|\|\s*)?",
    re.IGNORECASE,
)


def strip_leading_greeting(text: str) -> str:
    """Remove a leading 'Radhe Radhe ...' salutation (used on follow-up turns)."""
    return _LEADING_GREETING_RE.sub("", text, count=1)


def tag_hook_event(text: str) -> dict[str, bool] | None:
    """Which conversion-hook categories appeared in the response, for
    persistence/analytics — ``None`` if none fired (not every turn should)."""
    hooks = {
        "remedy": bool(_REMEDY_HOOK_RE.search(text)),
        "product": bool(_PRODUCT_HOOK_RE.search(text)),
        "conversion_nudge": bool(_CONVERSION_HOOK_RE.search(text)),
    }
    if not any(hooks.values()):
        return None
    return hooks


def _kundali_name(kundali: object) -> str:
    if isinstance(kundali, dict):
        details = kundali.get("basic_details") or {}
        if isinstance(details, dict):
            return str(details.get("name") or "")
    return ""


def kundali_source_block(kundali: object) -> str:
    """The 'source of truth' chart block for the prompt. A kundali ingested
    from an uploaded blob keeps the original report under ``raw`` — hand that
    over verbatim; otherwise serialise the structured chart."""
    raw = kundali.get("raw") if isinstance(kundali, dict) else None
    source = raw if raw else json.dumps(kundali, ensure_ascii=False)
    return (
        "## This user's kundali (source of truth — do not invent placements "
        "not present here)\n" + source
    )


def build_messages(state: TurnState) -> list[ChatMessage]:
    name = _kundali_name(state.get("kundali", {}))
    system_parts = [ASTROLOGER_LENS_DIRECTIVE]
    if state.get("is_first_turn"):
        system_parts.append(greeting_directive(name))
    else:
        system_parts.append(ENRICHMENT_DIRECTIVE)
        system_parts.append(answer_opening_directive(name))
    system_parts.append(FORMAT_DIRECTIVE)
    system_parts.append(current_time_directive())
    system_parts.append(kundali_source_block(state.get("kundali", {})))
    # Scope guard is only for real user questions; the follow-up hook applies
    # to every reply, including the first-turn greeting.
    if not state.get("is_first_turn"):
        system_parts.append(SCOPE_DIRECTIVE)
    system_parts.append(FOLLOWUP_DIRECTIVE)
    # Language goes LAST — tail placement out-pulls mid-prompt text (repo note),
    # and this must win even when recent history was in another language.
    system_parts.append(language_mirror_directive(state.get("reply_language", "hinglish")))

    messages = [ChatMessage(role="system", content="\n\n".join(system_parts))]
    for turn in state.get("message_history", []):
        # Prior assistant turns are stored with the split marker between their
        # short messages; flatten it back to newlines so the model reads clean
        # history rather than the raw delimiter.
        content = turn["content"].replace(MESSAGE_SPLIT_DELIMITER, "\n")
        messages.append(ChatMessage(role=turn["role"], content=content))  # type: ignore[arg-type]
    # Pin the language on the FINAL user turn too — the highest-salience spot,
    # so it wins even when the immediately preceding assistant turn was in a
    # different language (a system-only instruction lost to that anchoring).
    messages.append(
        ChatMessage(
            role="user",
            content=state["user_message"] + _language_tag(state.get("reply_language", "hinglish")),
        )
    )
    return messages


def _language_tag(reply_language: str) -> str:
    if reply_language == "english":
        return "\n\n[Reply in English only.]"
    return "\n\n[Reply in simple Hinglish (Hindi in Roman script).]"


def make_astrologer_answer_node(*, providers: dict[str, LLMProvider], route: ActiveRoute) -> NodeFn:
    async def astrologer_answer_node(state: TurnState) -> dict[str, Any]:
        messages = build_messages(state)
        result = await complete(route, providers, messages)
        text = result.text
        # Only the first message greets — strip a repeated salutation otherwise.
        if not state.get("is_first_turn"):
            text = strip_leading_greeting(text)
        # Scope guard: if the model flagged the question as off-topic, replace
        # the whole reply with a localized polite refusal (never leak an
        # off-topic answer, even a partial one).
        if OUT_OF_SCOPE_TAG in text:
            lang = "en" if state.get("reply_language") == "english" else "hinglish"
            text = get_out_of_scope_message(lang)
        return {
            "draft_answer": text,
            "llm_provider": result.provider_id,
            "llm_model": result.model_id,
            "prompt_tokens": result.usage.prompt_tokens,
            "completion_tokens": result.usage.completion_tokens,
            "latency_ms": result.latency_ms,
            "hook_event": tag_hook_event(text),
        }

    return astrologer_answer_node
