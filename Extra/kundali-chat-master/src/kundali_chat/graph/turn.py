"""Build the turn graph: a straight-line 3-node pipeline.

    START → context_assembly → astrologer_answer → safety_filter → END

No router/branching beyond the internal ``is_first_turn`` check inside
``astrologer_answer_node`` — this service has one flow, not ai-core's
multi-specialist router, so a topology to match would be pure ceremony.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from langgraph.graph import END, START, StateGraph

from kundali_chat.graph.nodes.astrologer_answer import make_astrologer_answer_node
from kundali_chat.graph.nodes.context_assembly import context_assembly_node
from kundali_chat.graph.nodes.safety_filter import make_safety_filter_node
from kundali_chat.graph.state import TurnState

if TYPE_CHECKING:
    from langgraph.graph.state import CompiledStateGraph

    from kundali_chat.llm.active_route import ActiveRoute
    from kundali_chat.llm.providers import LLMProvider


def build_turn_graph(
    *, providers: dict[str, LLMProvider], route: ActiveRoute
) -> CompiledStateGraph:
    graph = StateGraph(TurnState)

    graph.add_node("context_assembly", context_assembly_node)
    graph.add_node(
        "astrologer_answer", make_astrologer_answer_node(providers=providers, route=route)
    )
    graph.add_node("safety_filter", make_safety_filter_node(providers=providers, route=route))

    graph.add_edge(START, "context_assembly")
    graph.add_edge("context_assembly", "astrologer_answer")
    graph.add_edge("astrologer_answer", "safety_filter")
    graph.add_edge("safety_filter", END)

    return graph.compile()
