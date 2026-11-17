-- Extends the "become an astrologer" application (010) with the fields a
-- real public application form needs: personal/contact info beyond the
-- linked account, richer professional info, and supporting documents.
-- resume_data is a base64 data URL, same "no object storage" pattern as
-- banners/chat images (see bannerRepository.ts) — capped in the API layer,
-- not here. drive_link is a plain URL for anything too large/numerous for
-- a single PDF upload.
ALTER TABLE astrologer_applications ADD COLUMN full_name TEXT;
ALTER TABLE astrologer_applications ADD COLUMN phone_number TEXT;
ALTER TABLE astrologer_applications ADD COLUMN email TEXT;
ALTER TABLE astrologer_applications ADD COLUMN languages TEXT;
ALTER TABLE astrologer_applications ADD COLUMN bio TEXT;
ALTER TABLE astrologer_applications ADD COLUMN resume_data TEXT;
ALTER TABLE astrologer_applications ADD COLUMN drive_link TEXT;
