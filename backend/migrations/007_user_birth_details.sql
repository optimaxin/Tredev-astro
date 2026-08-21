-- Optional birth details captured at registration, so a user doesn't have
-- to retype them on every calculator (Free Kundli, Nakshatra, etc.).
ALTER TABLE users ADD COLUMN birth_date TEXT;
ALTER TABLE users ADD COLUMN birth_time TEXT;
ALTER TABLE users ADD COLUMN birth_place TEXT;
ALTER TABLE users ADD COLUMN birth_latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN birth_longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN birth_timezone_offset_minutes INTEGER;
