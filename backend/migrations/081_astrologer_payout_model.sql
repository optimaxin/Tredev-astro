-- Staff-selectable payout model per astrologer — commission_percent (an
-- earlier migration) already covers "earns a % of each consultation"; this
-- adds the alternative staff can pick instead: a flat monthly salary. Purely
-- informational/config, same trust level as commission_percent — there's no
-- automated payroll run anywhere in this codebase to hook into, staff/
-- accounting still action it outside the app.
ALTER TABLE astrologers ADD COLUMN payout_model TEXT NOT NULL DEFAULT 'COMMISSION' CHECK (payout_model IN ('COMMISSION', 'SALARY'));
ALTER TABLE astrologers ADD COLUMN monthly_salary NUMERIC NOT NULL DEFAULT 0;
