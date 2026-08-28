"""A dev-only single-page playground served at ``/`` for manually driving the
chat flow (create session → greeting → send message → poll for the reply)
from a browser, instead of curl. Read from disk per request so the HTML can
be tweaked without a server restart. Not included in the OpenAPI schema.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter()

_PLAYGROUND_HTML = Path(__file__).parent.parent / "static" / "playground.html"


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def playground() -> HTMLResponse:
    return HTMLResponse(_PLAYGROUND_HTML.read_text(encoding="utf-8"))
