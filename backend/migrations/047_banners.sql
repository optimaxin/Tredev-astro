-- Staff-managed homepage promo banners (see CampaignBanner.tsx). Media is
-- stored as a base64 data URL in a TEXT column, same pattern as chat
-- IMAGE/AUDIO messages (chatMessageRepository.ts) — no object-storage
-- dependency exists in this app, and banners are capped at 7 rows with a
-- ~5MB raw-file limit each, so this stays small. expires_at is nullable:
-- NULL means "never expires" (removed only by staff), otherwise the hourly
-- sweep in main.ts deletes the row once it's past expiry.
CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_data TEXT NOT NULL,
  link_url TEXT,
  created_at BIGINT NOT NULL,
  expires_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_banners_expires_at ON banners(expires_at);
