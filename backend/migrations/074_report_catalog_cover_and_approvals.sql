-- Staff/admin-customizable report cover (color, a CSS pattern preset, and an
-- optional uploaded image — same base64 data-URL convention as avatars/
-- banners elsewhere in this app, there's no object storage service here).
ALTER TABLE astrology_reports ADD COLUMN cover_color TEXT;
ALTER TABLE astrology_reports ADD COLUMN cover_pattern TEXT;
ALTER TABLE astrology_reports ADD COLUMN cover_image TEXT;

-- A STAFF-proposed change to the catalog (create/update/delete) waits here
-- for an ADMIN to approve before it's actually applied — see
-- reportChangeRequestRepository.ts. `payload` is the full proposed row as
-- JSON (irrelevant for DELETE, which only needs report_id).
CREATE TABLE report_change_requests (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  report_id INTEGER,
  payload TEXT,
  requested_by TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at BIGINT NOT NULL,
  decided_at BIGINT,
  decided_by TEXT REFERENCES users(id)
);
CREATE INDEX idx_report_change_requests_status ON report_change_requests(status);
