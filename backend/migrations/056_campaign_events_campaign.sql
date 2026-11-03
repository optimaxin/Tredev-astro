-- Tags every campaign_events row with which campaign microsite it came from
-- (see 040_campaign_events.sql) — needed now that a second campaign
-- (Navratri) shares this same table with the original Ganesh Chaturthi one,
-- so the dashboard can show one campaign at a time instead of everything
-- merged together. Existing rows predate this column and are all from the
-- Ganesh Chaturthi site, so they're backfilled rather than left NULL.
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS campaign TEXT;
UPDATE campaign_events SET campaign = 'ganesh-chaturthi' WHERE campaign IS NULL;

CREATE INDEX IF NOT EXISTS campaign_events_campaign_idx ON campaign_events (campaign);
