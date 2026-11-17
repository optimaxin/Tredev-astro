-- Cover image for the aarti/book library cards — optional, same "external
-- URL, no object storage" pattern as pooja_videos.thumbnail_url.
ALTER TABLE pooja_books ADD COLUMN cover_image_url TEXT;
