"""Periodic task: resolves stream entries stuck in a crashed worker's PEL.

Never re-runs the LLM call on a stuck entry — that risks double-answering
and double-billing on crash recovery. Instead, if the corresponding
Postgres row is still ``pending`` past the threshold, marks it ``failed``
with a localized timeout message and ACKs the stream entry directly.
"""

from __future__ import annotations

import asyncio
import contextlib
from typing import TYPE_CHECKING

from kundali_chat.models.enums import MessageStatus
from kundali_chat.models.tables import resolve_table_names
from kundali_chat.safety.canned_responses import get_timeout_message, hint_to_language
from kundali_chat.shared.logging import get_logger

if TYPE_CHECKING:
    import asyncpg

    from kundali_chat.processing.stream import TurnStream

_log = get_logger("kundali_chat.processing.reaper")


async def reap_stuck_entries(*, pool: asyncpg.Pool, stream: TurnStream, min_idle_ms: int) -> int:
    """One reaper pass. Returns the number of entries resolved."""
    names = resolve_table_names()
    claimed = await stream.autoclaim_stuck(consumer_name="reaper", min_idle_ms=min_idle_ms)

    resolved = 0
    for entry_id, fields in claimed:
        message_id = fields.get("message_id")
        if message_id is None:
            await stream.ack(entry_id)
            continue

        was_resolved = await _resolve_if_still_pending(pool, names, message_id=message_id)
        await stream.ack(entry_id)
        if was_resolved:
            resolved += 1
            _log.warning("reaper: resolved stuck message", message_id=message_id)

    return resolved


async def _resolve_if_still_pending(
    pool: asyncpg.Pool, names: dict[str, str], *, message_id: str
) -> bool:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT status, classified_language FROM {names['messages']} WHERE id = $1",
            message_id,
        )
        if row is None or row["status"] != MessageStatus.pending.value:
            # Already resolved by the worker that owned it (or the row vanished).
            return False

        language = hint_to_language(row["classified_language"])
        await conn.execute(
            f"UPDATE {names['messages']} SET status = $2, content = $3, error = $4 WHERE id = $1",
            message_id,
            MessageStatus.failed.value,
            get_timeout_message(language),
            "reaped: worker did not ack within the stuck threshold",
        )
        return True


async def run_reaper_loop(
    *,
    pool: asyncpg.Pool,
    stream: TurnStream,
    min_idle_ms: int,
    interval_s: int,
    stop_event: asyncio.Event,
) -> None:
    """Runs until ``stop_event`` is set. Call from the app lifespan as a
    background task; cancel/set the event on shutdown."""
    while not stop_event.is_set():
        try:
            await reap_stuck_entries(pool=pool, stream=stream, min_idle_ms=min_idle_ms)
        except Exception as exc:  # the reaper must never die
            _log.error("reaper: pass failed", error=str(exc))
        with contextlib.suppress(TimeoutError):
            await asyncio.wait_for(stop_event.wait(), timeout=interval_s)
