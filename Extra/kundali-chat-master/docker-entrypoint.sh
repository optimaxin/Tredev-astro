#!/bin/sh
# Container start: run DB migrations (idempotent), then launch the API.
# Used as the image's default CMD so PaaS (Render) needs no shell-quoted
# override. K8s overrides `command:` per-pod, so it's unaffected by this.
set -e
echo "[entrypoint] running migrations: alembic upgrade head"
alembic upgrade head
echo "[entrypoint] starting api on port ${PORT:-8000}"
exec python -m kundali_chat.entrypoints.api
