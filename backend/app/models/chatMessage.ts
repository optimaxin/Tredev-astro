export type SenderRole = 'USER' | 'ASTROLOGIST';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  consultationId: string;
  senderEmail: string;
  senderRole: SenderRole;
  messageType: MessageType;
  content: string;
  createdAt: number;
  readAt?: number;
}
