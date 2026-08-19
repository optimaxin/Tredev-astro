// Minimal frontend-side mirror of the shapes server/types.ts sends over the
// wire. Deliberately duplicated (not imported from server/) so the frontend
// build never depends on files outside src/ — the backend remains free to
// evolve its internals as long as this wire shape is honored.

export type AstrologerStatus = 'OFFLINE' | 'ONLINE_AVAILABLE' | 'ONLINE_BUSY' | 'AWAY';
export type ConsultationType = 'chat' | 'voice' | 'video';
export type ConsultationStatus = 'ASSIGNED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';

export interface PublicAstrologerState {
  id: number;
  status: AstrologerStatus;
  activeCount: number;
  maxConcurrent: number;
  queueLength: number;
}

export interface Consultation {
  id: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: ConsultationType;
  status: ConsultationStatus;
  fromQueue: boolean;
  requestId: string;
  createdAt: number;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;
}

export interface QueueEntry {
  id: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: ConsultationType;
  status: 'QUEUED' | 'PROMOTED' | 'CANCELLED' | 'EXPIRED';
  requestId: string;
  joinedAt: number;
}

export interface EtaEstimate {
  minMinutes: number;
  maxMinutes: number;
}

export interface AstrologerNotification {
  id: string;
  astrologerId: number;
  kind: 'chat_request' | 'queue_waiting' | 'consultation_completed' | 'system';
  message: string;
  relatedConsultationId?: string;
  read: boolean;
  createdAt: number;
}

export interface RecommendedAstrologer extends PublicAstrologerState {
  name: string;
  title: string;
  category: string[];
  rating: number;
  experience: number;
  price: number;
  avatar: string;
}

export interface AstrologerSyncSnapshot {
  status: AstrologerStatus;
  intent: 'ONLINE' | 'OFFLINE';
  activeConsultation: Consultation | null;
  pendingAssignments: Consultation[];
  queue: { entry: QueueEntry; position: number; eta: EtaEstimate }[];
  notifications: AstrologerNotification[];
}

export interface UserSyncSnapshot {
  consultation: Consultation | null;
  queueEntry: QueueEntry | null;
  position: number | null;
  eta: EtaEstimate | null;
}

export type RequestResult =
  | { outcome: 'ASSIGNED'; consultation: Consultation }
  | { outcome: 'QUEUED'; entry: QueueEntry; position: number; eta: EtaEstimate }
  | { outcome: 'UNAVAILABLE'; reason: string };
