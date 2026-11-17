-- Wallet-based per-minute consultation billing (see realtimeStore.ts's
-- acceptConsultation/onWalletTopUp) computes duration as
-- walletBalance / pricePerMin, which is almost never a whole number of
-- minutes — these columns need to carry that fractional value precisely
-- instead of being rounded to a whole minute.
ALTER TABLE consultations ALTER COLUMN duration_minutes TYPE DOUBLE PRECISION;
ALTER TABLE consultations ALTER COLUMN extended_minutes TYPE DOUBLE PRECISION;
