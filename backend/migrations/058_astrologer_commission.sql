-- Staff-set revenue split: what share of the per-minute price an astrologer
-- actually earns. Defaults to 100 (full price) so every existing astrologer
-- keeps earning exactly what they already do until staff sets a real cut.
ALTER TABLE astrologers ADD COLUMN commission_percent INTEGER NOT NULL DEFAULT 100;
