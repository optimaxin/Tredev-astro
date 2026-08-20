-- The astrologer catalog — single source of truth for astrologer profile
-- data. realtimeStore.ts seeds its in-memory live state from this table
-- instead of a hardcoded array, so there is exactly one place this data lives.
CREATE TABLE astrologers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  languages TEXT NOT NULL DEFAULT '[]',          -- JSON array (SQLite has no array type)
  categories TEXT NOT NULL DEFAULT '[]',         -- JSON array
  expertise TEXT NOT NULL DEFAULT '[]',          -- JSON array
  consultation_types TEXT NOT NULL DEFAULT '["chat","voice","video"]', -- JSON array
  chat_price INTEGER NOT NULL DEFAULT 0,
  call_price INTEGER NOT NULL DEFAULT 0,
  video_price INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  experience_years INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_astrologers_active ON astrologers(is_active);
CREATE INDEX idx_astrologers_rating ON astrologers(rating);
