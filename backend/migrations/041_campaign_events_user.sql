-- Per-user attribution for campaign_events (see 040_campaign_events.sql) —
-- now that the Ganesh Chaturthi campaign requires login before browsing
-- anything, every event can carry who did it, so the dashboard can show a
-- per-user feature-usage breakdown alongside the anonymous aggregate counts.
-- Nullable: older rows (recorded before this migration, or a rare event
-- fired before the user's info was available client-side) simply won't
-- have one.
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS user_phone TEXT;

CREATE INDEX IF NOT EXISTS campaign_events_user_email_idx ON campaign_events (user_email);
