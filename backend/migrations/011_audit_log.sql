-- Real admin audit trail — previously a localStorage array on the frontend,
-- meaning it was per-browser and trivially editable by whoever's logged in.
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
