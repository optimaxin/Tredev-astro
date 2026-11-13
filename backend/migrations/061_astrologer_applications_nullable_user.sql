-- "Join as Astrologer/Pandit" no longer requires logging in first — the
-- applicant may not have an account yet.
ALTER TABLE astrologer_applications ALTER COLUMN user_id DROP NOT NULL;
