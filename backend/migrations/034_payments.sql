-- Generic payment-intent ledger for the Cashfree integration. One row per
-- Cashfree order created; `payload` carries whatever's needed to fulfil the
-- purchase once payment succeeds (cart items+shipping, report+bundle, or a
-- wallet top-up amount) so the webhook/status-check never has to trust
-- anything from the client again once the intent row exists — the actual
-- store order / report purchase / wallet credit is only ever created from
-- this stored payload, never from a second client request.
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('STORE_ORDER', 'REPORT_PURCHASE', 'WALLET_RECHARGE')),
  payload JSONB NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PAID', 'FAILED')),
  cf_payment_id TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- Prepaid balance for consultations — recharged via the same Cashfree flow
-- (purpose = WALLET_RECHARGE). Deducting it per consultation is a separate
-- follow-up (see chat.routes.ts/realtimeStore.ts's existing "no real
-- payment/payout system" notes) — this migration only adds the balance a
-- recharge credits.
ALTER TABLE users ADD COLUMN wallet_balance INTEGER NOT NULL DEFAULT 0;
