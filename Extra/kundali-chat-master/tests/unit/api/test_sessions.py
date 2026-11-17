"""Router-level tests via httpx.ASGITransport against a fake pool/graph/
stream/kundali-client — no real Postgres, Redis, or LLM."""

from __future__ import annotations

import json

import pytest

from tests.unit.api.conftest import FakeKundaliClient

BIRTH = {
    "name": "Dev",
    "gender": "male",
    "dob": "1999-08-01",
    "tob": "12:05",
    "latitude": 26.4619,
    "longitude": 79.4927,
    "place": "Kanpur",
}


@pytest.mark.asyncio
async def test_health():
    import httpx
    from fastapi import FastAPI

    from kundali_chat.api.routers import health

    app = FastAPI()
    app.include_router(health.router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/health")

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_create_session_returns_id_and_persists_greeting(client, fake_store):
    resp = await client.post("/sessions", json=BIRTH)

    assert resp.status_code == 201
    session_id = resp.json()["session_id"]
    assert session_id  # a UUID string

    stored = list(fake_store.messages.values())
    assert len(stored) == 1
    assert stored[0]["role"] == "assistant"
    assert stored[0]["content"] == "Namaste! Aapka lagna Simha hai."


@pytest.mark.asyncio
async def test_create_session_marks_greeting_sent(client, fake_store):
    resp = await client.post("/sessions", json=BIRTH)
    session_id = resp.json()["session_id"]

    import uuid

    assert fake_store.sessions[uuid.UUID(session_id)]["greeting_sent"] is True


@pytest.mark.asyncio
async def test_create_session_kundali_fetch_failure_returns_502(test_app, client):
    test_app.state.kundali_client = FakeKundaliClient(error=RuntimeError("upstream down"))

    resp = await client.post("/sessions", json=BIRTH)

    assert resp.status_code == 502


@pytest.mark.asyncio
async def test_create_session_greeting_llm_failure_still_returns_201_with_fallback_text(
    test_app, client, fake_store
):
    """A transient LLM provider outage during signup must not 500 the whole
    session — the user still gets a session + a friendly fallback greeting,
    and the failure is recorded for ops (status=failed, error set)."""

    class _BoomGraph:
        async def ainvoke(self, state):
            raise RuntimeError("gemini: 503 service unavailable")

    test_app.state.graph = _BoomGraph()

    resp = await client.post("/sessions", json=BIRTH)

    assert resp.status_code == 201
    session_id = resp.json()["session_id"]

    stored = list(fake_store.messages.values())
    assert len(stored) == 1
    assert stored[0]["role"] == "assistant"
    assert stored[0]["content"]  # friendly fallback text, not empty

    import uuid

    assert fake_store.sessions[uuid.UUID(session_id)]["greeting_sent"] is True


@pytest.mark.asyncio
async def test_create_session_passes_x_user_id_header(client, fake_store):
    user_id = "11111111-1111-1111-1111-111111111111"
    resp = await client.post(
        "/sessions", json=BIRTH, headers={"X-User-Id": user_id}
    )

    session_id = resp.json()["session_id"]
    import uuid

    assert str(fake_store.sessions[uuid.UUID(session_id)]["anon_user_id"]) == user_id


@pytest.mark.asyncio
async def test_create_session_invalid_x_user_id_is_ignored_not_rejected(client):
    resp = await client.post(
        "/sessions", json=BIRTH, headers={"X-User-Id": "not-a-uuid"}
    )

    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_create_session_from_text_plaintext(client, fake_store, test_app):
    resp = await client.post(
        "/sessions/from-text",
        json={"name": "Ravi", "content": "Lagna: Mesha. Moon: Vrishabha. Mahadasha: Shukra."},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["kundali"]["raw"].startswith("Lagna: Mesha")
    assert data["kundali"]["basic_details"]["name"] == "Ravi"
    # mirrored into the (fake) redis, mimicking production's feed
    assert any(k.startswith("kundali_chat:kundali:text:") for k in test_app.state.redis.store)
    # greeting is generated ASYNC: a pending assistant placeholder + a queued
    # greeting turn (the LLM does not block the upload response).
    stored = list(fake_store.messages.values())
    assert len(stored) == 1
    assert stored[0]["role"] == "assistant"
    assert stored[0]["status"] == "pending"
    assert len(test_app.state.stream.greetings) == 1


@pytest.mark.asyncio
async def test_create_session_from_text_json_is_used_structured(client):
    payload = '{"lagna_chart": {"ascendant_sign": "Leo", "planets": []}, "dasha": {}}'
    resp = await client.post("/sessions/from-text", json={"name": "Sia", "content": payload})

    assert resp.status_code == 201
    kundali = resp.json()["kundali"]
    assert kundali["lagna_chart"]["ascendant_sign"] == "Leo"
    assert kundali["basic_details"]["name"] == "Sia"  # name injected


def test_kundali_from_text_parses_json_and_falls_back_to_raw():
    from kundali_chat.api.routers.sessions import kundali_from_text

    structured = kundali_from_text('{"lagna_chart": {"ascendant_sign": "Aries"}}', "X")
    assert structured["lagna_chart"]["ascendant_sign"] == "Aries"
    assert structured["basic_details"]["name"] == "X"

    freeform = kundali_from_text("just some astrologer notes", "Y")
    assert freeform["raw"] == "just some astrologer notes"
    assert freeform["basic_details"]["name"] == "Y"


def test_kundali_from_text_compacts_bulky_marketing_html():
    from kundali_chat.api.routers.sessions import kundali_from_text

    big = "<p>" + ("blah " * 500) + "</p>"  # > 600 chars of marketing prose
    payload = json.dumps(
        {
            "NAME": "Ravi",
            "LAAGNA_TABLE": [{"planet": "As", "rashi": "Leo", "rashiIndex": 5}],
            # structured dasha whose key contains "content" — must be KEPT
            "VIMSHOTTARI_CONTENT": {"currentDasha": {"mahaDasha": {"planet": "Saturn"}}},
            "SADESATI_CONTENT": big,  # long string value — must be DROPPED
            "IS_MANGLIK": False,
        }
    )
    result = kundali_from_text(payload, "Ravi")
    # structured data kept (even keys containing "content"), bulky prose dropped
    assert result["LAAGNA_TABLE"][0]["rashi"] == "Leo"
    assert result["VIMSHOTTARI_CONTENT"]["currentDasha"]["mahaDasha"]["planet"] == "Saturn"
    assert "SADESATI_CONTENT" not in result
    assert result["IS_MANGLIK"] is False


def test_kundali_from_text_slims_oversized_report():
    from kundali_chat.api.routers.sessions import kundali_from_text

    # A ~1MB-style report: giant Vimshottari tree dwarfs everything else.
    huge_tree = {"currentDasha": {"mahaDasha": {"planet": "Ketu"}}, "allDashas": {}}
    for i in range(4000):  # bloat the dasha tree well past the slim threshold
        huge_tree["allDashas"][f"period_{i}"] = {"planet": "X", "sub": list(range(20))}
    payload = json.dumps(
        {
            "NAME": "Muntazir",
            "LAAGNA_TABLE": [{"planet": "As", "rashi": "Cancer", "rashiIndex": 4}],
            "VIMSHOTTARI_CONTENT": huge_tree,
            "IS_MANGLIK": True,
        }
    )
    result = kundali_from_text(payload, "friend")
    slim = json.dumps(result)
    assert len(slim) < 16_000  # slimmed hard
    assert "allDashas" not in slim  # the giant tree is gone
    assert result["current_dasha"]["mahaDasha"]["planet"] == "Ketu"  # but current dasha kept
    assert result["LAAGNA_TABLE"][0]["rashi"] == "Cancer"
    assert result["basic_details"]["name"] == "Muntazir"  # name from the file


@pytest.mark.asyncio
async def test_send_message_returns_202_and_enqueues(client, fake_store, test_app):
    create_resp = await client.post("/sessions", json=BIRTH)
    session_id = create_resp.json()["session_id"]

    resp = await client.post(
        f"/sessions/{session_id}/messages", json={"content": "career kaisa rahega?"}
    )

    assert resp.status_code == 202
    message_id = resp.json()["message_id"]
    assert message_id

    assert test_app.state.stream.enqueued == [(message_id, session_id)]


@pytest.mark.asyncio
async def test_send_message_unknown_session_returns_404(client):
    import uuid

    resp = await client.post(f"/sessions/{uuid.uuid4()}/messages", json={"content": "hi"})

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_send_message_inserts_pending_assistant_row(client, fake_store):
    create_resp = await client.post("/sessions", json=BIRTH)
    session_id = create_resp.json()["session_id"]

    send_resp = await client.post(f"/sessions/{session_id}/messages", json={"content": "career?"})
    message_id = send_resp.json()["message_id"]

    import uuid

    row = fake_store.messages[uuid.UUID(message_id)]
    assert row["role"] == "assistant"
    assert row["status"] == "pending"


@pytest.mark.asyncio
async def test_poll_messages_returns_greeting_then_new_messages_in_order(client):
    create_resp = await client.post("/sessions", json=BIRTH)
    session_id = create_resp.json()["session_id"]

    poll_resp = await client.get(f"/sessions/{session_id}/messages")

    assert poll_resp.status_code == 200
    messages = poll_resp.json()["messages"]
    assert len(messages) == 1
    assert messages[0]["role"] == "assistant"


@pytest.mark.asyncio
async def test_poll_messages_with_after_cursor_only_returns_newer_rows(client):
    create_resp = await client.post("/sessions", json=BIRTH)
    session_id = create_resp.json()["session_id"]
    greeting_id = (await client.get(f"/sessions/{session_id}/messages")).json()["messages"][0]["id"]

    await client.post(f"/sessions/{session_id}/messages", json={"content": "career?"})

    poll_resp = await client.get(f"/sessions/{session_id}/messages", params={"after": greeting_id})

    messages = poll_resp.json()["messages"]
    assert len(messages) == 2  # user row + assistant placeholder row
    assert all(m["id"] != greeting_id for m in messages)


@pytest.mark.asyncio
async def test_poll_messages_unknown_cursor_returns_404(client):
    create_resp = await client.post("/sessions", json=BIRTH)
    session_id = create_resp.json()["session_id"]

    import uuid

    resp = await client.get(f"/sessions/{session_id}/messages", params={"after": str(uuid.uuid4())})

    assert resp.status_code == 404
