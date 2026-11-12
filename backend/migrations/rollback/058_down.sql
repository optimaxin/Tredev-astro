-- Reverses 058_ai_traffic_source_and_grounding.sql. NOT run automatically.
-- DESTRUCTIVE: drops the traffic labels and the per-turn grounding columns
-- (their data is lost). Take a backup first and reverse 061 before this.
-- Only needed if the Token Meter must go back to the pre-058 release: that
-- code ignores these columns, so leaving them in place is also safe.
DROP INDEX IF EXISTS ai_usage_traffic_created_idx;
ALTER TABLE ai_usage DROP COLUMN IF EXISTS traffic_source;
ALTER TABLE ai_evaluations
  DROP COLUMN IF EXISTS rag_chunks,
  DROP COLUMN IF EXISTS citations_count,
  DROP COLUMN IF EXISTS invalid_citations,
  DROP COLUMN IF EXISTS chart_claims,
  DROP COLUMN IF EXISTS chart_contradictions_in_draft,
  DROP COLUMN IF EXISTS validation_action,
  DROP COLUMN IF EXISTS language_ok,
  DROP COLUMN IF EXISTS traffic_source;
DELETE FROM _migrations WHERE name = '058_ai_traffic_source_and_grounding.sql';
