# syntax=docker/dockerfile:1.7
# Multi-stage build. Single CMD — unlike ai-core's three entrypoints, this
# service has exactly one process type (the API, which also runs the
# in-process Redis Streams workers + reaper via its lifespan).

# -------------------------------------------------------------------------------
# Stage 1: builder — install uv, resolve deps, build the project wheel.
# -------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11.16 /uv /uvx /usr/local/bin/

ENV UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Resolve dependencies first (cached layer when lockfile is unchanged).
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Now copy the source and install the project itself.
COPY src/ ./src/
# Alembic config + versions so the same image can run `alembic upgrade head`.
COPY alembic.ini ./alembic.ini
COPY migrations/ ./migrations/
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# -------------------------------------------------------------------------------
# Stage 2: runtime — minimal, non-root.
# -------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

RUN apt-get update \
 && apt-get -y upgrade \
 && apt-get install -y --no-install-recommends curl libpq5 \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app -d /app -s /bin/false app

WORKDIR /app

COPY --from=builder --chown=app:app /app /app

# Start script: migrate then launch (default CMD; K8s overrides `command:`).
COPY --chown=app:app docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/src

USER app

EXPOSE 8000

CMD ["/app/docker-entrypoint.sh"]
