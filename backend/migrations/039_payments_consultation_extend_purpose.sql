-- Allows purpose = 'CONSULTATION_EXTEND' (paid mid-session top-ups) — 038
-- only added 'CONSULTATION' for the initial booking.
ALTER TABLE payments DROP CONSTRAINT payments_purpose_check;
ALTER TABLE payments ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('STORE_ORDER', 'REPORT_PURCHASE', 'WALLET_RECHARGE', 'CONSULTATION', 'CONSULTATION_EXTEND'));
