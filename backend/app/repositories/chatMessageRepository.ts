import { query } from '../core/db.ts';
import type { ChatMessage, MessageType, SenderRole } from '../models/chatMessage.ts';

interface ChatMessageDbRow {
  id: string;
  consultation_id: string;
  sender_email: string;
  sender_role: string;
  message_type: string;
  content: string;
  created_at: string; // BIGINT comes back as a string from node-postgres
  read_at: string | null;
}

function fromRow(row: ChatMessageDbRow): ChatMessage {
  return {
    id: row.id,
    consultationId: row.consultation_id,
    senderEmail: row.sender_email,
    senderRole: row.sender_role as SenderRole,
    messageType: row.message_type as MessageType,
    content: row.content,
    createdAt: Number(row.created_at),
    readAt: row.read_at ? Number(row.read_at) : undefined,
  };
}

export async function insertMessage(m: ChatMessage) {
  await query(
    `INSERT INTO chat_messages (id, consultation_id, sender_email, sender_role, message_type, content, created_at, read_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [m.id, m.consultationId, m.senderEmail.toLowerCase(), m.senderRole, m.messageType, m.content, m.createdAt, m.readAt ?? null]
  );
}

export async function listMessagesForConsultation(consultationId: string): Promise<ChatMessage[]> {
  const rows = await query<ChatMessageDbRow>('SELECT * FROM chat_messages WHERE consultation_id = $1 ORDER BY created_at ASC', [consultationId]);
  return rows.map(fromRow);
}
