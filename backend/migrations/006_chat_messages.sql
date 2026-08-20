CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('USER', 'ASTROLOGIST')),
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'FILE', 'SYSTEM')),
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  read_at BIGINT
);
CREATE INDEX idx_chat_messages_consultation_id ON chat_messages(consultation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
