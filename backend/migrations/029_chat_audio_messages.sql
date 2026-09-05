-- Voice messages: 'AUDIO' joins the existing IMAGE/FILE message types the
-- schema already had a slot for but nothing ever sent.
ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_message_type_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_type_check
  CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'SYSTEM'));
