-- Generic click/event log for the Ganesh Chaturthi campaign microsite (and
-- any future campaign) — deliberately not tied to a logged-in user (most
-- campaign visitors are anonymous), so this is just (what happened, which
-- option) counts over time, not per-user behavior tracking.
CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_label TEXT NOT NULL,
  meta JSONB,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_events_type_idx ON campaign_events (event_type);
CREATE INDEX IF NOT EXISTS campaign_events_created_at_idx ON campaign_events (created_at);
