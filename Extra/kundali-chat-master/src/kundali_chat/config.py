"""Application settings loaded from environment variables.

Layout: nested pydantic models keyed by subsystem. Environment variables use
the `__` delimiter, e.g. ``POSTGRES__DSN`` maps to ``settings.postgres.dsn``.
A single ``get_settings()`` accessor is the only sanctioned way to read
settings in production code; tests construct ``Settings()`` directly to
override per-test.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import BaseModel, Field, RedisDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class PostgresSettings(BaseModel):
    dsn: str = Field(..., description="postgresql:// DSN. asyncpg-compatible.")
    pool_min: int = 5
    pool_max: int = 20
    statement_timeout_ms: int = 30_000


class RedisSettings(BaseModel):
    url: RedisDsn
    kundali_ttl_s: int = 24 * 60 * 60
    # Must stay comfortably above processing.block_ms (default 5s) — a
    # blocking XREADGROUP call holds its connection open for up to that
    # long, and redis-py's client-side socket read timeout does NOT
    # auto-extend for the command's own BLOCK duration (confirmed via a
    # Docker smoke test: every idle poll cycle logged a spurious
    # "Timeout reading from redis" error at exactly the block interval).
    socket_timeout_s: float = 30.0


class KundaliApiSettings(BaseModel):
    """The Astro Kundli Engine. ``base_url=None`` keeps the service running
    against the placeholder client; set it to the engine (e.g.
    ``https://kundali.astroarunpandit.org/api``) to compute real charts from
    birth details. Auth is a ``permanent_access`` JWT the engine client mints
    lazily from ``app_id`` via ``/auth/generate-token`` — supply ``api_key``
    only to pin a pre-minted token instead."""

    base_url: str | None = None
    timeout_s: float = 15.0
    app_id: str = "kundali-chat"
    api_key: SecretStr | None = None


class TredevAstroApiSettings(BaseModel):
    """Our own Express backend (Swiss-Ephemeris verified). Preferred over
    ``kundali_api`` (the third-party engine) when both are set — see
    ``api/app.py::_build_kundali_origin_client``."""

    base_url: str | None = None
    timeout_s: float = 15.0


class LLMSettings(BaseModel):
    """Single active low-cost completion provider. See ``llm/active_route.py``
    — deliberately not a routing table, since this service has exactly one
    job (astrologer completion), unlike ai-core's multi-tier composer.

    Defaults to ``mock`` (canned replies, no network/API key) so the service
    runs end-to-end locally with zero LLM config; set ``LLM__PROVIDER`` to a
    real provider + its API key once one is available."""

    provider: Literal["gemini", "sarvam", "openrouter", "mock"] = "mock"
    model: str = "gemini-2.5-flash"
    # Headroom so multi-message Hinglish replies don't get truncated mid-sentence
    # (finish_reason=length). 3-4 short messages fit comfortably under this.
    max_tokens: int = 1200
    temperature: float = 0.4
    gemini_api_key: SecretStr | None = None
    sarvam_api_key: SecretStr | None = None
    openrouter_api_key: SecretStr | None = None
    fallback_provider: Literal["gemini", "sarvam", "openrouter", "mock"] | None = None
    fallback_model: str | None = None


class ProcessingSettings(BaseModel):
    """Redis Streams processing knobs."""

    stream_key: str = "kundali_chat:turns"
    consumer_group: str = "kundali_chat_workers"
    worker_concurrency: int = 4
    block_ms: int = 5_000
    stuck_threshold_s: int = 45
    reaper_interval_s: int = 30


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore",
    )

    env: Literal["local", "ci", "staging", "prod"] = "local"

    # Table names (TABLES__SESSIONS / TABLES__MESSAGES) are deliberately NOT
    # part of this tree — see kundali_chat.models.tables.resolve_table_names().
    # Keeping them on a separate, dependency-free settings object means
    # resolving a table name never requires Postgres/Redis to be configured
    # (e.g. importing the models module in a script or test that has no DB).
    postgres: PostgresSettings
    redis: RedisSettings
    kundali_api: KundaliApiSettings = KundaliApiSettings()
    tredevastro_api: TredevAstroApiSettings = TredevAstroApiSettings()
    llm: LLMSettings = LLMSettings()
    processing: ProcessingSettings = ProcessingSettings()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide ``Settings`` singleton."""
    return Settings()  # type: ignore[call-arg]  # required fields come from env
