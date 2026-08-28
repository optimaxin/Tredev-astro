"""Integration test fixtures — real Postgres + real Redis via testcontainers.
Gated by the ``integration`` marker (skipped in unit-only runs). No custom
image needed: this service uses core Postgres features only (no pgvector,
no pg_partman).
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer


@pytest.fixture(scope="session")
def postgres_container() -> Iterator[PostgresContainer]:
    container = PostgresContainer(
        image="postgres:17-alpine",
        username="kundali_chat",
        password="test",
        dbname="kundali_chat_test",
    )
    container.start()
    try:
        yield container
    finally:
        container.stop()


@pytest.fixture(scope="session")
def postgres_dsn(postgres_container: PostgresContainer) -> str:
    raw = postgres_container.get_connection_url()
    if raw.startswith("postgresql+"):
        _, rest = raw.split("://", 1)
        raw = "postgresql://" + rest
    return raw


@pytest.fixture(scope="session")
def redis_container() -> Iterator[RedisContainer]:
    container = RedisContainer(image="redis:7-alpine")
    container.start()
    try:
        yield container
    finally:
        container.stop()


@pytest.fixture(scope="session")
def redis_url(redis_container: RedisContainer) -> str:
    host = redis_container.get_container_host_ip()
    port = redis_container.get_exposed_port(6379)
    return f"redis://{host}:{port}/0"


@pytest.fixture(scope="session")
def env_for_settings(postgres_dsn: str, redis_url: str):
    """Set the env vars kundali_chat.config.Settings needs, once per session,
    so any module-level ``get_settings()``/``resolve_table_names()`` call
    (including inside alembic's env.py, run out-of-process) sees them."""
    old = {k: os.environ.get(k) for k in ("POSTGRES__DSN", "REDIS__URL")}
    os.environ["POSTGRES__DSN"] = postgres_dsn
    os.environ["REDIS__URL"] = redis_url
    yield
    for k, v in old.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v
