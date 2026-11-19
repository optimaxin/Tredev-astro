-- Per-user page-view trail for the admin/staff Users drawer — "where has
-- this account actually been browsing on the site" (see pageViewRepository.ts).
-- Anonymous visits aren't logged (no user_id to attribute them to), so this
-- only ever grows for an authenticated request.
CREATE TABLE page_views (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_page_views_user_id ON page_views(user_id, created_at DESC);
