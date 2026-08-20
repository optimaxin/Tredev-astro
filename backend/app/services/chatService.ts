import { randomUUID } from 'node:crypto';
import { getAstrologer, getConsultation } from './realtimeStore.ts';
import { insertMessage, listMessagesForConsultation } from '../repositories/chatMessageRepository.ts';
import { bus } from '../websocket/bus.ts';
import type { ChatMessage, SenderRole } from '../models/chatMessage.ts';
import type { Consultation } from '../models/types.ts';

export class ChatError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Section 30/31: a user may only read/send messages for a consultation they
// are actually a participant of — verified server-side, never trusted from
// the client. Chat is also only meaningful once the astrologer has accepted;
// before that there's nothing to say and no reason for either party to see
// the other's identity in a chat thread yet.
function assertParticipant(consultation: Consultation | undefined, requesterEmail: string): { consultation: Consultation; role: SenderRole } {
  if (!consultation) throw new ChatError('Consultation not found', 404);
  const email = requesterEmail.toLowerCase();
  if (consultation.userEmail.toLowerCase() === email) return { consultation, role: 'USER' };
  const astro = getAstrologer(consultation.astrologerId);
  if (astro && astro.email.toLowerCase() === email) return { consultation, role: 'ASTROLOGIST' };
  throw new ChatError('You are not a participant in this consultation', 403);
}

function assertChatOpen(consultation: Consultation) {
  if (consultation.status !== 'ACCEPTED' && consultation.status !== 'ACTIVE') {
    throw new ChatError(`Chat is not available while the consultation is ${consultation.status}`, 409);
  }
}

export async function listMessages(consultationId: string, requesterEmail: string): Promise<ChatMessage[]> {
  const consultation = await getConsultation(consultationId);
  assertParticipant(consultation, requesterEmail);
  return listMessagesForConsultation(consultationId);
}

export async function sendMessage(consultationId: string, requesterEmail: string, content: string): Promise<ChatMessage> {
  const { consultation, role } = assertParticipant(await getConsultation(consultationId), requesterEmail);
  assertChatOpen(consultation);

  const message: ChatMessage = {
    id: randomUUID(),
    consultationId,
    senderEmail: requesterEmail,
    senderRole: role,
    messageType: 'TEXT',
    content,
    createdAt: Date.now(),
  };
  await insertMessage(message);
  bus.emitTyped('chat:message', message);
  return message;
}
