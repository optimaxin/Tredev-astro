"""Full session → message → poll round trip against real Postgres + real
Redis (Streams included). The only test double is the LLM provider — never
worth hitting a real paid API from a test suite.
"""

from __future__ import annotations

import asyncio
import subprocess
import uuid
from collections.abc import AsyncIterator
from pathlib import Path

import asyncpg
import httpx
import pytest
import pytest_asyncio
import redis.asyncio as redis_lib
from fastapi import FastAPI

from kundali_chat.api.routers import health, sessions
from kundali_chat.graph.turn import build_turn_graph
from kundali_chat.kundali.cache import CachedKundaliClient
from kundali_chat.kundali.placeholder_client import StaticPlaceholderKundaliClient
from kundali_chat.llm.active_route import ActiveRoute
from kundali_chat.llm.providers import ChatResult, TokenUsage
from kundali_chat.models.tables import resolve_table_names
from kundali_chat.processing.stream import TurnStream
from kundali_chat.processing.turn_runner import process_entry

pytestmark = pytest.mark.integration

KUNDALI_CHAT_ROOT = Path(__file__).resolve().parents[2]

BIRTH = {
    "name": "Dev",
    "gender": "male",
    "dob": "1999-08-01",
    "tob": "12:05",
    "latitude": 26.4619,
    "longitude": 79.4927,
    "place": "Kanpur",
}


class _StubProvider:
    """Deterministic, safety-clean text — no real network call."""

    provider_id = "stub"

    async def chat(self, messages, *, model, max_tokens, temperature):
        return ChatResult(
            text="STUB: aapka career achha rahega is dasha mein, koi chinta ki baat nahi.",
            usage=TokenUsage(prompt_tokens=42, completion_tokens=13, total_tokens=55),
            latency_ms=1,
            provider_id=self.provider_id,
            model_id=model,
        )


def _run_alembic_upgrade(dsn: str, redis_url: str) -> None:
    import os

    result = subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=KUNDALI_CHAT_ROOT,
        env={
            "POSTGRES__DSN": dsn,
            "REDIS__URL": redis_url,
            "PATH": os.environ.get("PATH", ""),
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        },
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"alembic upgrade head failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )


@pytest.fixture(scope="module")
def migrated_dsn(postgres_dsn: str, redis_url: str, env_for_settings) -> str:
    _run_alembic_upgrade(postgres_dsn, redis_url)
    return postgres_dsn


@pytest_asyncio.fixture
async def pool(migrated_dsn: str) -> AsyncIterator[asyncpg.Pool]:
    from kundali_chat.config import PostgresSettings
    from kundali_chat.shared.db import create_pool

    p = await create_pool(PostgresSettings(dsn=migrated_dsn, pool_min=2, pool_max=5))
    names = resolve_table_names()
    async with p.acquire() as conn:
        await conn.execute(f"TRUNCATE {names['messages']}, {names['sessions']} CASCADE")
    yield p
    await p.close()


@pytest_asyncio.fixture
async def redis_client(redis_url: str) -> AsyncIterator[redis_lib.Redis]:
    client = redis_lib.Redis.from_url(redis_url, decode_responses=True)
    await client.flushdb()
    yield client
    await client.aclose()


@pytest_asyncio.fixture
async def app_and_stream(pool: asyncpg.Pool, redis_client: redis_lib.Redis):
    kundali_client = CachedKundaliClient(
        client=StaticPlaceholderKundaliClient(), redis=redis_client, ttl_s=60
    )
    route = ActiveRoute(provider="stub", model="stub-model", max_tokens=500, temperature=0.4)
    providers = {"stub": _StubProvider()}
    graph = build_turn_graph(providers=providers, route=route)

    stream = TurnStream(
        redis=redis_client, stream_key=f"test:{uuid.uuid4()}", consumer_group="workers"
    )
    await stream.ensure_group()

    app = FastAPI()
    app.include_router(health.router)
    app.include_router(sessions.router)
    app.state.pool = pool
    app.state.kundali_client = kundali_client
    app.state.graph = graph
    app.state.stream = stream

    return app, stream, graph


@pytest_asyncio.fixture
async def client(app_and_stream) -> AsyncIterator[httpx.AsyncClient]:
    app, _stream, _graph = app_and_stream
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def _drain_one(
    pool: asyncpg.Pool, graph, stream: TurnStream, *, timeout_s: float = 5.0
) -> None:
    """Consume exactly one stream entry with the real turn_runner — the
    worker loop this test drives manually instead of app.py's background task."""
    deadline = asyncio.get_event_loop().time() + timeout_s
    while asyncio.get_event_loop().time() < deadline:
        entries = await stream.read(consumer_name="test-worker", count=1, block_ms=200)
        if entries:
            entry_id, fields = entries[0]
            await process_entry(
                pool=pool, graph=graph, stream=stream, entry_id=entry_id, fields=fields
            )
            return
    raise TimeoutError("no stream entry appeared in time")


@pytest.mark.asyncio
async def test_full_session_message_poll_round_trip(client, app_and_stream, pool):
    _app, stream, graph = app_and_stream

    create_resp = await client.post("/sessions", json=BIRTH)
    assert create_resp.status_code == 201
    session_id = create_resp.json()["session_id"]

    greeting_poll = await client.get(f"/sessions/{session_id}/messages")
    greeting_messages = greeting_poll.json()["messages"]
    assert len(greeting_messages) == 1
    assert greeting_messages[0]["role"] == "assistant"
    assert greeting_messages[0]["status"] == "complete"
    greeting_id = greeting_messages[0]["id"]

    send_resp = await client.post(
        f"/sessions/{session_id}/messages", json={"content": "career kaisa rahega?"}
    )
    assert send_resp.status_code == 202
    assistant_message_id = send_resp.json()["message_id"]

    # Poll BEFORE processing — the assistant row must already exist as pending.
    pending_poll = await client.get(
        f"/sessions/{session_id}/messages", params={"after": greeting_id}
    )
    pending_messages = pending_poll.json()["messages"]
    assert any(
        m["id"] == assistant_message_id and m["status"] == "pending" for m in pending_messages
    )

    await _drain_one(pool, graph, stream)

    final_poll = await client.get(f"/sessions/{session_id}/messages", params={"after": greeting_id})
    final_messages = {m["id"]: m for m in final_poll.json()["messages"]}
    assistant_final = final_messages[assistant_message_id]

    assert assistant_final["status"] == "complete"
    assert "STUB" in assistant_final["content"]
    assert assistant_final["safety_flag"] is None


@pytest.mark.asyncio
async def test_unknown_session_returns_404(client):
    resp = await client.post(f"/sessions/{uuid.uuid4()}/messages", json={"content": "hi"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_message_count_increments_after_processing(client, app_and_stream, pool):
    _app, stream, graph = app_and_stream

    create_resp = await client.post("/sessions", json={**BIRTH, "name": "Meera"})
    session_id = create_resp.json()["session_id"]

    await client.post(f"/sessions/{session_id}/messages", json={"content": "career?"})
    await _drain_one(pool, graph, stream)

    names = resolve_table_names()
    async with pool.acquire() as conn:
        count = await conn.fetchval(
            f"SELECT message_count FROM {names['sessions']} WHERE id = $1", uuid.UUID(session_id)
        )
    assert count == 1
