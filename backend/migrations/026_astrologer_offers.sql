-- Percentage discount an astrologer can self-toggle (0 = off, else 20/50/75).
ALTER TABLE astrologers ADD COLUMN active_offer_percent INTEGER NOT NULL DEFAULT 0;

-- Automatic price-increase offer: when an astrologer raises a price,
-- updateAstrologerProfile snapshots the OLD per-type prices here and honors
-- them for every user for 30 days before the increase actually takes effect.
-- Astrologers can't toggle this manually.
ALTER TABLE astrologers ADD COLUMN price_increase_old_chat_price INTEGER;
ALTER TABLE astrologers ADD COLUMN price_increase_old_call_price INTEGER;
ALTER TABLE astrologers ADD COLUMN price_increase_old_video_price INTEGER;
ALTER TABLE astrologers ADD COLUMN price_increase_expires_at BIGINT;

-- Per (user, astrologer) loyalty — becomes loyal once combined completed
-- session time with that specific astrologer exceeds 15 minutes.
CREATE TABLE user_astrologer_loyalty (
  user_email TEXT NOT NULL,
  astrologer_id INTEGER NOT NULL,
  total_ms BIGINT NOT NULL DEFAULT 0,
  is_loyal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_email, astrologer_id)
);

-- Locked in at session start (realtimeStore.ts's createConsultation) so
-- neither an offer toggle nor the user crossing the loyalty threshold
-- mid-session retroactively changes what a session already in progress
-- is charging.
ALTER TABLE consultations ADD COLUMN price_per_min INTEGER NOT NULL DEFAULT 0;
-- REAL, not INTEGER: a loyal user's applied percent is half the astrologer's
-- offer (e.g. 75% -> 37.5%).
ALTER TABLE consultations ADD COLUMN applied_offer_percent REAL NOT NULL DEFAULT 0;
