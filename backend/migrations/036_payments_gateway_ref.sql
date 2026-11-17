-- Razorpay's Payment Links API assigns its OWN id to a created link
-- (e.g. "plink_xxx") — separate from the reference_id we pass in — and that
-- id, not our own payment id, is what GET /v1/payment_links/:id expects.
-- Cashfree doesn't need this (its Orders API is keyed by the merchant-
-- supplied order_id we already control), but storing it generically here
-- keeps payments.routes.ts's status-check branch uniform across gateways.
ALTER TABLE payments ADD COLUMN gateway_ref TEXT;
