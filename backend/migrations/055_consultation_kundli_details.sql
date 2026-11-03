-- Carries the client's saved birth/Kundli details along with a consultation
-- request, so the astrologer can see them on their dashboard before
-- accepting (previously collected and saved to the user's account, but never
-- actually sent with the request).
ALTER TABLE consultations ADD COLUMN kundli_details TEXT;
ALTER TABLE queue_entries ADD COLUMN kundli_details TEXT;
