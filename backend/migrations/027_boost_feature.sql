-- Astrologer-only visibility boost. Never shown to or affecting users'
-- price/payment — purely a 30-minute visibility window plus a reduced
-- payout share on whichever sessions get attributed to it.
CREATE TABLE boosts (
  id SERIAL PRIMARY KEY,
  astrologer_id INTEGER NOT NULL,
  started_at BIGINT NOT NULL,
  ends_at BIGINT NOT NULL, -- started_at + 30 min; visibility window only
  payout_share_percent INTEGER NOT NULL DEFAULT 70 -- astrologer's reduced share on boost-attributed sessions
);
CREATE INDEX idx_boosts_astrologer ON boosts(astrologer_id);

-- One row per user a boost has granted eligibility to — created when that
-- user joins the waitlist while the boost is active, expiring 7 days later
-- per the spec. Consumed (linked to a real consultation) the moment that
-- user's next session with this astrologer actually starts.
CREATE TABLE boost_attributions (
  id SERIAL PRIMARY KEY,
  boost_id INTEGER NOT NULL REFERENCES boosts(id) ON DELETE CASCADE,
  astrologer_id INTEGER NOT NULL,
  user_email TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  consumed_consultation_id TEXT
);
CREATE INDEX idx_boost_attributions_lookup ON boost_attributions(astrologer_id, user_email, consumed_consultation_id);

ALTER TABLE consultations ADD COLUMN boost_id INTEGER;
