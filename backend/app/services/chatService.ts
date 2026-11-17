import { randomUUID } from 'node:crypto';
import { getAstrologer, getConsultation } from './realtimeStore.ts';
import { insertMessage, listMessagesForConsultation } from '../repositories/chatMessageRepository.ts';
import { findUserByEmail } from '../repositories/userRepository.ts';
import { computeKundliFullCached, type KundliFullResult } from './astrology/kundliFullBuilder.ts';
import { bus } from '../websocket/bus.ts';
import type { ChatMessage, MessageType, SenderRole } from '../models/chatMessage.ts';
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

export async function sendMessage(consultationId: string, requesterEmail: string, content: string, messageType: MessageType = 'TEXT'): Promise<ChatMessage> {
  const { consultation, role } = assertParticipant(await getConsultation(consultationId), requesterEmail);
  assertChatOpen(consultation);
  // Media upload is user-side only (spec) — an astrologer sending IMAGE/FILE
  // is rejected here even if a client somehow tried, same boundary as any
  // other server-enforced rule in this file. Voice notes (AUDIO) are fine
  // from either side.
  if ((messageType === 'IMAGE' || messageType === 'FILE') && role !== 'USER') {
    throw new ChatError('Only the user can send media in this chat', 403);
  }

  const message: ChatMessage = {
    id: randomUUID(),
    consultationId,
    senderEmail: requesterEmail,
    senderRole: role,
    messageType,
    content,
    createdAt: Date.now(),
  };
  await insertMessage(message);
  bus.emitTyped('chat:message', message);
  return message;
}

export interface ClientKundliContext {
  userName: string;
  hasBirthDetails: boolean;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezoneOffsetMinutes?: number;
  kundliFull?: KundliFullResult;
}

// The astrologer-side "client Kundli" sidebar (see ChatWindow/CallWindow's
// consumers in AstrologistDashboard) — lets the astrologer see the birth
// chart of whoever they're actually talking to, instead of asking the
// client to repeat their birth details over chat. Astrologer-only (a
// client has no reason to see this) and reuses the exact same computation
// as the public /api/calculators/kundli-full endpoint.
export async function getClientKundliForAstrologer(consultationId: string, requesterEmail: string): Promise<ClientKundliContext> {
  const { consultation, role } = assertParticipant(await getConsultation(consultationId), requesterEmail);
  if (role !== 'ASTROLOGIST') throw new ChatError("Only the astrologer can view the client's Kundli", 403);

  const client = await findUserByEmail(consultation.userEmail);
  if (!client) throw new ChatError('Client account not found', 404);

  const hasBirthDetails = !!(
    client.birth_date && client.birth_time &&
    client.birth_latitude != null && client.birth_longitude != null && client.birth_timezone_offset_minutes != null
  );
  if (!hasBirthDetails) return { userName: consultation.userName, hasBirthDetails: false };

  const kundliFull = computeKundliFullCached({
    date: client.birth_date!,
    time: client.birth_time!,
    latitude: client.birth_latitude!,
    longitude: client.birth_longitude!,
    timezoneOffsetMinutes: client.birth_timezone_offset_minutes!,
  }, 'en');

  return {
    userName: consultation.userName,
    hasBirthDetails: true,
    birthDate: client.birth_date!,
    birthTime: client.birth_time ?? undefined,
    birthPlace: client.birth_place ?? undefined,
    birthLatitude: client.birth_latitude ?? undefined,
    birthLongitude: client.birth_longitude ?? undefined,
    birthTimezoneOffsetMinutes: client.birth_timezone_offset_minutes ?? undefined,
    kundliFull,
  };
}
