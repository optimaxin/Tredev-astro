-- Astrologer online/offline intent used to live only in the in-memory
-- realtime store, so a server restart (deploy, idle dyno respawn, etc.)
-- silently reset every astrologer back to OFFLINE even though nobody
-- actually turned themselves offline. Persist it so it survives restarts.
ALTER TABLE astrologers ADD COLUMN intent TEXT NOT NULL DEFAULT 'OFFLINE';
