-- Real report purchase records. No payment gateway exists in this app (same
-- as consultation booking) — a purchase is an instant access grant, not a
-- pending-then-settled transaction, so there's no status column to fake.
CREATE TABLE report_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id INTEGER NOT NULL REFERENCES astrology_reports(id) ON DELETE CASCADE,
  bundle TEXT NOT NULL,
  amount INTEGER NOT NULL,
  purchased_at BIGINT NOT NULL
);
CREATE INDEX idx_report_purchases_user_id ON report_purchases(user_id);
