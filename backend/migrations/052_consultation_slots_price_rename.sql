-- 051 was already applied (via a long-running dev server's auto-reload)
-- before its price_paise -> price rename landed in the file — migrations
-- never get re-run once recorded, so fix the live column here instead of
-- editing 051 after the fact. Rupees, not paise (see 051's own comment).
ALTER TABLE consultation_slots RENAME COLUMN price_paise TO price;
