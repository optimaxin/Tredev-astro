-- Real, DB-backed 1:1 scheduled-slot booking — built for the dedicated
-- Raghav booking page (a fixed appointment time, paid up front), which is
-- a different shape from the existing live real-time chat/voice queue in
-- realtimeStore.ts (instant "request an astrologer now" matching). Not
-- hardcoded to Raghav — astrologer_id is a normal FK — so this can serve
-- any astrologer's calendar later without a schema change.
CREATE TABLE consultation_slots (
  id TEXT PRIMARY KEY,
  astrologer_id INTEGER NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  scheduled_at BIGINT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chat', 'voice', 'video')),
  -- Plain rupees (integer, no paise) — matches astrologers.chat_price /
  -- call_price / video_price and every other `amount` in the payments
  -- table; Cashfree's order_amount is passed straight through with no /100
  -- or *100 conversion anywhere in this codebase (see cashfreeClient.ts).
  price INTEGER NOT NULL,
  booked_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  booked_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE INDEX idx_consultation_slots_astrologer_scheduled ON consultation_slots(astrologer_id, scheduled_at);
CREATE INDEX idx_consultation_slots_booked_by ON consultation_slots(booked_by_user_id);

-- Allows purpose = 'SLOT_BOOKING' (paying to claim one specific scheduled slot).
ALTER TABLE payments DROP CONSTRAINT payments_purpose_check;
ALTER TABLE payments ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('STORE_ORDER', 'REPORT_PURCHASE', 'WALLET_RECHARGE', 'CONSULTATION', 'CONSULTATION_EXTEND', 'SLOT_BOOKING'));
