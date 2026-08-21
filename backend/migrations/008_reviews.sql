-- Real per-astrologer reviews, tied to an actual completed consultation so a
-- review can't be posted without having actually had one — one review per
-- consultation, enforced at the DB level via the UNIQUE constraint.
CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  astrologer_id INTEGER NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_reviews_astrologer_id ON reviews(astrologer_id);
