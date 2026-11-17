"""Python enums used for status / state columns.

Each enum maps to a PostgreSQL ``ENUM`` type with the same name (snake_case)
created explicitly in the initial migration, so migrations and model
definitions stay in lockstep (``create_type=False`` on the SQLAlchemy side).
"""

from __future__ import annotations

import enum


class MessageRole(enum.StrEnum):
    """``kundali_messages.role``."""

    user = "user"
    assistant = "assistant"


class MessageStatus(enum.StrEnum):
    """``kundali_messages.status`` — processing is asynchronous (Redis
    Streams), so the poll endpoint reads this to know when a reply lands."""

    pending = "pending"
    complete = "complete"
    failed = "failed"


class SessionState(enum.StrEnum):
    """``kundali_sessions.state``."""

    active = "active"
    ended = "ended"


class KundaliFetchStatus(enum.StrEnum):
    """``kundali_sessions.kundali_fetch_status`` — did the internal Kundali
    API call at session-creation time succeed?"""

    pending = "pending"
    ok = "ok"
    error = "error"
