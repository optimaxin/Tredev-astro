-- Voice/video call recordings, staff-only, auto-purged 10 days after
-- creation (see realtimeStore.ts's deleteExpiredCallRecordings, ticked from
-- main.ts). Calls are peer-to-peer WebRTC (sockets.ts's signaling relay
-- never sees raw audio), so the recording itself is captured client-side
-- (CallWindow.tsx mixes local+remote audio via MediaRecorder) and uploaded
-- here as one blob per consultation once the call ends.
--
-- Stored as BYTEA in the same Postgres database as everything else (not a
-- new object-store dependency) — the 10-day expiry keeps total volume
-- bounded regardless of call length/volume.
CREATE TABLE IF NOT EXISTS call_recordings (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id),
  mime_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_recordings_consultation ON call_recordings(consultation_id);
CREATE INDEX IF NOT EXISTS idx_call_recordings_expires_at ON call_recordings(expires_at);
