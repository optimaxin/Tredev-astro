"""Dependency injection + auth.

The auth shape mirrors ai-core's playground pattern (an ``X-User-Id``
header) but WITHOUT the role/RBAC lookup — these are anonymous public
end-users of the free kundali tool, not dashboard staff. The header is
OPTIONAL: a missing or invalid ``X-User-Id`` resolves to ``None``
(``anon_user_id`` stays NULL) rather than a 401 — a real end-user session
shouldn't hard-fail just because the caller didn't set an identity header.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends, Header, Request

if TYPE_CHECKING:
    import asyncpg
    from langgraph.graph.state import CompiledStateGraph
    from redis.asyncio import Redis

    from kundali_chat.kundali.client import KundaliApiClient
    from kundali_chat.llm.active_route import ActiveRoute
    from kundali_chat.llm.providers import LLMProvider
    from kundali_chat.processing.stream import TurnStream


def get_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool  # type: ignore[no-any-return]


def get_redis(request: Request) -> Redis:
    return request.app.state.redis  # type: ignore[no-any-return]


def get_kundali_client(request: Request) -> KundaliApiClient:
    return request.app.state.kundali_client  # type: ignore[no-any-return]


def get_stream(request: Request) -> TurnStream:
    return request.app.state.stream  # type: ignore[no-any-return]


def get_graph(request: Request) -> CompiledStateGraph:
    return request.app.state.graph  # type: ignore[no-any-return]


def get_llm_providers(request: Request) -> dict[str, LLMProvider]:
    return request.app.state.llm_providers  # type: ignore[no-any-return]


def get_active_route(request: Request) -> ActiveRoute:
    return request.app.state.active_route  # type: ignore[no-any-return]


def require_anon_user_id(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> uuid.UUID | None:
    if not x_user_id:
        return None
    try:
        return uuid.UUID(x_user_id)
    except ValueError:
        return None


PoolDep = Annotated["asyncpg.Pool", Depends(get_pool)]
RedisDep = Annotated["Redis", Depends(get_redis)]
KundaliClientDep = Annotated["KundaliApiClient", Depends(get_kundali_client)]
StreamDep = Annotated["TurnStream", Depends(get_stream)]
GraphDep = Annotated["CompiledStateGraph", Depends(get_graph)]
LLMProvidersDep = Annotated["dict[str, LLMProvider]", Depends(get_llm_providers)]
ActiveRouteDep = Annotated["ActiveRoute", Depends(get_active_route)]
AnonUserIdDep = Annotated["uuid.UUID | None", Depends(require_anon_user_id)]
