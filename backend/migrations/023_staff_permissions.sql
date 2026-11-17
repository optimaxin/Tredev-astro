-- Per-STAFF-member admin console section access. ADMIN always has every
-- section regardless of this table; a STAFF row's `sections` array is the
-- exact set of admin console pages that account can reach, toggled from the
-- admin's Staff management page. No row for a user = no access yet.
CREATE TABLE staff_permissions (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'
);
