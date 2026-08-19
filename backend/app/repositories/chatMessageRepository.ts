import { db } from '../core/db.ts';
import type { ChatMessage, MessageType, SenderRole } from '../models/chatMessage.ts';

interface ChatMessageDbRow {
  id: string;
  consultation_id: string;
  sender_email: string;
  sender_role: string;
  message_type: string;
  content: string;
  created_at: number;
  read_at: number | null;
}

function fromRow(row: ChatMessageDbRow): ChatMessage {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    senderEmail: row.sender_email,
    senderRole: row.sender_role as SenderRole,
    messageType: row.message_type as MessageType,
    content: row.content,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
}

export function insertMessage(m: ChatMessage) {
  db.prepare(`
    INSERT INTO chat_messages (id, consultation_id, sender_email, sender_role, message_type, content, created_at, read_at)
    VALUES (@id, @consultationId, @senderEmail, @senderRole, @messageType, @content, @createdAt, @readAt)
  `).run({
    id: m.id,
    consultationId: m.consultationId,
    senderEmail: m.senderEmail.toLowerCase(),
    senderRole: m.senderRole,
    messageType: m.messageType,
    content: m.content,
    createdAt: m.createdAt,
    readAt: m.readAt ?? null,
  });
}

export function listMessagesForConsultation(consultationId: string): ChatMessage[] {
  const rows = db
    .prepare('SELECT * FROM chat_messages WHERE consultation_id = ? ORDER BY created_at ASC')
    .all(consultationId) as unknown as ChatMessageDbRow[];
  return rows.map(fromRow);
}
