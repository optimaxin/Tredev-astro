-- One account per phone number, enforced at the DB level (application-level
-- check lives in authService.ts's register()). Years of dev/QA testing left
-- many accounts sharing the same test phone number, which a plain UNIQUE
-- constraint would refuse to create over — so first null out phone_number
-- on every duplicate except the most-recently-created account for that
-- number (no accounts are deleted, they just lose that field), then add a
-- partial unique index (partial so it never conflicts with the many
-- legitimate NULL phone_numbers already in this table).
UPDATE users u
SET phone_number = NULL
WHERE phone_number IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.phone_number = u.phone_number
      AND (u2.created_at > u.created_at OR (u2.created_at = u.created_at AND u2.id > u.id))
  );

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx ON users (phone_number) WHERE phone_number IS NOT NULL;
