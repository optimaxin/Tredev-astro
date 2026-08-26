-- Phone number + SMS OTP verification for signup, modeled directly on the
-- existing password_reset_tokens pattern (hash the code, never store it
-- raw; expiry + attempt count instead of trusting the client).
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE phone_otp_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used_at BIGINT,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_phone_otp_codes_user_id ON phone_otp_codes(user_id);
