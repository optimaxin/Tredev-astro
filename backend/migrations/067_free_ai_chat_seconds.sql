-- Real, server-tracked balance for the "Ask TredevaAstro" free AI chat
-- session — previously just a client-side 5-minute countdown with nothing
-- backing it (a page refresh reset it for free). New accounts start with
-- one 5-minute grant; staff can top a specific account back up (by email/
-- phone) for disputes via PATCH /api/admin/users/:id/free-ai-chat.
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_ai_chat_seconds INTEGER NOT NULL DEFAULT 300;
