-- Pooja hub (nav "Pooja"): three modes plus a reading library.
-- - pooja_videos: staff-curated recorded aartis/bhajans (external video URL,
--   same "no object storage" constraint as the rest of this app — admin
--   pastes a hosted/YouTube link rather than uploading a file).
-- - pooja_group_sessions: a scheduled live pooja a pandit is running
--   (Zoom/Meet-style external meeting_url, same reasoning — this app has no
--   multi-party video infra of its own, only the 1:1 WebRTC call used for
--   astrologer consultations). price_paise is informational only for now;
--   no payment is wired to registration yet (see pooja_session_registrations).
-- - pooja_session_registrations: who RSVP'd to a group session — lets the
--   frontend show "You're registered" and reveal the meeting link.
-- - pooja_books: aarti/text library, either inline `content` or a `pdf_url`
--   (at least one is expected, enforced in the API layer, not here).
--
-- "Book a Pooja" (1:1) needs no new table at all — it reuses the existing
-- astrologer catalog + consultation request flow (see admin: an astrologer
-- tagged with category "Pooja" shows up under this hub's 1:1 tab).

CREATE TABLE IF NOT EXISTS pooja_videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS pooja_group_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pandit_name TEXT NOT NULL,
  scheduled_at BIGINT NOT NULL,
  meeting_url TEXT,
  price_paise BIGINT,
  capacity INT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pooja_group_sessions_scheduled_at ON pooja_group_sessions(scheduled_at);

CREATE TABLE IF NOT EXISTS pooja_session_registrations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES pooja_group_sessions(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE (session_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_pooja_session_registrations_session ON pooja_session_registrations(session_id);

CREATE TABLE IF NOT EXISTS pooja_books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  category TEXT NOT NULL,
  content TEXT,
  pdf_url TEXT,
  created_at BIGINT NOT NULL
);
