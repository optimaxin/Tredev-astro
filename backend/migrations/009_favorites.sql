-- "Saved Astrologers" — a plain many-to-many bookmark, no soft-delete needed
-- since un-favoriting is just removing the row.
CREATE TABLE favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  astrologer_id INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, astrologer_id)
);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
