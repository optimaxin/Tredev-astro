import { randomUUID } from 'node:crypto';
import { getAstrologer, getConsultation } from './realtimeStore.ts';
import { insertCallRecording } from '../repositories/callRecordingRepository.ts';

export class CallRecordingError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Same participant check as chatService.ts's assertParticipant — either
// party on the call may upload the recording once it ends (whichever side's
// browser actually finished the MediaRecorder first).
async function assertParticipant(consultationId: string, requesterEmail: string) {
  const consultation = await getConsultation(consultationId);
  if (!consultation) throw new CallRecordingError('Consultation not found', 404);
  const email = requesterEmail.toLowerCase();
  if (consultation.userEmail.toLowerCase() === email) return consultation;
  const astro = getAstrologer(consultation.astrologerId);
  if (astro && astro.email.toLowerCase() === email) return consultation;
  throw new CallRecordingError('You are not a participant in this consultation', 403);
}

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

export async function uploadCallRecording(consultationId: string, requesterEmail: string, mimeType: string, data: Buffer): Promise<{ id: string }> {
  await assertParticipant(consultationId, requesterEmail);
  if (data.length === 0) throw new CallRecordingError('Recording is empty', 422);
  if (data.length > MAX_RECORDING_BYTES) throw new CallRecordingError('Recording is too large', 413);

  const id = randomUUID();
  await insertCallRecording({ id, consultationId, mimeType, data, createdAt: Date.now() });
  return { id };
}
