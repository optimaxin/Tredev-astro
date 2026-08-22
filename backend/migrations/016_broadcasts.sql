-- Site-wide admin announcements ("broadcasts") shown to every visitor —
-- replaces the old localStorage-only "Send Announcement" admin mock.
CREATE TABLE broadcasts (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_broadcasts_active ON broadcasts(active, created_at DESC);
