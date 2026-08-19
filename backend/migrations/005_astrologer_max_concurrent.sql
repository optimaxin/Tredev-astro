-- The astrologer's concurrency capacity was admin-configurable but lived
-- only in-memory, silently resetting to the default on every restart.
ALTER TABLE astrologers ADD COLUMN max_concurrent INTEGER NOT NULL DEFAULT 1;
