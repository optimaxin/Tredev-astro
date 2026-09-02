-- toUtcDate() used to ADD timezoneOffsetMinutes instead of subtracting it,
-- so every saved offset up to now was stored negated (IST saved as -330
-- instead of +330) to compensate. Now that toUtcDate correctly subtracts
-- and the frontend sends the standard sign (IST = +330), any offset saved
-- under the old convention needs to be negated once so it still resolves
-- to the same real UTC instant it always should have.
UPDATE users SET birth_timezone_offset_minutes = -birth_timezone_offset_minutes WHERE birth_timezone_offset_minutes IS NOT NULL;
UPDATE kundli_history SET timezone_offset_minutes = -timezone_offset_minutes;
