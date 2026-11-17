"""Node 1 is a pure function — no fakes needed, just plain dicts."""

from __future__ import annotations

import pytest

from kundali_chat.graph.nodes.context_assembly import (
    compute_language_hint,
    compute_reply_language,
    context_assembly_node,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("मेरी शादी कब होगी?", "hindi_script"),
        ("When will I get married?", "latin_script"),
        ("Mera shaadi kab hogi?", "latin_script"),
        ("मेरी shaadi kab hogi?", "mixed_script"),
        ("12345 !!!", "unknown"),
        ("", "unknown"),
    ],
)
def test_compute_language_hint(text, expected):
    assert compute_language_hint(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("When will I get a job?", "english"),
        ("Tell me about my health.", "english"),
        ("What does my chart say about marriage?", "english"),
        ("meri shaadi kab hogi?", "hinglish"),
        ("mera career kaisa rahega", "hinglish"),
        ("मेरी शादी कब होगी?", "hinglish"),
        ("aapka lagna kya hai", "hinglish"),
    ],
)
def test_compute_reply_language(text, expected):
    assert compute_reply_language(text) == expected


@pytest.mark.asyncio
async def test_reply_language_english_on_followup():
    result = await context_assembly_node(
        {
            "user_message": "When will I get a job?",
            "message_history": [{"role": "user", "content": "hi"}],
        }
    )
    assert result["reply_language"] == "english"


@pytest.mark.asyncio
async def test_reply_language_defaults_hinglish_on_first_turn():
    result = await context_assembly_node({"user_message": "hello", "message_history": []})
    assert result["reply_language"] == "hinglish"


@pytest.mark.asyncio
async def test_affirmation_inherits_previous_language():
    # user chatted in Hinglish, then just says "haan" — reply stays Hinglish
    hist = [
        {"role": "user", "content": "meri shaadi kab hogi?"},
        {"role": "assistant", "content": "Kya aap upaay jaanna chahenge?"},
    ]
    for aff in ("haan", "hnn", "yes", "ok batao", "haan batao", "hnn btao", "hn bta do"):
        result = await context_assembly_node({"user_message": aff, "message_history": hist})
        assert result["reply_language"] == "hinglish", aff


@pytest.mark.asyncio
async def test_first_turn_when_no_history():
    result = await context_assembly_node({"user_message": "hi", "message_history": []})
    assert result["is_first_turn"] is True


@pytest.mark.asyncio
async def test_not_first_turn_when_history_present():
    result = await context_assembly_node(
        {
            "user_message": "and what about career?",
            "message_history": [{"role": "user", "content": "hi"}],
        }
    )
    assert result["is_first_turn"] is False


@pytest.mark.asyncio
async def test_sets_language_hint_from_user_message():
    result = await context_assembly_node({"user_message": "Namaste ji", "message_history": []})
    assert result["language_hint"] == "latin_script"


@pytest.mark.asyncio
async def test_missing_message_history_defaults_to_first_turn():
    result = await context_assembly_node({"user_message": "hi"})
    assert result["is_first_turn"] is True
