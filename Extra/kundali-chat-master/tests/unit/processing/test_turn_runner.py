"""turn_runner against a fake asyncpg pool + fake graph + fake stream — no
real Postgres, no real LangGraph execution."""

from __future__ import annotations

import pytest

from kundali_chat.models.enums import MessageStatus
from kundali_chat.processing.turn_runner import process_entry


class _FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


class _FakeConnection:
    def __init__(
        self, *, session_row=None, user_row=None, history_rows=None, placeholder_exists=True
    ):
        self.session_row = session_row
        self.user_row = user_row
        self.history_rows = history_rows or []
        self.placeholder_exists = placeholder_exists
        self.executed: list[tuple] = []

    async def fetchrow(self, query, *args):
        if "kundali_cache" in query:
            return self.session_row
        if "SELECT 1 FROM" in query:  # assistant placeholder existence check
            return {"c": 1} if self.placeholder_exists else None
        return self.user_row  # latest user message lookup

    async def fetch(self, query, *args):
        return self.history_rows

    async def execute(self, query, *args):
        self.executed.append((query, args))
        return "UPDATE 1"

    def transaction(self):
        return _FakeTransaction()


class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class _FakePool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        return _AcquireCtx(self._conn)


class _FakeGraph:
    def __init__(self, result=None, error=None):
        self._result = result
        self._error = error
        self.received_input = None

    async def ainvoke(self, input_state):
        self.received_input = input_state
        if self._error is not None:
            raise self._error
        return self._result


class _FakeStream:
    def __init__(self):
        self.acked: list[str] = []

    async def ack(self, entry_id):
        self.acked.append(entry_id)


_RESULT = {
    "final_answer": "Aapka career achha rahega.",
    "language_hint": "latin_script",
    "llm_provider": "gemini",
    "llm_model": "gemini-2.5-flash",
    "latency_ms": 300,
    "prompt_tokens": 100,
    "completion_tokens": 40,
    "safety_flag": None,
    "hook_event": None,
}


@pytest.mark.asyncio
async def test_happy_path_marks_message_complete_and_acks():
    conn = _FakeConnection(
        session_row={"kundali_cache": {"lagna_chart": {}}},
        user_row={"id": "u1", "content": "career kaisa rahega?"},
        history_rows=[],
    )
    pool = _FakePool(conn)
    graph = _FakeGraph(result=_RESULT)
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "m1", "session_id": "s1"},
    )

    assert graph.received_input["user_message"] == "career kaisa rahega?"
    assert graph.received_input["kundali"] == {"lagna_chart": {}}
    update_query, update_args = conn.executed[0]
    assert "SET status" in update_query
    assert MessageStatus.complete.value in update_args
    assert "Aapka career achha rahega." in update_args
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_greeting_turn_uses_trigger_message_and_marks_greeting_sent():
    from kundali_chat.graph.directives import GREETING_TRIGGER_MESSAGE

    conn = _FakeConnection(session_row={"kundali_cache": {"lagna_chart": {}}})
    pool = _FakePool(conn)
    graph = _FakeGraph(result=_RESULT)
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "g1", "session_id": "s1", "greeting": "1"},
    )

    # greeting turn: no user question is loaded, the trigger message is used
    assert graph.received_input["user_message"] == GREETING_TRIGGER_MESSAGE
    assert graph.received_input["message_history"] == []
    # session marked greeting_sent, message_count NOT incremented
    session_updates = [q for q, _ in conn.executed if "greeting_sent" in q]
    assert session_updates
    assert not any("message_count" in q for q, _ in conn.executed)
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_history_rows_reversed_to_chronological_order():
    conn = _FakeConnection(
        session_row={"kundali_cache": {}},
        user_row={"id": "u1", "content": "and career?"},
        # DB returns newest-first (DESC); turn_runner must present chronological order.
        history_rows=[
            {"role": "assistant", "content": "namaste"},
            {"role": "user", "content": "hi"},
        ],
    )
    pool = _FakePool(conn)
    graph = _FakeGraph(result=_RESULT)
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "m1", "session_id": "s1"},
    )

    assert graph.received_input["message_history"] == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "namaste"},
    ]


@pytest.mark.asyncio
async def test_missing_session_acks_without_invoking_graph():
    conn = _FakeConnection(session_row=None, user_row={"id": "u1", "content": "hi"})
    pool = _FakePool(conn)
    graph = _FakeGraph(result=_RESULT)
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "m1", "session_id": "s1"},
    )

    assert graph.received_input is None
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_missing_message_acks_without_invoking_graph():
    conn = _FakeConnection(session_row={"kundali_cache": {}}, placeholder_exists=False)
    pool = _FakePool(conn)
    graph = _FakeGraph(result=_RESULT)
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "m1", "session_id": "s1"},
    )

    assert graph.received_input is None
    assert stream.acked == ["1-0"]


@pytest.mark.asyncio
async def test_graph_failure_marks_failed_with_canned_text_and_acks():
    conn = _FakeConnection(
        session_row={"kundali_cache": {}}, user_row={"id": "u1", "content": "hi"}, history_rows=[]
    )
    pool = _FakePool(conn)
    graph = _FakeGraph(error=RuntimeError("llm provider down"))
    stream = _FakeStream()

    await process_entry(
        pool=pool,
        graph=graph,
        stream=stream,
        entry_id="1-0",
        fields={"message_id": "m1", "session_id": "s1"},
    )

    _update_query, update_args = conn.executed[0]
    assert MessageStatus.failed.value in update_args
    assert "llm provider down" in update_args
    assert stream.acked == ["1-0"]
