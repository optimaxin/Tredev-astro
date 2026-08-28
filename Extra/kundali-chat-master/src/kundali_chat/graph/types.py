"""Structural typing for the LangGraph node layer.

This service's nodes never need per-invocation deps (see ``state.py``'s
design note — IO stays at the edges in ``processing/turn_runner.py``), so
there's only one node shape, unlike ai-core's ``NodeFn``/``RuntimeNodeFn``
split. Declared as a ``Protocol`` with ``__call__`` (rather than a
``Callable[[TurnState], Awaitable[...]]`` type alias) because LangGraph's
``add_node`` overloads structurally match this shape more reliably under
pyright — mirrors ai-core's ``graph/types.py`` for the same reason.
"""

from __future__ import annotations

from collections.abc import Awaitable
from typing import Any, Protocol

from kundali_chat.graph.state import TurnState


class NodeFn(Protocol):
    def __call__(self, state: TurnState) -> Awaitable[dict[str, Any]]: ...
