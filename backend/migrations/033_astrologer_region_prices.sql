CREATE TABLE astrologer_region_prices (
  astrologer_id INTEGER NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  region_id INTEGER NOT NULL REFERENCES pricing_regions(id) ON DELETE CASCADE,
  chat_price INTEGER NOT NULL,
  call_price INTEGER NOT NULL,
  video_price INTEGER NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (astrologer_id, region_id)
);
