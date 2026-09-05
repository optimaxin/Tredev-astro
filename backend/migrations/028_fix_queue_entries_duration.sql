-- 025_consultation_duration.sql already added this column in its source —
-- but that migration had already been recorded as applied by the time the
-- queue_entries line was added to it, so the migration runner (which never
-- re-runs a filename it's already seen) silently never executed it. Redone
-- here as its own migration, guarded so it's a no-op if it somehow did apply.
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 20;
