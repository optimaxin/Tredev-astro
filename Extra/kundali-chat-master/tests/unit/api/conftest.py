"""Router-level tests build the FastAPI app WITHOUT its real lifespan (no
real Postgres/Redis/LLM) — fakes are attached directly to ``app.state``,
matching this repo's stated convention of testing routers via
``httpx.ASGITransport`` rather than a live server."""

from __future__ import annotations

import uuid

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI

from kundali_chat.api.routers import health, sessions
from kundali_chat.models.tables import resolve_table_names


class _FakeRecord(dict):
    """asyncpg Records support both dict-style and attribute-ish access;
    plain dicts are enough for how the routers use them."""


class _FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class FakeConnection:
    def __init__(self, store: FakeStore) -> None:
        self._store = store

    def transaction(self):
        return _FakeTransaction()

    async def fetchrow(self, query, *args):
        return self._store.fetchrow(query, args)

    async def fetchval(self, query, *args):
        return self._store.fetchval(query, args)

    async def fetch(self, query, *args):
        return self._store.fetch(query, args)

    async def execute(self, query, *args):
        return self._store.execute(query, args)


class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class FakePool:
    def __init__(self, store: FakeStore) -> None:
        self._store = store

    def acquire(self):
        return _AcquireCtx(FakeConnection(self._store))


class FakeStore:
    """A tiny in-memory stand-in for the two tables, keyed by the real
    table names (so a hardcoded-name regression would show up as a
    query-routing miss in these tests too)."""

    def __init__(self) -> None:
        names = resolve_table_names()
        self.sessions_table = names["sessions"]
        self.messages_table = names["messages"]
        self.sessions: dict[uuid.UUID, dict] = {}
        self.messages: dict[uuid.UUID, dict] = {}

    def fetchrow(self, query, args):
        if self.sessions_table in query and "INSERT INTO" in query:
            session_id = uuid.uuid4()
            self.sessions[session_id] = {
                "id": session_id,
                "kundali_session_ref": args[0],
                "anon_user_id": args[1],
                "kundali_cache": args[2],
                "kundali_fetch_status": args[3],
                "greeting_sent": False,
                "message_count": 0,
            }
            return _FakeRecord(id=session_id)
        if self.messages_table in query and "INSERT INTO" in query and "RETURNING id" in query:
            message_id = uuid.uuid4()
            self.messages[message_id] = {
                "id": message_id,
                "session_id": args[0],
                "role": args[1],
                "content": args[2],
                "status": args[3],
                "safety_flag": None,
                "hook_event": None,
                "created_at": _next_ts(),
            }
            return _FakeRecord(id=message_id)
        if "SELECT created_at FROM" in query:
            message_id = args[0]
            row = self.messages.get(message_id)
            return _FakeRecord(created_at=row["created_at"]) if row else None
        return None

    def fetchval(self, query, args):
        if self.sessions_table in query:
            session_id = args[0]
            return 1 if session_id in self.sessions else None
        return None

    def fetch(self, query, args):
        session_id = args[0]
        rows = [m for m in self.messages.values() if m["session_id"] == session_id]
        rows.sort(key=lambda m: (m["created_at"], str(m["id"])))
        if len(args) >= 3 and "(created_at, id) >" in query:
            cursor_created_at, cursor_id = args[1], args[2]
            rows = [
                m
                for m in rows
                if (m["created_at"], str(m["id"])) > (cursor_created_at, str(cursor_id))
            ]
        limit = args[-1]
        return [_FakeRecord(**m) for m in rows[:limit]]

    def execute(self, query, args):
        if self.messages_table in query and "INSERT INTO" in query:
            message_id = uuid.uuid4()
            self.messages[message_id] = {
                "id": message_id,
                "session_id": args[0],
                "role": args[1],
                "content": args[2],
                "status": args[3],
                "classified_language": args[4] if len(args) > 4 else None,
                "llm_provider": args[5] if len(args) > 5 else None,
                "llm_model": args[6] if len(args) > 6 else None,
                "safety_flag": args[10] if len(args) > 10 else None,
                "hook_event": args[11] if len(args) > 11 else None,
                "created_at": _next_ts(),
            }
            return "INSERT 1"
        if self.sessions_table in query and "SET greeting_sent" in query:
            self.sessions[args[0]]["greeting_sent"] = True
            return "UPDATE 1"
        return "UPDATE 1"


_ts_counter = [0]


def _next_ts():
    import datetime

    _ts_counter[0] += 1
    return datetime.datetime(2026, 1, 1, tzinfo=datetime.UTC) + datetime.timedelta(
        seconds=_ts_counter[0]
    )


class FakeKundaliClient:
    def __init__(self, payload: dict | None = None, error: Exception | None = None) -> None:
        self._payload = payload or {"lagna_chart": {}, "dasha": {}}
        self._error = error

    async def fetch_kundali(self, birth: dict) -> dict:
        if self._error is not None:
            raise self._error
        return self._payload


class FakeStream:
    def __init__(self) -> None:
        self.enqueued: list[tuple[str, str]] = []
        self.greetings: list[tuple[str, str]] = []

    async def enqueue(self, *, message_id: str, session_id: str, greeting: bool = False) -> str:
        if greeting:
            self.greetings.append((message_id, session_id))
        else:
            self.enqueued.append((message_id, session_id))
        return "1-0"


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value


class FakeGraph:
    def __init__(self, result: dict | None = None) -> None:
        self.result = result or {
            "final_answer": "Namaste! Aapka lagna Simha hai.",
            "language_hint": "latin_script",
            "llm_provider": "gemini",
            "llm_model": "gemini-2.5-flash",
            "latency_ms": 100,
            "prompt_tokens": 50,
            "completion_tokens": 20,
            "safety_flag": None,
            "hook_event": None,
        }

    async def ainvoke(self, state):
        return self.result


@pytest.fixture
def fake_store() -> FakeStore:
    return FakeStore()


@pytest.fixture
def test_app(fake_store: FakeStore) -> FastAPI:
    app = FastAPI()
    app.include_router(health.router)
    app.include_router(sessions.router)
    app.state.pool = FakePool(fake_store)
    app.state.kundali_client = FakeKundaliClient()
    app.state.graph = FakeGraph()
    app.state.stream = FakeStream()
    app.state.redis = FakeRedis()
    return app


@pytest_asyncio.fixture
async def client(test_app: FastAPI):
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
