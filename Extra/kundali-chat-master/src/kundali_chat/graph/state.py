"""LangGraph ``TurnState`` — the shape that flows through the 3-node turn
pipeline.

Imports used in this TypedDict's annotations are NOT under ``TYPE_CHECKING``
— LangGraph calls ``typing.get_type_hints(TurnState)`` at graph-compile
time, and a ``TYPE_CHECKING``-only import would raise ``NameError`` there
(this repo's ai-core service hit this exact bug; see its CLAUDE.md gotcha
list).

Design note — nodes are pure functions, IO stays at the edges: unlike
ai-core's turn graph, this service's nodes never touch Redis/Postgres/the
Kundali API directly. ``processing/turn_runner.py`` loads ``kundali`` and
``message_history`` before invoking the graph, and persists ``final_answer``
after it returns. That keeps every node here trivially unit-testable with
plain dicts and fake LLM providers — no fake DB/Redis needed.
"""

from __future__ import annotations

from typing import Any, TypedDict

from kundali_chat.kundali.client import KundaliChartData


class TurnState(TypedDict, total=False):
    # --- Set by the caller (turn_runner) before invoking the graph ---
    session_id: str
    user_message: str
    kundali: KundaliChartData
    message_history: list[dict[str, str]]  # [{"role": "user"|"assistant", "content": ...}, ...]

    # --- Set by context_assembly_node ---
    is_first_turn: bool
    language_hint: str  # "hindi_script" | "latin_script" | "mixed_script" | "unknown"
    reply_language: str  # "english" | "hinglish" — the language to answer in

    # --- Set by astrologer_answer_node ---
    draft_answer: str
    llm_provider: str
    llm_model: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: int
    hook_event: dict[str, Any] | None

    # --- Set by safety_filter_node ---
    final_answer: str
    safety_flag: str | None
    regenerated: bool
