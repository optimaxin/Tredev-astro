-- Real "become an astrologer" applications — previously a localStorage-only
-- concept on the frontend with no server record at all.
CREATE TABLE astrologer_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expertise TEXT NOT NULL,
  experience TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_at BIGINT NOT NULL,
  decided_at BIGINT
);
CREATE INDEX idx_astrologer_applications_user_id ON astrologer_applications(user_id);
CREATE INDEX idx_astrologer_applications_status ON astrologer_applications(status);
