-- AI token metering. One row per LLM call, written by the Python ai-core
-- service (ai-core/app/llm/usage_store.py) and read only by the admin panel.
--
-- Request-level rows are the single source of truth on purpose. Every figure
-- the Token Meter shows — per conversation, per user, per model, per day,
-- project-wide — is an aggregate over this table. Keeping only running
-- counters would make a wrong number impossible to audit or correct.
--
-- Scope note: this table deliberately holds NO prompt or response text. The
-- question a user asked lives in the conversation/message system; duplicating
-- it here would put user content in an analytics table for no benefit.

CREATE TABLE IF NOT EXISTS ai_usage (
  id            BIGSERIAL PRIMARY KEY,

  -- Idempotency. One LLM call = one row. A retry or a double-processed
  -- response must not be able to bill the same call twice, so the writer
  -- upserts on this key. It is (request_id, role) rather than request_id
  -- alone because one chat turn legitimately makes several calls —
  -- generation, intent classification, the quality judge — under one
  -- request id, and each is separately billable.
  request_id    TEXT NOT NULL,
  role          TEXT NOT NULL,

  user_id          TEXT,
  conversation_id  TEXT,

  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,

  -- NULL means "the provider did not report it", which is different from
  -- zero. A failed call reports nothing, and inventing 0 there would quietly
  -- understate real spend.
  input_tokens        INTEGER,
  output_tokens       INTEGER,
  total_tokens        INTEGER,
  cached_input_tokens INTEGER,
  reasoning_tokens    INTEGER,

  -- Costs are stored in USD because that is the currency every provider
  -- publishes prices in. The rupee figure the admin panel shows is derived
  -- at read time from fx_rate_usd_inr below, never stored as the primary
  -- value — an FX rate change must not silently rewrite history.
  input_cost_usd  NUMERIC(14, 8) NOT NULL DEFAULT 0,
  output_cost_usd NUMERIC(14, 8) NOT NULL DEFAULT 0,
  total_cost_usd  NUMERIC(14, 8) NOT NULL DEFAULT 0,

  -- What the provider says it actually charged, when it says anything.
  -- NULL is the honest value on a free tier or a provider that stays silent,
  -- and is why the UI labels the computed figure "Estimated".
  actual_cost_usd NUMERIC(14, 8),

  -- The pricing and FX actually applied to THIS row, snapshotted at write
  -- time. Recomputing an old row against today's price list would make last
  -- month's reported spend change, which is exactly what an audit trail must
  -- never do.
  input_price_per_million  NUMERIC(12, 6),
  output_price_per_million NUMERIC(12, 6),
  fx_rate_usd_inr          NUMERIC(12, 6),

  latency_ms    INTEGER,

  -- 'success' | 'failed'
  status        TEXT NOT NULL DEFAULT 'success',
  error_code    TEXT,
  error_message TEXT,

  -- True when the primary model failed and the fallback answered. Worth
  -- knowing: a spike here means the primary is unhealthy, and the reported
  -- model is not the one that was configured.
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The idempotency guarantee itself.
CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_request_role_key
  ON ai_usage (request_id, role);

-- Indexes follow the dashboard's actual access patterns: a time window is
-- part of nearly every query, so the per-dimension indexes lead with the
-- dimension and carry created_at.
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx      ON ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx    ON ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_conv_created_idx    ON ai_usage (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_model_created_idx   ON ai_usage (model, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_provider_created_idx ON ai_usage (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_status_idx          ON ai_usage (status);


-- Published per-model prices, in USD per 1,000,000 tokens.
--
-- This table is the human-editable price list. It is NOT read when costing a
-- request — ai-core computes the cost at call time and snapshots the prices
-- onto the usage row above. This exists so the price list has one reviewable
-- home, and so a future admin screen can edit prices without a deploy.
--
-- effective_from/effective_to make a price change a new row rather than an
-- edit, so the list stays honest about what was charged when.
CREATE TABLE IF NOT EXISTS model_pricing (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,

  input_price_per_million         NUMERIC(12, 6) NOT NULL DEFAULT 0,
  output_price_per_million        NUMERIC(12, 6) NOT NULL DEFAULT 0,
  cached_input_price_per_million  NUMERIC(12, 6),
  reasoning_price_per_million     NUMERIC(12, 6),

  currency      TEXT NOT NULL DEFAULT 'USD',

  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS model_pricing_lookup_idx
  ON model_pricing (provider, model, effective_from DESC);

-- Current list prices, matching ai-core's MODEL_PRICES default. Seeded only
-- when empty so a later hand-edit is never clobbered on restart.
INSERT INTO model_pricing (provider, model, input_price_per_million, output_price_per_million)
SELECT * FROM (VALUES
  ('gemini',     'gemini-2.5-flash',              0.30, 2.50),
  ('gemini',     'gemini-2.5-flash-lite',         0.10, 0.40),
  ('openrouter', 'google/gemini-2.5-flash',       0.30, 2.50),
  ('openrouter', 'google/gemini-2.5-flash-lite',  0.10, 0.40),
  ('openrouter', 'openai/gpt-4o-mini',            0.15, 0.60)
) AS seed(provider, model, input_price_per_million, output_price_per_million)
WHERE NOT EXISTS (SELECT 1 FROM model_pricing);
