-- Second payment gateway (Razorpay, alongside Cashfree) — the intent row
-- now remembers which one actually created it, so the status-check route
-- knows which provider's API to re-verify against.
ALTER TABLE payments ADD COLUMN gateway TEXT NOT NULL DEFAULT 'cashfree' CHECK (gateway IN ('cashfree', 'razorpay'));
