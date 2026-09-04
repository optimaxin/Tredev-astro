-- The user now picks how long a consultation should run for at booking
-- time (duration_minutes); extended_minutes accumulates any top-ups added
-- during the call. expires_at is deliberately NOT stored — it's always
-- computed as started_at + (duration_minutes + extended_minutes) * 60000,
-- which can never drift out of sync with the two numbers that define it.
ALTER TABLE consultations ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 20;
ALTER TABLE consultations ADD COLUMN extended_minutes INTEGER NOT NULL DEFAULT 0;

-- Carries the chosen duration through the "queued, not yet assigned" state
-- so it survives onto the Consultation once promoteOneIfCapacity creates one.
ALTER TABLE queue_entries ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 20;
