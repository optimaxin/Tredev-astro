-- Every STAFF account created before the per-staff permission system
-- (023_staff_permissions.sql) has no staff_permissions row, which
-- getStaffPermissions treats as zero sections — after that migration
-- landed, every existing Staff account (including the seeded demo one)
-- silently lost all admin console access, including adding astrologers.
-- Backfill the same reasonable default the Staff-creation endpoint now
-- grants a brand new account.
INSERT INTO staff_permissions (user_id, sections)
SELECT id, '["overview","astrologers","users"]'::jsonb
FROM users
WHERE role = 'STAFF'
ON CONFLICT (user_id) DO NOTHING;
