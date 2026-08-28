# kundali-chat

LLM-powered Vedic-astrologer chat for the free Kundali generator result
page. A standalone Python service — FastAPI + LangGraph + Redis Streams +
Postgres, no Kafka. Originally built inside the `astro-ai` monorepo
(mirroring its `ai-core` service's conventions) and later extracted here as
its own independent project.

## Architecture

```
Frontend (kundali result page)
        │  X-User-Id header (optional)
        ▼
POST /sessions ──────► fetch kundali (real API if KUNDALI_API__BASE_URL is
        │               set, else a placeholder fixture)
        │               → cache in Redis, persist copy in Postgres
        │               → generate greeting synchronously, return session_id
        ▼
POST /sessions/{id}/messages
        │  insert user row + assistant placeholder row (status=pending)
        │  XADD kundali_chat:turns  →  returns 202 fast
        ▼
Redis Stream "kundali_chat:turns" (consumer group "kundali_chat_workers")
        │  N worker coroutines per pod, XREADGROUP loop
        ▼
LangGraph turn: context_assembly → astrologer_answer(+enrichment) → safety_filter
        │  writes assistant row: status=complete/failed + telemetry
        │  XACK
        ▼
GET /sessions/{id}/messages?after=... ── poll, plain Postgres read
```

A periodic reaper resolves stream entries stuck in a crashed worker's
pending-entries-list to `failed` (with a localized timeout message) without
re-running the LLM call, avoiding double-answering on crash recovery.

## Endpoints

- `GET /health` — liveness/readiness.
- `POST /sessions` — body `{"kundali_session_ref": "<external session id>"}`.
  Fetches + caches the kundali, generates the first-turn greeting
  synchronously, returns `{"session_id": "<uuid>"}`.
- `POST /sessions/{id}/messages` — body `{"content": "<user message>"}`.
  Returns `202 {"message_id": "<uuid>"}` immediately; processing happens
  asynchronously via the Redis Stream.
- `GET /sessions/{id}/messages?after=<message_id>&limit=50` — poll for new
  messages since the given cursor (omit `after` for the most recent page).
  Each message has a `status` of `pending`, `complete`, or `failed`.

Auth: an optional `X-User-Id` header (any UUID) is recorded as
`anon_user_id` for analytics — anonymous public users, not staff, so it's
never required and an invalid value is silently ignored rather than
rejected.

## Environment variables

| Var | Purpose | Default |
|---|---|---|
| `POSTGRES__DSN` | Postgres DSN | *required* |
| `POSTGRES__POOL_MIN` / `POSTGRES__POOL_MAX` | asyncpg pool sizing | `5` / `20` |
| `REDIS__URL` | Redis connection URL | *required* |
| `REDIS__KUNDALI_TTL_S` | Kundali cache TTL | `86400` (24h) |
| `REDIS__SOCKET_TIMEOUT_S` | Client socket read timeout — must stay above `PROCESSING__BLOCK_MS` | `30.0` |
| `TABLES__SESSIONS` / `TABLES__MESSAGES` | Table names — the single source of truth is `resolve_table_names()`, never a literal | `kundali_sessions` / `kundali_messages` |
| `LLM__PROVIDER` | `gemini` or `sarvam` | `gemini` |
| `LLM__MODEL` | Model id for the active provider | `gemini-2.5-flash` |
| `LLM__MAX_TOKENS` | Cost guard — max tokens per reply | `700` |
| `LLM__GEMINI_API_KEY` / `LLM__SARVAM_API_KEY` | Provider API keys (only the active one is required) | — |
| `LLM__FALLBACK_PROVIDER` / `LLM__FALLBACK_MODEL` | Optional one-hop fallback on a transient provider error | — |
| `KUNDALI_API__BASE_URL` / `KUNDALI_API__API_KEY` | The internal Kundali API. Unset → the placeholder client is used | — |
| `PROCESSING__WORKER_CONCURRENCY` | Worker coroutines per pod | `4` |
| `PROCESSING__STUCK_THRESHOLD_S` | Reaper: how long a pending message can sit before being resolved to failed | `45` |
| `PROCESSING__REAPER_INTERVAL_S` | Reaper tick interval | `30` |

## Known gaps (tracked, not silent)

- **Kundali API request contract is unconfirmed.** The RESPONSE shape is
  real (`kundali/real_client.py` adapts it — confirmed against an actual
  sample payload, including a fix where the moon/Chandra chart's "Lagna" is
  the Moon's own sign, not the true Ascendant's). The REQUEST side (endpoint
  path, HTTP method, auth header) is still an assumption — see
  `RealKundaliApiClient`'s docstring for exactly what's assumed and the one
  place to fix it once the real contract is confirmed. `api/app.py`'s
  lifespan already switches to it automatically once `KUNDALI_API__BASE_URL`
  is set; until then it falls back to the placeholder client.
- **No message cap enforced (v1).** `kundali_sessions.message_count`
  increments on every turn regardless, so a cap check is a one-line addition
  later without restructuring.

## Local run

```bash
docker compose up -d postgres redis

uv sync --group dev
export POSTGRES__DSN=postgresql://kundali_chat:kundali_chat_dev@localhost:5432/kundali_chat
export REDIS__URL=redis://localhost:6379/0
export LLM__PROVIDER=gemini
export LLM__GEMINI_API_KEY=<your key>

uv run alembic upgrade head
uv run python -m kundali_chat.entrypoints.api   # http://localhost:8000
```

## Tests

```bash
uv run pytest -m "not integration"        # unit only, fast
uv run pytest -m integration --no-cov     # testcontainers Postgres + Redis (needs Docker)
uv run ruff check src tests
uv run pyright
```

## Docker

```bash
docker build -t kundali-chat:test .
docker compose up -d postgres redis

docker run --rm --network kundali-chat_default \
  -e POSTGRES__DSN=postgresql://kundali_chat:kundali_chat_dev@postgres:5432/kundali_chat \
  -e REDIS__URL=redis://redis:6379/0 \
  --entrypoint alembic kundali-chat:test upgrade head

docker run -d --name kundali-chat-api --network kundali-chat_default \
  -e POSTGRES__DSN=postgresql://kundali_chat:kundali_chat_dev@postgres:5432/kundali_chat \
  -e REDIS__URL=redis://redis:6379/0 \
  -e LLM__PROVIDER=gemini -e LLM__GEMINI_API_KEY=<your key> \
  -p 8010:8000 kundali-chat:test

curl http://localhost:8010/health
```

## Deploy

`k8s/` is a self-contained Kustomize base: `namespace.yaml`,
`configmap.yaml`, `secret.example.yaml` (template only — apply the real
Secret out-of-band), `migrate-job.yaml`, `deployment.yaml`, `service.yaml`.

```bash
kubectl apply -k k8s/
kubectl create secret generic kundali-chat-secrets -n kundali-chat \
  --from-literal=POSTGRES__DSN='postgresql://...' \
  --from-literal=REDIS__URL='redis://...' \
  --from-literal=LLM__GEMINI_API_KEY='...'
```

The `wait-for-postgres` / `wait-for-redis` init containers in
`deployment.yaml` and `migrate-job.yaml` assume Postgres/Redis are reachable
at the hostnames `postgres` / `redis` in the `kundali-chat` namespace —
update them to match your actual infra (this repo doesn't ship Postgres/
Redis StatefulSets of its own).
