import { randomUUID } from 'node:crypto';
import { listAllAstrologersRaw, updateMaxConcurrent } from '../repositories/astrologerRepository.ts';
import * as consultationRepo from '../repositories/consultationRepository.ts';
import * as queueRepo from '../repositories/queueRepository.ts';
import * as notificationRepo from '../repositories/notificationRepository.ts';
import * as processedRequestRepo from '../repositories/processedRequestRepository.ts';
import { bus } from '../websocket/bus.ts';
import type {
  AdminConfig, AstrologerNotification, AstrologerRecord, Consultation, ConsultationType,
  EtaEstimate, NotificationKind, PublicAstrologerState, QueueEntry, RequestResult,
} from '../models/types.ts';

// ── Astrologer live-session state ───────────────────────────────────────
// Consultations, queue entries, notifications, and the request-idempotency
// cache are all durable — they live in SQLite (see the repositories above)
// so an active booking or a waiting user survives a server restart.
//
// Presence/session state below (intent, status, last-activity, away-flags,
// recent-duration samples) stays in-memory: it's ephemeral by nature — an
// astrologer's dashboard re-establishes "I'm online" on reconnect anyway,
// so persisting it would just mean serving a stale presence signal after a
// restart until the next heartbeat corrects it.
//
// Every mutation here (including the DB calls) stays fully synchronous — no
// `await` anywhere in this file — so Node's single-threaded event loop still
// gives atomicity for free, exactly as it did with the old in-memory Maps.
// node:sqlite's DatabaseSync is synchronous for exactly this reason; if this
// ever moves to an async driver (e.g. a Postgres client), that guarantee has
// to be re-earned explicitly (a transaction / row lock).

const astrologers = new Map<number, AstrologerRecord>();

const adminConfig: AdminConfig = {
  maxQueueWaitMinutes: 15,
  awayTimeoutMinutes: 5,
  defaultConsultationMinutes: 15,
  defaultMaxConcurrent: 1,
};

// The demo astrologer account is the only one with a real login in the mock
// auth system (see AppContext.tsx DEMO_ACCOUNTS) — every other seed
// astrologer gets a synthetic, non-login-able email so the recommendation
// engine and dashboards still have a full roster to reason about.
const DEMO_ASTROLOGER_EMAIL = 'demo.astrologer@tredevastro.local';

// Called explicitly from main.ts, after migrations + catalog seeding have
// run — NOT at module-load time, since the `astrologers` DB table doesn't
// exist yet when this file is first imported.
export function seedRealtimeStore() {
  for (const row of listAllAstrologersRaw()) {
    const email = row.name === 'Astrologist Rahul Shastri' ? DEMO_ASTROLOGER_EMAIL : `astrologer${row.id}@tredevastro.local`;
    astrologers.set(row.id, {
      id: row.id,
      name: row.name,
      title: row.title,
      category: JSON.parse(row.categories),
      languages: JSON.parse(row.languages),
      consultationTypes: JSON.parse(row.consultation_types),
      rating: row.rating,
      experience: row.experience_years,
      price: row.chat_price,
      avatar: row.avatar,
      email,
      intent: 'OFFLINE',
      status: 'OFFLINE',
      maxConcurrent: row.max_concurrent,
      lastActivityAt: Date.now(),
      durationSamplesMs: [],
    });
  }
}

const awayFlags = new Map<number, boolean>();

// ── Derived state ────────────────────────────────────────────────────────

export function countActive(astrologerId: number): number {
  return consultationRepo.countActiveForAstrologer(astrologerId);
}

function recomputeStatus(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const prev = astro.status;
  if (astro.intent === 'OFFLINE') {
    astro.status = 'OFFLINE';
  } else if (awayFlags.get(astrologerId)) {
    astro.status = 'AWAY';
  } else if (countActive(astrologerId) >= astro.maxConcurrent) {
    astro.status = 'ONLINE_BUSY';
  } else {
    astro.status = 'ONLINE_AVAILABLE';
  }
  if (prev !== astro.status) {
    bus.emitTyped('astrologer:status', toPublicState(astro));
  }
}

export function toPublicState(astro: AstrologerRecord): PublicAstrologerState {
  return {
    id: astro.id,
    status: astro.status,
    activeCount: countActive(astro.id),
    maxConcurrent: astro.maxConcurrent,
    queueLength: queueRepo.listQueuedForAstrologer(astro.id).length,
  };
}

export function listPublicAstrologers(): PublicAstrologerState[] {
  return Array.from(astrologers.values()).map(toPublicState);
}

export function getAstrologer(id: number) {
  return astrologers.get(id);
}

export function getAstrologerByEmail(email: string) {
  return Array.from(astrologers.values()).find(a => a.email.toLowerCase() === email.toLowerCase());
}

// ── Availability ─────────────────────────────────────────────────────────

export function setIntent(astrologerId: number, intent: 'ONLINE' | 'OFFLINE') {
  const astro = astrologers.get(astrologerId);
  if (!astro) throw new Error('Unknown astrologer');
  astro.intent = intent;
  astro.lastActivityAt = Date.now();
  if (intent === 'ONLINE') awayFlags.set(astrologerId, false);
  recomputeStatus(astrologerId);
  // Coming back online (or going offline while a stale queue exists from
  // before) should re-check whether anyone waiting can now be promoted.
  if (intent === 'ONLINE') processQueue(astrologerId);
  return astro.status;
}

export function touchActivity(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  astro.lastActivityAt = Date.now();
  if (awayFlags.get(astrologerId)) {
    awayFlags.set(astrologerId, false);
    recomputeStatus(astrologerId);
  }
}

// ── Notifications ────────────────────────────────────────────────────────

function createNotification(astrologerId: number, kind: NotificationKind, message: string, relatedConsultationId?: string, idSuffix?: string) {
  const id = `notif-${relatedConsultationId || astrologerId}-${idSuffix || kind}-${idSuffix ? '' : Date.now()}`;
  if (notificationRepo.notificationExists(id)) return; // idempotent — never double-notify the same event
  const entry: AstrologerNotification = { id, astrologerId, kind, message, relatedConsultationId, read: false, createdAt: Date.now() };
  notificationRepo.insertNotification(entry);
  bus.emitTyped('notification:created', entry);
}

export function listNotifications(astrologerId: number) {
  return notificationRepo.listNotificationsForAstrologer(astrologerId);
}

export function markNotificationRead(astrologerId: number, notificationId: string) {
  notificationRepo.markNotificationRead(astrologerId, notificationId);
}

export function markAllNotificationsRead(astrologerId: number) {
  notificationRepo.markAllNotificationsRead(astrologerId);
}

// ── ETA ───────────────────────────────────────────────────────────────────

function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function calcEta(astro: AstrologerRecord, positionIndexZeroBased: number): EtaEstimate {
  const hasHistory = astro.durationSamplesMs.length > 0;
  const avgMs = hasHistory ? mean(astro.durationSamplesMs) : adminConfig.defaultConsultationMinutes * 60_000;

  const activeConsultations = consultationRepo.findActiveStartedForAstrologer(astro.id);
  const elapsed = activeConsultations.map(c => Date.now() - (c.startedAt as number));
  const headStart = elapsed.length ? Math.max(0, avgMs - Math.min(...elapsed)) : (countActive(astro.id) > 0 ? avgMs : 0);

  const roundsAhead = Math.floor(positionIndexZeroBased / Math.max(1, astro.maxConcurrent));
  const estimateMs = headStart + avgMs * roundsAhead;

  // Wider, more conservative spread when we don't have real history yet —
  // never present fake precision the data doesn't support.
  const spread = hasHistory ? 0.3 : 0.5;
  const minMinutes = Math.max(1, Math.round((estimateMs * (1 - spread)) / 60_000));
  let maxMinutes = Math.round((estimateMs * (1 + spread)) / 60_000);
  if (maxMinutes <= minMinutes) maxMinutes = minMinutes + 2;
  return { minMinutes, maxMinutes };
}

// ── Recommendations ──────────────────────────────────────────────────────

const STATUS_RANK: Record<string, number> = { ONLINE_AVAILABLE: 0, ONLINE_BUSY: 1, AWAY: 2, OFFLINE: 3 };

export function getRecommendations(category: string, excludeAstrologerId: number, limit = 3) {
  const excluded = astrologers.get(excludeAstrologerId);
  const all = Array.from(astrologers.values()).filter(a => a.id !== excludeAstrologerId);
  let candidates = all.filter(a => a.category.includes(category));
  let usedFallback = false;
  if (candidates.length === 0) {
    candidates = all; // no same-category astrologer — fall back to the full roster
    usedFallback = true;
  }
  candidates.sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.experience !== a.experience) return b.experience - a.experience;
    const aPriceDiff = excluded ? Math.abs(a.price - excluded.price) : 0;
    const bPriceDiff = excluded ? Math.abs(b.price - excluded.price) : 0;
    return aPriceDiff - bPriceDiff;
  });
  return { usedFallback, astrologers: candidates.slice(0, limit).map(a => ({ ...toPublicState(a), name: a.name, title: a.title, category: a.category, rating: a.rating, experience: a.experience, price: a.price, avatar: a.avatar })) };
}

// ── Booking / queue ──────────────────────────────────────────────────────

export interface RequestParams {
  requestId: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: ConsultationType;
}

export function requestConsultation(params: RequestParams): RequestResult {
  const cached = processedRequestRepo.getProcessedResult(params.requestId);
  if (cached) return cached; // idempotency — retries/duplicate submits never double-book

  const astro = astrologers.get(params.astrologerId);
  let result: RequestResult;
  if (!astro || astro.status === 'OFFLINE' || astro.status === 'AWAY') {
    result = { outcome: 'UNAVAILABLE', reason: !astro ? 'Unknown astrologer' : `Astrologer is ${astro.status.toLowerCase()}` };
  } else if (countActive(astro.id) < astro.maxConcurrent) {
    const consultation = createConsultation(astro.id, params, false);
    result = { outcome: 'ASSIGNED', consultation };
  } else {
    const entry: QueueEntry = {
      id: randomUUID(), astrologerId: astro.id, userEmail: params.userEmail, userName: params.userName,
      category: params.category, type: params.type, status: 'QUEUED', requestId: params.requestId, joinedAt: Date.now(),
    };
    queueRepo.insertQueueEntry(entry);
    const position = queueRepo.listQueuedForAstrologer(astro.id).findIndex(q => q.id === entry.id) + 1;
    const eta = calcEta(astro, position - 1);
    bus.emitTyped('queue:position', { entry, position, eta });
    createNotification(astro.id, 'queue_waiting', `${params.userName} is waiting in your queue.`, undefined, `queue-${entry.id}`);
    result = { outcome: 'QUEUED', entry, position, eta };
  }
  processedRequestRepo.saveProcessedResult(params.requestId, result);
  return result;
}

function createConsultation(astrologerId: number, params: Omit<RequestParams, 'astrologerId'>, fromQueue: boolean): Consultation {
  const consultation: Consultation = {
    id: randomUUID(), astrologerId, userEmail: params.userEmail, userName: params.userName,
    category: params.category, type: params.type, status: 'ASSIGNED', fromQueue, requestId: params.requestId, createdAt: Date.now(),
  };
  consultationRepo.insertConsultation(consultation);
  recomputeStatus(astrologerId);
  bus.emitTyped('chat:assigned', consultation);
  createNotification(astrologerId, 'chat_request', `${params.userName} wants to start a consultation.`, consultation.id, `assign-${consultation.id}`);
  return consultation;
}

export function getConsultation(id: string) {
  return consultationRepo.findConsultationById(id);
}

function assertOwnership(consultation: Consultation | undefined, astrologerEmail: string): Consultation {
  if (!consultation) throw new Error('Consultation not found');
  const astro = astrologers.get(consultation.astrologerId);
  if (!astro || astro.email.toLowerCase() !== astrologerEmail.toLowerCase()) throw new Error('Not authorized for this consultation');
  return consultation;
}

export function acceptConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationRepo.findConsultationById(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot accept a consultation in status ${c.status}`);
  c.status = 'ACTIVE';
  c.acceptedAt = Date.now();
  c.startedAt = Date.now();
  consultationRepo.updateConsultation(c);
  touchActivity(c.astrologerId);
  bus.emitTyped('chat:accepted', c);
  bus.emitTyped('chat:started', c);
  return c;
}

export function declineConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationRepo.findConsultationById(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot decline a consultation in status ${c.status}`);
  c.status = 'DECLINED';
  c.endedAt = Date.now();
  consultationRepo.updateConsultation(c);
  touchActivity(c.astrologerId);
  recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:declined', c);
  processQueue(c.astrologerId);
  return c;
}

export function endConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationRepo.findConsultationById(consultationId), astrologerEmail);
  if (c.status !== 'ACTIVE') throw new Error(`Cannot end a consultation in status ${c.status}`);
  c.status = 'COMPLETED';
  c.endedAt = Date.now();
  consultationRepo.updateConsultation(c);
  if (c.startedAt) {
    const astro = astrologers.get(c.astrologerId);
    if (astro) {
      astro.durationSamplesMs.push(c.endedAt - c.startedAt);
      if (astro.durationSamplesMs.length > 20) astro.durationSamplesMs.shift();
    }
  }
  touchActivity(c.astrologerId);
  recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:ended', c);
  createNotification(c.astrologerId, 'consultation_completed', `${c.userName}'s consultation has ended.`, c.id, `complete-${c.id}`);
  processQueue(c.astrologerId);
  return c;
}

export function cancelQueueEntry(entryId: string, userEmail: string) {
  const entry = queueRepo.findQueueEntryById(entryId);
  if (!entry) throw new Error('Queue entry not found');
  if (entry.userEmail.toLowerCase() !== userEmail.toLowerCase()) throw new Error('Not authorized for this queue entry');
  if (entry.status !== 'QUEUED') return entry;
  entry.status = 'CANCELLED';
  queueRepo.updateQueueEntry(entry);
  broadcastQueuePositions(entry.astrologerId);
  return entry;
}

function broadcastQueuePositions(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const waiting = queueRepo.listQueuedForAstrologer(astrologerId);
  waiting.forEach((entry, idx) => {
    const eta = calcEta(astro, idx);
    bus.emitTyped('queue:position', { entry, position: idx + 1, eta });
  });
}

export function processQueue(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  while (astro.status !== 'OFFLINE' && astro.intent === 'ONLINE' && countActive(astrologerId) < astro.maxConcurrent) {
    const [next] = queueRepo.listQueuedForAstrologer(astrologerId);
    if (!next) break;
    next.status = 'PROMOTED';
    queueRepo.updateQueueEntry(next);
    const consultation = createConsultation(astrologerId, {
      requestId: next.requestId, userEmail: next.userEmail, userName: next.userName, category: next.category, type: next.type,
    }, true);
    next.promotedConsultationId = consultation.id;
    queueRepo.updateQueueEntry(next);
    bus.emitTyped('queue:promoted', { entry: next, consultation });
  }
  broadcastQueuePositions(astrologerId);
}

// ── Periodic maintenance (auto-away, queue timeout) ──────────────────────

export function runMaintenanceTick(now = Date.now()) {
  for (const astro of astrologers.values()) {
    if (astro.intent === 'ONLINE' && !awayFlags.get(astro.id)) {
      const idleMs = now - astro.lastActivityAt;
      const timeoutMs = adminConfig.awayTimeoutMinutes * 60_000;
      if (idleMs > timeoutMs) {
        awayFlags.set(astro.id, true);
        recomputeStatus(astro.id);
        bus.emitTyped('astrologer:away', { astrologerId: astro.id });
      } else if (idleMs > timeoutMs * 0.7) {
        bus.emitTyped('astrologer:idle-warning', { astrologerId: astro.id });
      }
    }
  }

  const maxWaitMs = adminConfig.maxQueueWaitMinutes * 60_000;
  for (const astro of astrologers.values()) {
    const queued = queueRepo.listQueuedForAstrologer(astro.id);
    for (const entry of queued) {
      if (now - entry.joinedAt > maxWaitMs) {
        entry.status = 'EXPIRED';
        queueRepo.updateQueueEntry(entry);
        const recs = getRecommendations(entry.category, astro.id).astrologers;
        bus.emitTyped('queue:expired', { entry, recommendations: recs });
      }
    }
    if (queued.length > 0) broadcastQueuePositions(astro.id);
  }
}

// ── Reconnect / resync ────────────────────────────────────────────────────

export function getAstrologerSyncSnapshot(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return null;
  const active = consultationRepo.findActiveOrAcceptedForAstrologer(astrologerId);
  const pendingAssignments = consultationRepo.findAssignedForAstrologer(astrologerId);
  const queue = queueRepo.listQueuedForAstrologer(astrologerId);
  return {
    status: astro.status,
    intent: astro.intent,
    activeConsultation: active || null,
    pendingAssignments,
    queue: queue.map((entry, idx) => ({ entry, position: idx + 1, eta: calcEta(astro, idx) })),
    notifications: listNotifications(astrologerId),
  };
}

export function getUserSyncSnapshot(userEmail: string) {
  const consultation = consultationRepo.findLatestForUser(userEmail);
  const queued = queueRepo.findQueuedEntryForUserEmail(userEmail);
  if (queued) {
    const astro = astrologers.get(queued.entry.astrologerId);
    return { consultation: consultation || null, queueEntry: queued.entry, position: queued.position, eta: astro ? calcEta(astro, queued.position - 1) : null };
  }
  return { consultation: consultation || null, queueEntry: null, position: null, eta: null };
}

// ── Admin config ──────────────────────────────────────────────────────────

export function getAdminConfig(): AdminConfig {
  return { ...adminConfig };
}

export function updateAdminConfig(partial: Partial<AdminConfig>) {
  Object.assign(adminConfig, partial);
  return getAdminConfig();
}

export function setMaxConcurrent(astrologerId: number, maxConcurrent: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) throw new Error('Unknown astrologer');
  astro.maxConcurrent = Math.max(1, maxConcurrent);
  updateMaxConcurrent(astrologerId, astro.maxConcurrent);
  recomputeStatus(astrologerId);
  processQueue(astrologerId);
  return astro.maxConcurrent;
}
