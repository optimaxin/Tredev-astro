-- Per-astrologer override of the global Boost payout share (platform_settings,
-- migration 030) — lets staff set a different split for a specific
-- astrologer instead of only the platform-wide default. NULL means "use the
-- global default" (see boostRepository.ts's activateBoost).
ALTER TABLE astrologers ADD COLUMN boost_payout_override_percent INTEGER;
