-- Consultations, waiting-queue entries, astrologer notifications, and the
-- request-idempotency cache were all in-memory Maps before this migration —
-- meaning every active booking, queued user, and notification was silently
-- lost on every server restart. This is the durable version of that state.

CREATE TABLE consultations (
  id TEXT PRIMARY KEY,
  astrologer_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  from_queue INTEGER NOT NULL DEFAULT 0,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  started_at INTEGER,
  ended_at INTEGER
);
CREATE INDEX idx_consultations_astrologer_id ON consultations(astrologer_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_user_email ON consultations(user_email);

CREATE TABLE queue_entries (
  id TEXT PRIMARY KEY,
  astrologer_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  request_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  promoted_consultation_id TEXT
);
CREATE INDEX idx_queue_entries_astrologer_id ON queue_entries(astrologer_id);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);
CREATE INDEX idx_queue_entries_user_email ON queue_entries(user_email);

CREATE TABLE astrologer_notifications (
  id TEXT PRIMARY KEY,
  astrologer_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  related_consultation_id TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_astrologer_notifications_astrologer_id ON astrologer_notifications(astrologer_id);
CREATE INDEX idx_astrologer_notifications_created_at ON astrologer_notifications(created_at);

-- Idempotency cache for /consultations/request — a retried or duplicate
-- submit of the same requestId must always return the original outcome,
-- even across a restart, or a retry right after a crash could double-book.
CREATE TABLE processed_requests (
  request_id TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
