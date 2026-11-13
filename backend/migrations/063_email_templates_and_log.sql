-- Staff-composable email templates, a send/notification log, and the two
-- "always notify this address too" settings (head astrologer + admin).
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE email_log (
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
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at DESC);

ALTER TABLE platform_settings ADD COLUMN notify_admin_email TEXT;
ALTER TABLE platform_settings ADD COLUMN notify_head_astrologer_email TEXT;
