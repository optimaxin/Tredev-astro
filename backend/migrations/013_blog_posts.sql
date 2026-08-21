-- Journal/blog articles. Real content served from the DB instead of the
-- frontend's static BLOG_POSTS mock array.
CREATE TABLE blog_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  read_time TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tag TEXT NOT NULL,
  featured INTEGER NOT NULL DEFAULT 0,
  published_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
