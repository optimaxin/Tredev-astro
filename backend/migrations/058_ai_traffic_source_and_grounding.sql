-- AI analytics: separate real user traffic from internal traffic, and record
-- per-turn grounding/citation quality for the admin panel.
--
-- Additive only. ai-core detects whether these columns exist before writing
-- them, so it can be deployed before or after this migration runs.

-- ── ai_usage.traffic_source ─────────────────────────────────────────
-- 'user' for real chat traffic; internal runs tag themselves:
-- 'evaluation' (scripts/eval_pipeline.py), 'profiling' (profile_turns.py),
-- 'security' (security_probe.py), 'benchmark', 'debug' (smoke/connection
-- checks). The Token Meter defaults to 'user' only.
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS traffic_source TEXT NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS ai_usage_traffic_created_idx ON ai_usage (traffic_source, created_at);

-- Backfill only rows that are unambiguously internal: produced on/after
-- 2026-11-12 by the evaluation, profiling, security and debugging scripts
-- (identified by their session-id prefixes, script user ids and the
-- benchmark judge role). Older rows are left as 'user' — they cannot be
-- classified with certainty and are for the team to review.
UPDATE ai_usage
SET traffic_source = CASE
    WHEN role LIKE 'job-benchmark%' THEN 'benchmark'
    WHEN split_part(COALESCE(conversation_id, ''), '-', 1) = 'eval' THEN 'evaluation'
    WHEN split_part(COALESCE(conversation_id, ''), '-', 1) = 'profile' THEN 'profiling'
    WHEN split_part(COALESCE(conversation_id, ''), '-', 1) = 'sec'
      OR user_id IN ('sec-user-a', 'sec-user-b') THEN 'security'
    ELSE 'debug'
  END
WHERE traffic_source = 'user'
  AND created_at >= '2026-11-12'
  AND (
    role LIKE 'job-benchmark%'
    OR split_part(COALESCE(conversation_id, ''), '-', 1) IN
       ('eval', 'profile', 'sec', 'dbg', 'verify', 'connection', 'pipeline', 'bench', 'e2e', 'trace')
    OR user_id IN ('-', 'nvidia-verify', 'connection-test', 'pipeline-verify-user',
                   'sec-user-a', 'sec-user-b')
  );

-- ── ai_evaluations: grounding and citation quality per turn ─────────
-- Written for every answered turn (not only judge-sampled ones), from
-- deterministic checks — no LLM involved.
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS rag_chunks INTEGER;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS citations_count INTEGER;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS invalid_citations INTEGER;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS chart_claims INTEGER;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS chart_contradictions_in_draft INTEGER;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS validation_action TEXT;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS language_ok BOOLEAN;
ALTER TABLE ai_evaluations ADD COLUMN IF NOT EXISTS traffic_source TEXT NOT NULL DEFAULT 'user';
