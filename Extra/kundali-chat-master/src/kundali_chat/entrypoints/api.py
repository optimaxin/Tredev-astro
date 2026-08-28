"""API service entrypoint — uvicorn boot for :func:`create_app`.

Run: ``uv run python -m kundali_chat.entrypoints.api`` (local dev) or via
the Dockerfile CMD in K8s.
"""

from __future__ import annotations

from kundali_chat.api.app import create_app
from kundali_chat.shared.logging import configure_logging

configure_logging()
app = create_app()


def main() -> None:  # pragma: no cover
    import os

    import uvicorn

    # Honor $PORT (Render/most PaaS inject it); default 8000 for local/K8s.
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("kundali_chat.entrypoints.api:app", host="0.0.0.0", port=port)


if __name__ == "__main__":  # pragma: no cover
    main()
