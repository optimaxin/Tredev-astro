-- Staff-composable email templates, a send/notification log, and the two
-- "always notify this address too" settings (head astrologer + admin).
-- IF NOT EXISTS / IF NOT EXISTS / IF NOT EXISTS throughout: the migration
-- runner tracks applied files by filename (see db.ts's runMigrations), so a
-- renumbered or re-run file must not fail just because the objects are
-- already there.
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  template_id TEXT,
  event_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
  error TEXT,
  sent_by TEXT,
  sent_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_log(sent_at DESC);

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS notify_admin_email TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS notify_head_astrologer_email TEXT;
