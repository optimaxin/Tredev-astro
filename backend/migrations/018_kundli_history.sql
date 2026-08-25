-- Per-user Kundli history — only the birth-detail inputs are stored, not
-- the large computed KundliFullResult JSON. The full result is always
-- recomputed on view, so a future accuracy fix (like this session's
-- Ascendant/RAMC bug fix) is reflected immediately instead of a saved
-- snapshot freezing in whatever bug existed at save time.
CREATE TABLE kundli_history (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  timezone_offset_minutes INTEGER NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_label TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_kundli_history_user_id ON kundli_history(user_id);
