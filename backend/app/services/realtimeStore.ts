import { randomUUID } from 'node:crypto';
import { ASTROLOGERS } from '../core/seedAstrologers.ts';
import { bus } from '../websocket/bus.ts';
import type {
  AdminConfig, AstrologerNotification, AstrologerRecord, Consultation, ConsultationType,
  EtaEstimate, NotificationKind, PublicAstrologerState, QueueEntry, RequestResult,
} from '../models/types.ts';

// ── In-memory store ──────────────────────────────────────────────────────
// Everything here is authoritative. No client ever decides availability,
// queue position, ETA, or consultation state — it only reflects what's
// computed here. Kept fully synchronous (no `await` inside mutations) so
// Node's single-threaded event loop gives us atomicity for free: two
// requests can never interleave in the middle of a check-then-write, which
// is what actually prevents the race conditions this spec calls out. If this
// ever grows a real database, that guarantee has to be re-earned explicitly
// (a transaction / row lock) — don't assume it carries over for free.

const astrologers = new Map<number, AstrologerRecord>();
const consultationsById = new Map<string, Consultation>();
const queueByAstrologer = new Map<number, QueueEntry[]>();
const notificationsByAstrologer = new Map<number, AstrologerNotification[]>();
const processedRequests = new Map<string, RequestResult>();

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

function seed() {
  for (const a of ASTROLOGERS) {
    const email = a.name === 'Astrologist Rahul Shastri' ? DEMO_ASTROLOGER_EMAIL : `astrologer${a.id}@tredevastro.local`;
    astrologers.set(a.id, {
      id: a.id,
      name: a.name,
      title: a.title,
      category: a.category,
      languages: a.languages,
      consultationTypes: ['chat', 'voice', 'video'],
      rating: a.rating,
      experience: a.experience,
      price: a.price,
      avatar: a.avatar,
      email,
      intent: 'OFFLINE',
      status: 'OFFLINE',
      maxConcurrent: adminConfig.defaultMaxConcurrent,
      lastActivityAt: Date.now(),
      durationSamplesMs: [],
    });
    queueByAstrologer.set(a.id, []);
    notificationsByAstrologer.set(a.id, []);
  }
}
seed();

const awayFlags = new Map<number, boolean>();

// ── Derived state ────────────────────────────────────────────────────────

export function countActive(astrologerId: number): number {
  let n = 0;
  for (const c of consultationsById.values()) {
    if (c.astrologerId === astrologerId && (c.status === 'ASSIGNED' || c.status === 'ACCEPTED' || c.status === 'ACTIVE')) n++;
  }
  return n;
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
    queueLength: (queueByAstrologer.get(astro.id) || []).filter(q => q.status === 'QUEUED').length,
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
  const list = notificationsByAstrologer.get(astrologerId) || [];
  if (list.some(n => n.id === id)) return; // idempotent — never double-notify the same event
  const entry: AstrologerNotification = { id, astrologerId, kind, message, relatedConsultationId, read: false, createdAt: Date.now() };
  list.unshift(entry);
  notificationsByAstrologer.set(astrologerId, list);
  bus.emitTyped('notification:created', entry);
}

export function listNotifications(astrologerId: number) {
  return notificationsByAstrologer.get(astrologerId) || [];
}

export function markNotificationRead(astrologerId: number, notificationId: string) {
  const list = notificationsByAstrologer.get(astrologerId) || [];
  const n = list.find(x => x.id === notificationId);
  if (n) n.read = true;
}

export function markAllNotificationsRead(astrologerId: number) {
  for (const n of notificationsByAstrologer.get(astrologerId) || []) n.read = true;
}

// ── ETA ───────────────────────────────────────────────────────────────────

function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function calcEta(astro: AstrologerRecord, positionIndexZeroBased: number): EtaEstimate {
  const hasHistory = astro.durationSamplesMs.length > 0;
  const avgMs = hasHistory ? mean(astro.durationSamplesMs) : adminConfig.defaultConsultationMinutes * 60_000;

  const activeConsultations = Array.from(consultationsById.values()).filter(c => c.astrologerId === astro.id && c.status === 'ACTIVE' && c.startedAt);
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
  const cached = processedRequests.get(params.requestId);
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
    const queue = queueByAstrologer.get(astro.id) || [];
    queue.push(entry);
    queueByAstrologer.set(astro.id, queue);
    const position = queue.filter(q => q.status === 'QUEUED').findIndex(q => q.id === entry.id) + 1;
    const eta = calcEta(astro, position - 1);
    bus.emitTyped('queue:position', { entry, position, eta });
    createNotification(astro.id, 'queue_waiting', `${params.userName} is waiting in your queue.`, undefined, `queue-${entry.id}`);
    result = { outcome: 'QUEUED', entry, position, eta };
  }
  processedRequests.set(params.requestId, result);
  return result;
}

function createConsultation(astrologerId: number, params: Omit<RequestParams, 'astrologerId'>, fromQueue: boolean): Consultation {
  const consultation: Consultation = {
    id: randomUUID(), astrologerId, userEmail: params.userEmail, userName: params.userName,
    category: params.category, type: params.type, status: 'ASSIGNED', fromQueue, requestId: params.requestId, createdAt: Date.now(),
  };
  consultationsById.set(consultation.id, consultation);
  recomputeStatus(astrologerId);
  bus.emitTyped('chat:assigned', consultation);
  createNotification(astrologerId, 'chat_request', `${params.userName} wants to start a consultation.`, consultation.id, `assign-${consultation.id}`);
  return consultation;
}

export function getConsultation(id: string) {
  return consultationsById.get(id);
}

function assertOwnership(consultation: Consultation | undefined, astrologerEmail: string): Consultation {
  if (!consultation) throw new Error('Consultation not found');
  const astro = astrologers.get(consultation.astrologerId);
  if (!astro || astro.email.toLowerCase() !== astrologerEmail.toLowerCase()) throw new Error('Not authorized for this consultation');
  return consultation;
}

export function acceptConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationsById.get(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot accept a consultation in status ${c.status}`);
  c.status = 'ACTIVE';
  c.acceptedAt = Date.now();
  c.startedAt = Date.now();
  touchActivity(c.astrologerId);
  bus.emitTyped('chat:accepted', c);
  bus.emitTyped('chat:started', c);
  return c;
}

export function declineConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationsById.get(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot decline a consultation in status ${c.status}`);
  c.status = 'DECLINED';
  c.endedAt = Date.now();
  touchActivity(c.astrologerId);
  recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:declined', c);
  processQueue(c.astrologerId);
  return c;
}

export function endConsultation(consultationId: string, astrologerEmail: string): Consultation {
  const c = assertOwnership(consultationsById.get(consultationId), astrologerEmail);
  if (c.status !== 'ACTIVE') throw new Error(`Cannot end a consultation in status ${c.status}`);
  c.status = 'COMPLETED';
  c.endedAt = Date.now();
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
  for (const [astrologerId, queue] of queueByAstrologer.entries()) {
    const entry = queue.find(q => q.id === entryId);
    if (!entry) continue;
    if (entry.userEmail.toLowerCase() !== userEmail.toLowerCase()) throw new Error('Not authorized for this queue entry');
    if (entry.status !== 'QUEUED') return entry;
    entry.status = 'CANCELLED';
    broadcastQueuePositions(astrologerId);
    return entry;
  }
  throw new Error('Queue entry not found');
}

function broadcastQueuePositions(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const waiting = (queueByAstrologer.get(astrologerId) || []).filter(q => q.status === 'QUEUED');
  waiting.forEach((entry, idx) => {
    const eta = calcEta(astro, idx);
    bus.emitTyped('queue:position', { entry, position: idx + 1, eta });
  });
}

export function processQueue(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const queue = queueByAstrologer.get(astrologerId) || [];
  while (astro.status !== 'OFFLINE' && astro.intent === 'ONLINE' && countActive(astrologerId) < astro.maxConcurrent) {
    const next = queue.find(q => q.status === 'QUEUED');
    if (!next) break;
    next.status = 'PROMOTED';
    const consultation = createConsultation(astrologerId, {
      requestId: next.requestId, userEmail: next.userEmail, userName: next.userName, category: next.category, type: next.type,
    }, true);
    next.promotedConsultationId = consultation.id;
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

  for (const [astrologerId, queue] of queueByAstrologer.entries()) {
    const maxWaitMs = adminConfig.maxQueueWaitMinutes * 60_000;
    for (const entry of queue) {
      if (entry.status === 'QUEUED' && now - entry.joinedAt > maxWaitMs) {
        entry.status = 'EXPIRED';
        const astro = astrologers.get(astrologerId);
        const category = entry.category;
        const recs = astro ? getRecommendations(category, astro.id).astrologers : [];
        bus.emitTyped('queue:expired', { entry, recommendations: recs });
      }
    }
    broadcastQueuePositions(astrologerId);
  }
}

// ── Reconnect / resync ────────────────────────────────────────────────────

export function getAstrologerSyncSnapshot(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return null;
  const active = Array.from(consultationsById.values()).find(c => c.astrologerId === astrologerId && (c.status === 'ACCEPTED' || c.status === 'ACTIVE'));
  const pendingAssignments = Array.from(consultationsById.values()).filter(c => c.astrologerId === astrologerId && c.status === 'ASSIGNED');
  const queue = (queueByAstrologer.get(astrologerId) || []).filter(q => q.status === 'QUEUED');
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
  const consultation = Array.from(consultationsById.values())
    .filter(c => c.userEmail.toLowerCase() === userEmail.toLowerCase())
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  for (const [astrologerId, queue] of queueByAstrologer.entries()) {
    const idx = queue.filter(q => q.status === 'QUEUED').findIndex(q => q.userEmail.toLowerCase() === userEmail.toLowerCase());
    if (idx >= 0) {
      const astro = astrologers.get(astrologerId);
      const entry = queue.filter(q => q.status === 'QUEUED')[idx];
      return { consultation: consultation || null, queueEntry: entry, position: idx + 1, eta: astro ? calcEta(astro, idx) : null };
    }
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
  recomputeStatus(astrologerId);
  processQueue(astrologerId);
  return astro.maxConcurrent;
}
