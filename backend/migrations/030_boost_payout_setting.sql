-- Staff/Admin-configurable default payout share an astrologer keeps on a
-- Boost-attributed session (see boostRepository.ts's activateBoost, which
-- locks this value into the boost row at activation time — changing it here
-- only affects boosts activated AFTER the change, never past ones).
CREATE TABLE platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  boost_payout_share_percent INTEGER NOT NULL DEFAULT 70,
  CONSTRAINT platform_settings_single_row CHECK (id = 1)
);
INSERT INTO platform_settings (id, boost_payout_share_percent) VALUES (1, 70);
