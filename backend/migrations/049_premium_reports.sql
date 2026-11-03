-- Ownership ledger for Stage 6 Premium Reports.
--
-- Why this table exists at all: the Stage 6 report service (kb_report/api.py,
-- FastAPI) has NO authentication and NO concept of a user — any caller who
-- knows a 16-hex report id can read that report's birth details and full
-- generated content. It is therefore never exposed to browsers. This backend
-- is the only thing that talks to it, and this table is the sole record of
-- WHO owns which report id. Every read/status/resume/export route joins
-- through here against req.user.id (from a verified token), so a report id
-- belonging to another user is indistinguishable from one that never existed.
--
-- Deliberately NOT stored here: the report content, the chart, the retrieval
-- evidence, or any provider credential. Those live in the Stage 6 store. Only
-- the minimum needed to list a user's own reports is duplicated.

CREATE TABLE IF NOT EXISTS premium_reports (
  id         BIGSERIAL PRIMARY KEY,

  -- The Stage 6 report id (uuid4().hex[:16]). Globally unique over there, so
  -- unique here too: one ledger row per generated report, never two owners.
  report_id  TEXT NOT NULL UNIQUE,

  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Duplicate-submission guard. The client sends a stable key per intent
  -- (one per filled-in form), so a double click, a retry after a network
  -- blip, or a page refresh mid-submit all collapse onto the row that
  -- already exists instead of starting a second expensive LLM run. Scoped
  -- per user so one user's key can never collide with or reveal another's.
  -- NULL is allowed (a caller that opts out), and Postgres treats NULLs as
  -- distinct in a UNIQUE index, so those rows simply never conflict.
  idempotency_key TEXT,

  -- Cached mirror of the Stage 6 status, refreshed on every status poll.
  -- Lets the "My Premium Reports" list render without fanning out one
  -- upstream request per report. Stage 6 remains the source of truth.
  status     TEXT NOT NULL DEFAULT 'queued',
  sections_done  INTEGER NOT NULL DEFAULT 0,
  sections_total INTEGER NOT NULL DEFAULT 0,

  report_type TEXT NOT NULL DEFAULT 'premium',
  language    TEXT NOT NULL DEFAULT 'en',

  -- Display-only metadata so the list can say which chart a report is for.
  -- Birth date/place are the user's own data on the user's own row, shown
  -- back only to that user. The authoritative birth details (and the chart)
  -- stay in the Stage 6 store; these are never used for any calculation.
  subject_name  TEXT,
  subject_date  TEXT,
  subject_place TEXT,

  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- The duplicate-submission guarantee itself.
CREATE UNIQUE INDEX IF NOT EXISTS premium_reports_user_idem_key
  ON premium_reports (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- The listing query: a user's own reports, newest first.
CREATE INDEX IF NOT EXISTS premium_reports_user_created_idx
  ON premium_reports (user_id, created_at DESC);
