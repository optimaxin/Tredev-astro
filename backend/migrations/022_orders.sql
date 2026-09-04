-- Real Store orders (gemstones, yantras, puja kits) — distinct from
-- report_purchases (digital Kundli reports). Like report_purchases, there is
-- no real payment gateway anywhere in this app, so a placed order is paid
-- immediately; delivery_status is the only state that genuinely changes
-- afterward (an admin marks it shipped/delivered as the physical order moves).
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  amount INTEGER NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'PROCESSING',
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
