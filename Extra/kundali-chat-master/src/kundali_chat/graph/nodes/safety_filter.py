"""Node 3 — deterministic safety gate, the last line of defense before a
reply ships. One regen attempt with a repair-hint directive; if the
detector still fires (or the regen call itself fails), ship a canned
localized redirect — never the original unsafe draft.
"""

from __future__ import annotations

from typing import Any

from kundali_chat.graph.directives import (
    ASTROLOGER_LENS_DIRECTIVE,
    FORMAT_DIRECTIVE,
    MESSAGE_SPLIT_DELIMITER,
    SAFETY_REPAIR_DIRECTIVE,
    language_mirror_directive,
)
from kundali_chat.graph.nodes.astrologer_answer import kundali_source_block
from kundali_chat.graph.state import TurnState
from kundali_chat.graph.types import NodeFn
from kundali_chat.llm.active_route import ActiveRoute, complete
from kundali_chat.llm.providers import ChatMessage, LLMProvider, ProviderError
from kundali_chat.safety.canned_responses import get_safety_redirect
from kundali_chat.safety.lifespan_death_detector import detect_unsafe_prediction


def _canned_language(reply_language: str) -> str:
    """Map the reply language to the canned-text bank key (en / hinglish)."""
    return "en" if reply_language == "english" else "hinglish"


def make_safety_filter_node(*, providers: dict[str, LLMProvider], route: ActiveRoute) -> NodeFn:
    async def safety_filter_node(state: TurnState) -> dict[str, Any]:
        draft = state.get("draft_answer", "")
        category = detect_unsafe_prediction(draft)
        if category is None:
            return {"final_answer": draft, "safety_flag": None}

        regen_text, regen_category = await _attempt_regen(
            providers, route, state, fallback_category=category
        )
        if regen_category is None:
            return {"final_answer": regen_text, "safety_flag": None, "regenerated": True}

        language = _canned_language(state.get("reply_language", "hinglish"))
        return {
            "final_answer": get_safety_redirect(regen_category, language),
            "safety_flag": regen_category,
            "regenerated": True,
        }

    return safety_filter_node


async def _attempt_regen(
    providers: dict[str, LLMProvider],
    route: ActiveRoute,
    state: TurnState,
    *,
    fallback_category: str,
) -> tuple[str, str | None]:
    # Rebuild persona + chart + format + language so the repaired answer is a
    # real, in-language reply grounded in THIS user's chart — not a bare rule
    # acknowledgement, and not a hallucinated chart (the regen must still see
    # the kundali). Language stays last for tail priority.
    system = "\n\n".join(
        [
            ASTROLOGER_LENS_DIRECTIVE,
            SAFETY_REPAIR_DIRECTIVE,
            FORMAT_DIRECTIVE,
            kundali_source_block(state.get("kundali", {})),
            language_mirror_directive(state.get("reply_language", "hinglish")),
        ]
    )
    repair_messages: list[ChatMessage] = [ChatMessage(role="system", content=system)]
    # Include prior turns so context-dependent follow-ups (e.g. "tell me more
    # about them") are answerable — without history the model can't tell what
    # "them" is and tends to produce vague content that re-trips the detector.
    for turn in state.get("message_history", []):
        content = turn["content"].replace(MESSAGE_SPLIT_DELIMITER, "\n")
        repair_messages.append(ChatMessage(role=turn["role"], content=content))  # type: ignore[arg-type]
    repair_messages.append(ChatMessage(role="user", content=state["user_message"]))
    try:
        result = await complete(route, providers, repair_messages)
    except ProviderError:
        return "", fallback_category
    return result.text, detect_unsafe_prediction(result.text)
