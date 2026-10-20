// Shared types for the realtime consultation-assignment backend.
// This is the single source of truth for astrologer availability, chat
// assignment, the waiting queue, and notifications — the frontend never
// decides any of this itself, it only reflects what this server says.

export type AstrologerStatus = 'OFFLINE' | 'ONLINE_AVAILABLE' | 'ONLINE_BUSY' | 'AWAY';

// The astrologer dashboard only exposes ONLINE/OFFLINE — this is what the
// astrologer explicitly *chose*. The actual live status (ONLINE_AVAILABLE vs
// ONLINE_BUSY vs AWAY) is derived server-side from that choice plus real
// activity (active consultations, inactivity).
export type AstrologerIntent = 'ONLINE' | 'OFFLINE';

export type ConsultationType = 'chat' | 'voice' | 'video';

export type ConsultationStatus =
  | 'ASSIGNED'   // astrologer has a pending request to accept/decline
  | 'ACCEPTED'   // astrologer accepted, chat not yet marked started
  | 'ACTIVE'     // consultation in progress
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export type QueueEntryStatus = 'QUEUED' | 'PROMOTED' | 'CANCELLED' | 'EXPIRED';

export interface AstrologerRecord {
  id: number;
  name: string;
  title: string;
  category: string[];
  languages: string[];
  consultationTypes: ConsultationType[];
  rating: number;
  experience: number;
  price: number;
  avatar: string;
  // Live/mutable state below — everything above is seeded from mockData.ts.
  email: string; // links to the mock auth account, e.g. demo.astrologer@tredevastro.local
  intent: AstrologerIntent;
  status: AstrologerStatus;
  maxConcurrent: number;
  lastActivityAt: number;
  durationSamplesMs: number[]; // recent completed-consultation durations, for ETA
}

// Snapshot of the client's saved birth details at request time — enough for
// the astrologer to review before accepting, without a separate lookup.
export interface ConsultationKundliDetails {
  name: string;
  date: string;
  time?: string;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  timezoneOffsetMinutes?: number;
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
  kundliDetails?: ConsultationKundliDetails;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;
  // Wallet-affordable minutes (walletBalance / pricePerMin), computed fresh
  // at acceptConsultation and recomputed on every mid-call wallet top-up
  // (see realtimeStore.ts's onWalletTopUp) — not chosen by the user. Almost
  // never a whole number; see migration 054.
  durationMinutes: number;
  extendedMinutes: number; // unused by wallet billing (folded into durationMinutes on top-up) — kept for schema/display compatibility
  pricePerMin: number; // locked in at session start (offer/loyalty/price-increase-adjusted)
  appliedOfferPercent: number; // the discount % actually applied to pricePerMin, for display
  boostId?: number; // set if this session was attributed to an astrologer Boost
  // Transient, not persisted — set only on the one chat:ended emission that
  // fires when the wallet-affordability deadline timer fires (see
  // autoEndConsultation), so the frontend can show the right message instead
  // of a generic "consultation ended."
  endReason?: 'INSUFFICIENT_BALANCE';
}

export interface QueueEntry {
  id: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: ConsultationType;
  status: QueueEntryStatus;
  requestId: string;
  joinedAt: number;
  promotedConsultationId?: string;
  durationMinutes: number; // carried through to the Consultation once promoted
  kundliDetails?: ConsultationKundliDetails;
}

export type NotificationKind = 'chat_request' | 'queue_waiting' | 'consultation_completed' | 'system';

export interface AstrologerNotification {
  id: string;
  astrologerId: number;
  kind: NotificationKind;
  message: string;
  relatedConsultationId?: string;
  read: boolean;
  createdAt: number;
}

export interface AdminConfig {
  maxQueueWaitMinutes: number;
  awayTimeoutMinutes: number;
  defaultConsultationMinutes: number;
  defaultMaxConcurrent: number;
}

export interface EtaEstimate {
  minMinutes: number;
  maxMinutes: number;
}

export interface RequestResultAssigned {
  outcome: 'ASSIGNED';
  consultation: Consultation;
}

export interface RequestResultQueued {
  outcome: 'QUEUED';
  entry: QueueEntry;
  position: number;
  eta: EtaEstimate;
}

export interface RequestResultUnavailable {
  outcome: 'UNAVAILABLE';
  reason: string;
}

export type RequestResult = RequestResultAssigned | RequestResultQueued | RequestResultUnavailable;

export interface PublicAstrologerState {
  id: number;
  status: AstrologerStatus;
  activeCount: number;
  maxConcurrent: number;
  queueLength: number;
}
