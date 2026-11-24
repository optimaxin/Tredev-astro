-- Lets staff/admin override any site text string or image shown via the
-- frontend's t() translation lookup — keyed by the same translation key
-- (e.g. 'hero_title', 'nav_reports') the hardcoded English/Hindi/etc. copy
-- uses, or an ad-hoc key for a site image slot (e.g. 'home_hero_image').
-- A present row always wins over the hardcoded default, regardless of the
-- visitor's selected language — this is for one-off content/brand fixes,
-- not a full translation system.
CREATE TABLE IF NOT EXISTS content_overrides (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id),
  updated_at BIGINT NOT NULL
);
