-- Marketing testimonials shown on the landing page. Real (demo-labelled)
-- content served from the DB instead of the frontend's static mock array.
CREATE TABLE testimonials (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  service TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  avatar TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_testimonials_display_order ON testimonials(display_order);
