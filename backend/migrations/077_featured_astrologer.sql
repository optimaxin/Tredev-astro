-- The site's one "Featured/Celebrity Astrologer" slot (Consult dropdown
-- highlight + pinned-to-top directory card) — previously a hardcoded
-- RAGHAV_ASTROLOGER_ID constant in the frontend, now an admin-only,
-- changeable setting instead. NULL means no featured astrologer is set.
ALTER TABLE platform_settings ADD COLUMN featured_astrologer_id INTEGER REFERENCES astrologers(id) ON DELETE SET NULL;
