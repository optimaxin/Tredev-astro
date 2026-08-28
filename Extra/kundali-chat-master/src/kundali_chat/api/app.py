"""FastAPI app factory + lifespan.

Wires: Postgres pool, Redis client, the Kundali client (real API when
``KUNDALI_API__BASE_URL`` is set, the placeholder fixture otherwise —
wrapped in the Redis cache either way, see ``kundali/client.py``'s module
docstring), the LLM provider(s) needed by the active route, the compiled
turn graph, the Redis Stream + a bounded pool of worker coroutines, and the
crash-recovery reaper. No Kafka anywhere in this service.
"""

from __future__ import annotations

import asyncio
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kundali_chat.api.routers import health, playground, sessions
from kundali_chat.config import get_settings
from kundali_chat.graph.turn import build_turn_graph
from kundali_chat.kundali.cache import CachedKundaliClient
from kundali_chat.kundali.client import KundaliApiClient
from kundali_chat.kundali.engine_client import EngineKundaliClient
from kundali_chat.kundali.placeholder_client import StaticPlaceholderKundaliClient
from kundali_chat.kundali.tredevastro_client import TredevAstroKundaliClient
from kundali_chat.llm.active_route import get_active_route
from kundali_chat.llm.providers import LLMProvider, build_provider
from kundali_chat.processing.reaper import run_reaper_loop
from kundali_chat.processing.stream import TurnStream
from kundali_chat.processing.turn_runner import process_entry
from kundali_chat.shared import db as db_module
from kundali_chat.shared import redis_client as redis_module
from kundali_chat.shared.logging import get_logger

_log = get_logger("kundali_chat.api.app")


def _build_kundali_origin_client(settings) -> KundaliApiClient:
    if settings.tredevastro_api.base_url:
        return TredevAstroKundaliClient(
            base_url=settings.tredevastro_api.base_url,
            timeout_s=settings.tredevastro_api.timeout_s,
        )
    if settings.kundali_api.base_url:
        token = (
            settings.kundali_api.api_key.get_secret_value()
            if settings.kundali_api.api_key
            else None
        )
        return EngineKundaliClient(
            base_url=settings.kundali_api.base_url,
            app_id=settings.kundali_api.app_id,
            token=token,
            timeout_s=settings.kundali_api.timeout_s,
        )
    return StaticPlaceholderKundaliClient()


def _build_active_providers(settings) -> dict[str, LLMProvider]:
    route = get_active_route(settings.llm)
    needed = {route.provider}
    if route.fallback_provider:
        needed.add(route.fallback_provider)

    gemini_key = (
        settings.llm.gemini_api_key.get_secret_value() if settings.llm.gemini_api_key else None
    )
    sarvam_key = (
        settings.llm.sarvam_api_key.get_secret_value() if settings.llm.sarvam_api_key else None
    )
    openrouter_key = (
        settings.llm.openrouter_api_key.get_secret_value()
        if settings.llm.openrouter_api_key
        else None
    )

    return {
        name: build_provider(
            name,
            gemini_api_key=gemini_key,
            sarvam_api_key=sarvam_key,
            openrouter_api_key=openrouter_key,
        )
        for name in needed
    }


async def _worker_loop(app: FastAPI, worker_name: str, stop_event: asyncio.Event) -> None:
    stream: TurnStream = app.state.stream
    while not stop_event.is_set():
        try:
            entries = await stream.read(
                consumer_name=worker_name,
                count=1,
                block_ms=app.state.settings.processing.block_ms,
            )
        except Exception as exc:
            _log.error("worker: read failed", worker=worker_name, error=str(exc))
            await asyncio.sleep(1)
            continue
        for entry_id, fields in entries:
            try:
                await process_entry(
                    pool=app.state.pool,
                    graph=app.state.graph,
                    stream=stream,
                    entry_id=entry_id,
                    fields=fields,
                )
            except Exception as exc:
                _log.error("worker: entry processing crashed", worker=worker_name, error=str(exc))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.settings = settings

    app.state.pool = await db_module.create_pool(settings.postgres)
    app.state.redis = redis_module.create_client(settings.redis)

    origin_client = _build_kundali_origin_client(settings)
    app.state.kundali_client = CachedKundaliClient(
        client=origin_client, redis=app.state.redis, ttl_s=settings.redis.kundali_ttl_s
    )

    app.state.active_route = get_active_route(settings.llm)
    app.state.llm_providers = _build_active_providers(settings)
    app.state.graph = build_turn_graph(
        providers=app.state.llm_providers, route=app.state.active_route
    )

    app.state.stream = TurnStream(
        redis=app.state.redis,
        stream_key=settings.processing.stream_key,
        consumer_group=settings.processing.consumer_group,
    )
    await app.state.stream.ensure_group()

    stop_event = asyncio.Event()
    pod_id = uuid.uuid4().hex[:8]
    worker_tasks = [
        asyncio.create_task(_worker_loop(app, f"{pod_id}-worker-{i}", stop_event))
        for i in range(settings.processing.worker_concurrency)
    ]
    reaper_task = asyncio.create_task(
        run_reaper_loop(
            pool=app.state.pool,
            stream=app.state.stream,
            min_idle_ms=settings.processing.stuck_threshold_s * 1000,
            interval_s=settings.processing.reaper_interval_s,
            stop_event=stop_event,
        )
    )

    try:
        yield
    finally:
        stop_event.set()
        for task in worker_tasks:
            task.cancel()
        reaper_task.cancel()
        await asyncio.gather(*worker_tasks, reaper_task, return_exceptions=True)
        await redis_module.close_client(app.state.redis)
        await db_module.close_pool(app.state.pool)


def create_app() -> FastAPI:
    app = FastAPI(title="kundali-chat", lifespan=lifespan)
    # No cookies/credentials cross this API (auth is the optional X-User-Id
    # header, not a session cookie), so a wide-open origin list is safe and
    # avoids hardcoding the frontend's dev/prod hosts here.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router)
    app.include_router(playground.router)
    app.include_router(sessions.router)
    return app
