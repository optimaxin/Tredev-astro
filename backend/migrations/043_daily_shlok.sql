-- One shlok per calendar day for the Panchang card's footer line, editable
-- from the staff console (admin.routes.ts, section 'shlok'). A day with no
-- row here is a normal state, not a gap to fill: the card falls back to its
-- own built-in line.
--
-- Keyed by the same 'YYYY-MM-DD' string every Panchang endpoint already
-- takes rather than a DATE/timestamp column — dates in this app are always
-- an IST calendar day the user picked, and a timestamp type invites a
-- timezone conversion that lands the shlok on the wrong day.
CREATE TABLE IF NOT EXISTS daily_shlok (
  shlok_date TEXT PRIMARY KEY,
  text_en TEXT NOT NULL,
  text_hi TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
