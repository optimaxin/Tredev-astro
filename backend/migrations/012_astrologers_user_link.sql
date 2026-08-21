-- Links a catalog row to the real user account that owns it. NULL for the
-- originally-seeded demo roster (no real account behind them); set when an
-- astrologer_application is approved and a real catalog row is created for
-- that user.
ALTER TABLE astrologers ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_astrologers_user_id ON astrologers(user_id);
