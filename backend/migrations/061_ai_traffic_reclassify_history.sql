-- AI analytics: stop counting unverifiable historical rows as real users.
--
-- Migration 058 backfilled only rows created on/after 2026-11-12 from known
-- script prefixes and left everything else as 'user'. An audit on 2026-11-13
-- (docs: ai-core docs/rc1/migration-058-audit.md) found that every row it left
-- as 'user' was either provably internal (dev sessions named style-,
-- tokenmeter-, verify-, eval-, local-) or could not be tied to any registered
-- account. This migration:
--   1. relabels rows whose session id carries an internal-script prefix,
--   2. relabels the remaining pre-2026-11-13 'user' rows that belong to no
--      registered account as 'unknown' (not real, not internal: unverified),
--   3. copies the corrected label onto ai_evaluations rows (058 never
--      backfilled that table) and labels evaluations written by the test suite.
--
-- Rows created from 2026-11-13 on are only touched by step 1 (prefix rules).
-- Every change is recorded in ai_traffic_reclassification, so the migration is
-- reversible: backend/migrations/rollback/061_down.sql restores the old values.
-- Nothing is deleted.

CREATE TABLE IF NOT EXISTS ai_traffic_reclassification (
  table_name  TEXT NOT NULL,
  row_id      TEXT NOT NULL,
  old_source  TEXT NOT NULL,
  new_source  TEXT NOT NULL,
  reason      TEXT NOT NULL,
  migration   TEXT NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (table_name, row_id, migration)
);

-- ── 1. internal-script session prefixes (any date) ───────────────────
WITH changed AS (
  UPDATE ai_usage u
  SET traffic_source = CASE split_part(COALESCE(u.conversation_id, ''), '-', 1)
      WHEN 'eval' THEN 'evaluation'
      WHEN 'profile' THEN 'profiling'
      WHEN 'sec' THEN 'security'
      WHEN 'pytest' THEN 'test'
      ELSE 'debug'
    END
  WHERE u.traffic_source = 'user'
    AND split_part(COALESCE(u.conversation_id, ''), '-', 1) IN
        ('eval', 'profile', 'sec', 'pytest', 'dbg', 'verify', 'connection', 'pipeline', 'bench',
         'e2e', 'trace', 'style', 'tokenmeter', 'local')
  RETURNING u.id::text AS row_id, u.traffic_source AS new_source
)
INSERT INTO ai_traffic_reclassification (table_name, row_id, old_source, new_source, reason, migration)
SELECT 'ai_usage', row_id, 'user', new_source, 'internal session-id prefix', '061' FROM changed
ON CONFLICT DO NOTHING;

-- ── 2. historical rows tied to no registered account ─────────────────
WITH changed AS (
  UPDATE ai_usage u
  SET traffic_source = 'unknown'
  WHERE u.traffic_source = 'user'
    AND u.created_at < '2026-11-13'
    AND NOT EXISTS (SELECT 1 FROM users a WHERE a.id = u.user_id)
  RETURNING u.id::text AS row_id
)
INSERT INTO ai_traffic_reclassification (table_name, row_id, old_source, new_source, reason, migration)
SELECT 'ai_usage', row_id, 'user', 'unknown', 'pre-2026-11-13, no registered account', '061' FROM changed
ON CONFLICT DO NOTHING;

-- ── 3. ai_evaluations follow the usage row of the same request ───────
WITH src AS (
  SELECT request_id, min(traffic_source) AS traffic_source
  FROM ai_usage
  WHERE request_id IS NOT NULL
  GROUP BY request_id
  HAVING count(DISTINCT traffic_source) = 1
), changed AS (
  UPDATE ai_evaluations e
  SET traffic_source = src.traffic_source
  FROM src
  WHERE e.request_id = src.request_id
    AND e.traffic_source = 'user'
    AND src.traffic_source <> 'user'
  RETURNING e.id::text AS row_id, e.traffic_source AS new_source
)
INSERT INTO ai_traffic_reclassification (table_name, row_id, old_source, new_source, reason, migration)
SELECT 'ai_evaluations', row_id, 'user', new_source, 'label of the matching ai_usage request', '061' FROM changed
ON CONFLICT DO NOTHING;

-- Evaluations with no usage row: same prefix rules, then the same
-- no-registered-account rule for history.
WITH changed AS (
  UPDATE ai_evaluations e
  SET traffic_source = CASE
      WHEN split_part(COALESCE(e.conversation_id, ''), '-', 1) = 'pytest' THEN 'test'
      WHEN split_part(COALESCE(e.conversation_id, ''), '-', 1) = 'eval' THEN 'evaluation'
      WHEN split_part(COALESCE(e.conversation_id, ''), '-', 1) = 'profile' THEN 'profiling'
      WHEN split_part(COALESCE(e.conversation_id, ''), '-', 1) = 'sec' THEN 'security'
      WHEN split_part(COALESCE(e.conversation_id, ''), '-', 1) IN
           ('dbg', 'verify', 'connection', 'pipeline', 'bench', 'e2e', 'trace', 'style', 'tokenmeter', 'local')
        THEN 'debug'
      ELSE 'unknown'
    END
  WHERE e.traffic_source = 'user'
    AND NOT EXISTS (SELECT 1 FROM ai_usage u WHERE u.request_id = e.request_id)
    AND (
      split_part(COALESCE(e.conversation_id, ''), '-', 1) IN
        ('pytest', 'eval', 'profile', 'sec', 'dbg', 'verify', 'connection', 'pipeline', 'bench', 'e2e',
         'trace', 'style', 'tokenmeter', 'local')
      OR (e.created_at < '2026-11-13' AND NOT EXISTS (SELECT 1 FROM users a WHERE a.id = e.user_id))
    )
  RETURNING e.id::text AS row_id, e.traffic_source AS new_source
)
INSERT INTO ai_traffic_reclassification (table_name, row_id, old_source, new_source, reason, migration)
SELECT 'ai_evaluations', row_id, 'user', new_source, 'no usage row: prefix or no registered account', '061'
FROM changed
ON CONFLICT DO NOTHING;
