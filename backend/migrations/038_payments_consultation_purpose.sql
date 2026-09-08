-- Allows purpose = 'CONSULTATION' (payment-before-booking) — the original
-- check constraint (034) only listed the first three purposes.
ALTER TABLE payments DROP CONSTRAINT payments_purpose_check;
ALTER TABLE payments ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('STORE_ORDER', 'REPORT_PURCHASE', 'WALLET_RECHARGE', 'CONSULTATION'));
