import { randomUUID } from 'node:crypto';
import { withTransaction, type Executor } from '../core/db.ts';
import { findAstrologerByIdRaw, listAllAstrologersRaw, setAstrologerIntent, updateMaxConcurrent } from '../repositories/astrologerRepository.ts';
import { findUserById, findUserByEmail, debitWallet } from '../repositories/userRepository.ts';
import * as consultationRepo from '../repositories/consultationRepository.ts';
import * as queueRepo from '../repositories/queueRepository.ts';
import * as notificationRepo from '../repositories/notificationRepository.ts';
import * as processedRequestRepo from '../repositories/processedRequestRepository.ts';
import * as loyaltyRepo from '../repositories/loyaltyRepository.ts';
import * as boostRepo from '../repositories/boostRepository.ts';
import { computePriceWithOverride } from './pricingEngine.ts';
import { getRegionForCountry } from '../repositories/pricingRegionRepository.ts';
import { getOverride } from '../repositories/astrologerRegionPriceRepository.ts';
import { bus } from '../websocket/bus.ts';
import type {
  AdminConfig, AstrologerNotification, AstrologerRecord, Consultation, ConsultationKundliDetails, ConsultationType,
  EtaEstimate, NotificationKind, PublicAstrologerState, QueueEntry, RequestResult,
} from '../models/types.ts';
import type { AstrologerCatalogRow } from '../models/astrologer.ts';

// ── Astrologer live-session state ───────────────────────────────────────
// Consultations, queue entries, notifications, and the request-idempotency
// cache all live in Postgres (see the repositories above) so an active
// booking or a waiting user survives a server restart.
//
// Presence/session state below (intent, status, last-activity, away-flags,
// recent-duration samples) stays in-memory: it's ephemeral by nature — an
// astrologer's dashboard re-establishes "I'm online" on reconnect anyway.
//
// CONCURRENCY: node:sqlite used to make the booking decision race-free for
// free, because its calls were synchronous and Node is single-threaded — no
// `await` gap for a second request to land in. Postgres's driver is async,
// which reopens exactly that gap, so requestConsultation() and processQueue()
// below explicitly take a `SELECT ... FOR UPDATE` row lock on the astrologer
// for the duration of the capacity check + write. That lock (not
// single-threadedness) is what now guarantees section 51's "capacity=1 never
// double-assigns" property.

const astrologers = new Map<number, AstrologerRecord>();

const adminConfig: AdminConfig = {
  maxQueueWaitMinutes: 15,
  awayTimeoutMinutes: 5,
  defaultConsultationMinutes: 15,
  defaultMaxConcurrent: 1,
};

// A catalog row created for a real account (via the apply→approve flow,
// admin-add, or the demo astrologer seed) carries that account's real
// login email — that's the identity `getAstrologerByEmail` must resolve
// to. Rows from the original seed roster have no account behind them
// (user_id is NULL), so they get a synthetic, non-login-able email —
// just enough for the recommendation engine and public dashboards to
// still have a full roster to reason about.
async function buildAstrologerRecord(row: AstrologerCatalogRow): Promise<AstrologerRecord> {
  const owner = row.user_id ? await findUserById(row.user_id) : undefined;
  const email = owner?.email || `astrologer${row.id}@tredevastro.local`;
  return {
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
    intent: row.intent,
    status: row.intent === 'ONLINE' ? 'ONLINE_AVAILABLE' : 'OFFLINE',
    maxConcurrent: row.max_concurrent,
    lastActivityAt: Date.now(),
    durationSamplesMs: [],
  };
}

// Called explicitly from main.ts, after migrations + catalog seeding have
// run — NOT at module-load time, since the `astrologers` DB table doesn't
// exist yet when this file is first imported.
export async function seedRealtimeStore() {
  for (const row of await listAllAstrologersRaw()) {
    astrologers.set(row.id, await buildAstrologerRecord(row));
  }
  // Re-derive status (ONLINE_BUSY vs ONLINE_AVAILABLE) from persisted
  // intent + any consultations still active from before this restart.
  for (const id of astrologers.keys()) await recomputeStatus(id);
}

// Registers a single newly-created catalog row into the live store —
// without this, a fresh astrologer (from the apply→approve flow or
// admin-add) stays invisible to setIntent/requestConsultation/everything
// else in this file until the process restarts and seedRealtimeStore()
// runs again. Call right after inserting the catalog row.
export async function registerNewAstrologer(row: AstrologerCatalogRow) {
  astrologers.set(row.id, await buildAstrologerRecord(row));
}

const awayFlags = new Map<number, boolean>();

// Locks the astrologer's catalog row for the lifetime of a transaction —
// any other concurrent request for the SAME astrologer serializes behind
// this until `fn` commits or rolls back.
async function withAstrologerLock<T>(astrologerId: number, fn: (client: Executor) => Promise<T>): Promise<T> {
  return withTransaction(async client => {
    await client.query('SELECT id FROM astrologers WHERE id = $1 FOR UPDATE', [astrologerId]);
    return fn(client);
  });
}

// ── Derived state ────────────────────────────────────────────────────────

export function countActive(astrologerId: number, executor?: Executor): Promise<number> {
  return consultationRepo.countActiveForAstrologer(astrologerId, executor);
}

async function recomputeStatus(astrologerId: number, executor?: Executor) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const prev = astro.status;
  if (astro.intent === 'OFFLINE') {
    astro.status = 'OFFLINE';
  } else if (awayFlags.get(astrologerId)) {
    astro.status = 'AWAY';
  } else if ((await countActive(astrologerId, executor)) >= astro.maxConcurrent) {
    astro.status = 'ONLINE_BUSY';
  } else {
    astro.status = 'ONLINE_AVAILABLE';
  }
  if (prev !== astro.status) {
    bus.emitTyped('astrologer:status', await toPublicState(astro, executor));
  }
}

export async function toPublicState(astro: AstrologerRecord, executor?: Executor): Promise<PublicAstrologerState> {
  const [activeCount, queue] = await Promise.all([
    countActive(astro.id, executor),
    queueRepo.listQueuedForAstrologer(astro.id, executor),
  ]);
  return {
    id: astro.id,
    status: astro.status,
    activeCount,
    maxConcurrent: astro.maxConcurrent,
    queueLength: queue.length,
  };
}

export function listPublicAstrologers(): Promise<PublicAstrologerState[]> {
  return Promise.all(Array.from(astrologers.values()).map(a => toPublicState(a)));
}

export function getAstrologer(id: number) {
  return astrologers.get(id);
}

export function getAstrologerByEmail(email: string) {
  return Array.from(astrologers.values()).find(a => a.email.toLowerCase() === email.toLowerCase());
}

// ── Availability ─────────────────────────────────────────────────────────

export async function setIntent(astrologerId: number, intent: 'ONLINE' | 'OFFLINE') {
  const astro = astrologers.get(astrologerId);
  if (!astro) throw new Error('Unknown astrologer');
  astro.intent = intent;
  astro.lastActivityAt = Date.now();
  if (intent === 'ONLINE') awayFlags.set(astrologerId, false);
  await setAstrologerIntent(astrologerId, intent);
  await recomputeStatus(astrologerId);
  // Coming back online (or going offline while a stale queue exists from
  // before) should re-check whether anyone waiting can now be promoted.
  if (intent === 'ONLINE') await processQueue(astrologerId);
  return astro.status;
}

export async function touchActivity(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  astro.lastActivityAt = Date.now();
  if (awayFlags.get(astrologerId)) {
    awayFlags.set(astrologerId, false);
    await recomputeStatus(astrologerId);
  }
}

// ── Notifications ────────────────────────────────────────────────────────

async function createNotification(astrologerId: number, kind: NotificationKind, message: string, relatedConsultationId?: string, idSuffix?: string, executor?: Executor) {
  const id = `notif-${relatedConsultationId || astrologerId}-${idSuffix || kind}-${idSuffix ? '' : Date.now()}`;
  if (await notificationRepo.notificationExists(id, executor)) return; // idempotent — never double-notify the same event
  const entry: AstrologerNotification = { id, astrologerId, kind, message, relatedConsultationId, read: false, createdAt: Date.now() };
  await notificationRepo.insertNotification(entry, executor);
  bus.emitTyped('notification:created', entry);
}

export function listNotifications(astrologerId: number) {
  return notificationRepo.listNotificationsForAstrologer(astrologerId);
}

export function markNotificationRead(astrologerId: number, notificationId: string) {
  return notificationRepo.markNotificationRead(astrologerId, notificationId);
}

export function markAllNotificationsRead(astrologerId: number) {
  return notificationRepo.markAllNotificationsRead(astrologerId);
}

// ── ETA ───────────────────────────────────────────────────────────────────

function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function calcEta(astro: AstrologerRecord, positionIndexZeroBased: number, executor?: Executor): Promise<EtaEstimate> {
  const hasHistory = astro.durationSamplesMs.length > 0;
  const avgMs = hasHistory ? mean(astro.durationSamplesMs) : adminConfig.defaultConsultationMinutes * 60_000;

  const [activeConsultations, activeCount] = await Promise.all([
    consultationRepo.findActiveStartedForAstrologer(astro.id, executor),
    countActive(astro.id, executor),
  ]);
  const elapsed = activeConsultations.map(c => Date.now() - (c.startedAt as number));
  const headStart = elapsed.length ? Math.max(0, avgMs - Math.min(...elapsed)) : (activeCount > 0 ? avgMs : 0);

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

export async function getRecommendations(category: string, excludeAstrologerId: number, limit = 3) {
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
  const top = candidates.slice(0, limit);
  const states = await Promise.all(top.map(a => toPublicState(a)));
  return { usedFallback, astrologers: top.map((a, i) => ({ ...states[i], name: a.name, title: a.title, category: a.category, rating: a.rating, experience: a.experience, price: a.price, avatar: a.avatar })) };
}

// ── Booking / queue ──────────────────────────────────────────────────────

export interface RequestParams {
  requestId: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: ConsultationType;
  durationMinutes?: number; // chosen by the user at booking time; falls back to the site default
  // The requester's IP-detected country (routes.ts computes this from the
  // HTTP request — see geoLocation.ts) — used to apply a staff-set region
  // price multiplier so what's actually charged matches what the catalog
  // and effective-price endpoints showed this same visitor before booking.
  countryCode?: string | null;
  kundliDetails?: ConsultationKundliDetails;
}

export async function requestConsultation(params: RequestParams): Promise<RequestResult> {
  const astro = astrologers.get(params.astrologerId);
  if (!astro) {
    const result: RequestResult = { outcome: 'UNAVAILABLE', reason: 'Unknown astrologer' };
    return result;
  }

  const result = await withAstrologerLock(astro.id, async client => {
    const cached = await processedRequestRepo.getProcessedResult(params.requestId, client);
    if (cached) return cached; // idempotency — retries/duplicate submits never double-book

    let result: RequestResult;
    if (astro.status === 'OFFLINE' || astro.status === 'AWAY') {
      result = { outcome: 'UNAVAILABLE', reason: `Astrologer is ${astro.status.toLowerCase()}` };
    } else if ((await countActive(astro.id, client)) < astro.maxConcurrent) {
      const consultation = await createConsultation(astro.id, params, false, client);
      result = { outcome: 'ASSIGNED', consultation };
    } else {
      const entry: QueueEntry = {
        id: randomUUID(), astrologerId: astro.id, userEmail: params.userEmail, userName: params.userName,
        category: params.category, type: params.type, status: 'QUEUED', requestId: params.requestId, joinedAt: Date.now(),
        durationMinutes: params.durationMinutes && params.durationMinutes > 0 ? params.durationMinutes : adminConfig.defaultConsultationMinutes,
        kundliDetails: params.kundliDetails,
      };
      await queueRepo.insertQueueEntry(entry, client);
      const queued = await queueRepo.listQueuedForAstrologer(astro.id, client);
      const position = queued.findIndex(q => q.id === entry.id) + 1;
      const eta = await calcEta(astro, position - 1, client);
      bus.emitTyped('queue:position', { entry, position, eta });
      // Joining the waitlist while a Boost is active grants this user 7-day
      // Boost eligibility with this astrologer (Boost Feature spec) —
      // consumed whenever their next session with this astrologer starts.
      const activeBoost = await boostRepo.getActiveBoost(astro.id, client);
      if (activeBoost) await boostRepo.grantWaitlistAttribution(activeBoost.id, astro.id, params.userEmail, client);
      await createNotification(astro.id, 'queue_waiting', `${params.userName} is waiting in your queue.`, undefined, `queue-${entry.id}`, client);
      result = { outcome: 'QUEUED', entry, position, eta };
    }
    await processedRequestRepo.saveProcessedResult(params.requestId, result, client);
    return result;
  });

  // Re-emit now that withAstrologerLock's transaction is guaranteed
  // committed. The emits inside the transaction above (chat:assigned via
  // createConsultation, queue:position) fire before COMMIT — a resync they
  // trigger (see sockets.ts's resyncAstrologer) reads via a SEPARATE pool
  // connection and can race the still-open transaction, seeing stale data
  // (this was exactly why a fresh assignment needed a manual dashboard
  // refresh to show up). Re-emitting here is cheap and idempotent —
  // RealtimeContext's handlers already dedupe by id/merge by field.
  if (result.outcome === 'ASSIGNED') {
    bus.emitTyped('chat:assigned', result.consultation);
  } else if (result.outcome === 'QUEUED') {
    bus.emitTyped('queue:position', { entry: result.entry, position: result.position, eta: result.eta });
  }
  return result;
}

async function createConsultation(astrologerId: number, params: Omit<RequestParams, 'astrologerId'>, fromQueue: boolean, executor?: Executor): Promise<Consultation> {
  // Offer/loyalty pricing and Boost attribution are both locked in ONCE,
  // right here at session creation — never recalculated afterward (see
  // pricingEngine.ts's comment on why).
  const catalogRow = await findAstrologerByIdRaw(astrologerId);
  const { isLoyal } = await loyaltyRepo.getLoyalty(params.userEmail, astrologerId, executor);
  const region = await getRegionForCountry(params.countryCode ?? null);
  const regionMultiplier = region ? Number(region.price_multiplier) : 1;
  const override = region ? await getOverride(astrologerId, region.id) : undefined;
  const { pricePerMin, appliedOfferPercent } = catalogRow
    ? computePriceWithOverride(catalogRow, params.type, isLoyal, regionMultiplier, override ?? null)
    : { pricePerMin: 0, appliedOfferPercent: 0 };

  let boostId: number | undefined;
  const activeBoost = await boostRepo.getActiveBoost(astrologerId, executor);
  const attribution = activeBoost ? undefined : await boostRepo.findUnconsumedAttribution(astrologerId, params.userEmail, executor);
  if (activeBoost) {
    boostId = activeBoost.id; // direct connect during an active window — attributed for the whole session
  } else if (attribution) {
    boostId = attribution.boost_id;
  }

  const consultation: Consultation = {
    id: randomUUID(), astrologerId, userEmail: params.userEmail, userName: params.userName,
    category: params.category, type: params.type, status: 'ASSIGNED', fromQueue, requestId: params.requestId, createdAt: Date.now(),
    durationMinutes: params.durationMinutes && params.durationMinutes > 0 ? params.durationMinutes : adminConfig.defaultConsultationMinutes,
    extendedMinutes: 0,
    pricePerMin, appliedOfferPercent, boostId,
    kundliDetails: params.kundliDetails,
  };
  await consultationRepo.insertConsultation(consultation, executor);
  if (attribution) await boostRepo.consumeAttribution(attribution.id, consultation.id, executor);
  await recomputeStatus(astrologerId, executor);
  bus.emitTyped('chat:assigned', consultation);
  await createNotification(astrologerId, 'chat_request', `${params.userName} wants to start a consultation.`, consultation.id, `assign-${consultation.id}`, executor);
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

// Either party — the astrologer can end it same as before, but now so can
// the user themselves instead of only ever being able to wait for the
// astrologer to hang up.
function assertParticipant(consultation: Consultation | undefined, requesterEmail: string): Consultation {
  if (!consultation) throw new Error('Consultation not found');
  const email = requesterEmail.trim().toLowerCase();
  const astro = astrologers.get(consultation.astrologerId);
  const astroByEmail = getAstrologerByEmail(email);
  const isAstro = (astro && astro.email.trim().toLowerCase() === email) || (astroByEmail && astroByEmail.id === consultation.astrologerId);
  const isUser = consultation.userEmail.trim().toLowerCase() === email;
  if (!isAstro && !isUser) {
    throw new Error('Not authorized for this consultation');
  }
  return consultation;
}

// ── Time-boxed consultations ─────────────────────────────────────────────
// In-memory only (same tradeoff as the presence/session state above) —
// rescheduleActiveConsultationTimers() rebuilds these from the DB's real
// startedAt/duration/extended values on every boot, so a restart mid-call
// just re-derives the same remaining time rather than losing the deadline.
const expiryTimers = new Map<string, { warn?: NodeJS.Timeout; end: NodeJS.Timeout }>();

function clearExpiryTimers(consultationId: string) {
  const t = expiryTimers.get(consultationId);
  if (!t) return;
  if (t.warn) clearTimeout(t.warn);
  clearTimeout(t.end);
  expiryTimers.delete(consultationId);
}

function totalConsultationMs(c: Consultation): number {
  return (c.durationMinutes + c.extendedMinutes) * 60_000;
}

function scheduleExpiry(c: Consultation) {
  clearExpiryTimers(c.id);
  if (!c.startedAt) return;
  const remaining = c.startedAt + totalConsultationMs(c) - Date.now();
  if (remaining <= 0) {
    // Already overdue (e.g. the server was down past the deadline) — end it
    // now instead of scheduling a timer with a negative delay.
    autoEndConsultation(c.id).catch(console.error);
    return;
  }
  const end = setTimeout(() => autoEndConsultation(c.id).catch(console.error), remaining);
  let warn: NodeJS.Timeout | undefined;
  if (remaining > 60_000) {
    warn = setTimeout(() => {
      bus.emitTyped('chat:expiring-soon', { consultationId: c.id, remainingSeconds: 60 });
    }, remaining - 60_000);
  }
  expiryTimers.set(c.id, { warn, end });
}

// Wallet billing happens exactly once, here, when a consultation actually
// ends — never ticked during the call. Deferring it this way is what lets
// onWalletTopUp below recompute "how much time is this worth" from the raw
// wallet balance at any point mid-call (nothing's been subtracted from it
// yet) instead of tracking a separate "remaining" counter. Debits only the
// real elapsed time, clamped to whatever's left (debitWallet's own guard) —
// an early hangup is only charged for the minutes actually used.
async function settleConsultationBilling(c: Consultation): Promise<void> {
  if (!c.startedAt || !c.endedAt || c.pricePerMin <= 0) return;
  const user = await findUserByEmail(c.userEmail);
  if (!user) return;
  const elapsedMinutes = (c.endedAt - c.startedAt) / 60_000;
  const cost = Math.round(c.pricePerMin * elapsedMinutes);
  if (cost > 0) await debitWallet(user.id, cost);
}

// System-initiated end (the clock ran out, nobody topped up) — same
// bookkeeping as endConsultation but with no participant to authorize
// against. In the wallet-billing model this timer's deadline IS the
// affordability limit (see acceptConsultation/onWalletTopUp), so reaching it
// always means "ran out of balance" — tagged via endReason for the frontend.
async function autoEndConsultation(consultationId: string) {
  const c = await consultationRepo.findConsultationById(consultationId);
  if (!c || c.status !== 'ACTIVE') return;
  clearExpiryTimers(c.id);
  c.status = 'COMPLETED';
  c.endedAt = Date.now();
  await consultationRepo.updateConsultation(c);
  await settleConsultationBilling(c);
  recordDurationSample(c);
  if (c.startedAt && c.endedAt) await loyaltyRepo.addSessionMinutes(c.userEmail, c.astrologerId, c.endedAt - c.startedAt);
  await touchActivity(c.astrologerId);
  await recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:ended', { ...c, endReason: 'INSUFFICIENT_BALANCE' });
  await createNotification(c.astrologerId, 'consultation_completed', `${c.userName}'s consultation has ended.`, c.id, `complete-${c.id}`);
  await processQueue(c.astrologerId);
}

function recordDurationSample(c: Consultation) {
  if (!c.startedAt || !c.endedAt) return;
  const astro = astrologers.get(c.astrologerId);
  if (!astro) return;
  astro.durationSamplesMs.push(c.endedAt - c.startedAt);
  if (astro.durationSamplesMs.length > 20) astro.durationSamplesMs.shift();
}

// Called once at boot (after seedRealtimeStore) — an ACTIVE consultation's
// deadline is derived fresh from its real startedAt/duration/extended
// columns, so this always reschedules the correct remaining time (or ends
// it immediately if the deadline already passed while the server was down).
export async function rescheduleActiveConsultationTimers() {
  for (const c of await consultationRepo.listActiveConsultations()) {
    scheduleExpiry(c);
  }
}

// Adds minutes to an ACTIVE consultation and reschedules its expiry —
// either party can top up, same as either party can now end it.
export async function extendConsultation(consultationId: string, requesterEmail: string, extraMinutes: number): Promise<Consultation> {
  if (!Number.isFinite(extraMinutes) || extraMinutes <= 0) throw new Error('extraMinutes must be a positive number');
  const c = assertParticipant(await consultationRepo.findConsultationById(consultationId), requesterEmail);
  if (c.status !== 'ACTIVE') throw new Error(`Cannot extend a consultation in status ${c.status}`);
  c.extendedMinutes += extraMinutes;
  await consultationRepo.updateConsultation(c);
  scheduleExpiry(c);
  bus.emitTyped('chat:extended', c);
  return c;
}

export async function acceptConsultation(consultationId: string, astrologerEmail: string): Promise<Consultation> {
  const c = assertOwnership(await consultationRepo.findConsultationById(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot accept a consultation in status ${c.status}`);

  // The real timer starts here, not at request time — this is the first
  // moment billing matters, so it's also where "how long can this balance
  // actually buy" gets computed (wallet-based billing; see requestConsultation's
  // route-level balance precheck, settleConsultationBilling, and
  // onWalletTopUp for the rest of this model).
  const user = await findUserByEmail(c.userEmail);
  if (!user || user.wallet_balance <= 0) throw new Error('Insufficient wallet balance');
  c.durationMinutes = c.pricePerMin > 0 ? user.wallet_balance / c.pricePerMin : adminConfig.defaultConsultationMinutes;
  c.extendedMinutes = 0;

  c.status = 'ACTIVE';
  c.acceptedAt = Date.now();
  c.startedAt = Date.now();
  await consultationRepo.updateConsultation(c);
  await touchActivity(c.astrologerId);
  scheduleExpiry(c);
  bus.emitTyped('chat:accepted', c);
  bus.emitTyped('chat:started', c);
  return c;
}

// A recharge landing while the user is mid-call extends it live — the
// deferred-billing model (see settleConsultationBilling) means the wallet
// balance hasn't been touched since the call started, so re-running the
// exact same "balance / pricePerMin" formula from acceptConsultation
// correctly accounts for time already elapsed AND the new top-up in one go.
// Reuses `chat:extended` — the same event/UI the old pay-to-extend flow used,
// so the frontend's existing handler (clears the low-balance banner) needs
// no changes for this.
export async function onWalletTopUp(userEmail: string): Promise<void> {
  const c = await consultationRepo.findActiveForUser(userEmail);
  if (!c || !c.startedAt) return;
  const user = await findUserByEmail(userEmail);
  if (!user || c.pricePerMin <= 0) return;
  c.durationMinutes = user.wallet_balance / c.pricePerMin;
  c.extendedMinutes = 0;
  await consultationRepo.updateConsultation(c);
  scheduleExpiry(c);
  bus.emitTyped('chat:extended', c);
}

export async function declineConsultation(consultationId: string, astrologerEmail: string): Promise<Consultation> {
  const c = assertOwnership(await consultationRepo.findConsultationById(consultationId), astrologerEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot decline a consultation in status ${c.status}`);
  c.status = 'DECLINED';
  c.endedAt = Date.now();
  await consultationRepo.updateConsultation(c);
  await touchActivity(c.astrologerId);
  await recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:declined', c);
  await processQueue(c.astrologerId);
  return c;
}

// The user's own way out of a request the astrologer hasn't responded to
// yet — previously there was genuinely no path here: endConsultation only
// accepts ACTIVE, and declineConsultation can only be called by the
// astrologer (assertOwnership). Without this, an ASSIGNED request nobody
// ever acted on left the user stuck on the waiting screen with no way out
// but abandoning the tab (reopening the app lands them right back on it,
// since this is server-tracked state). Separate from declineConsultation
// (and its own `chat:declined` event) rather than reusing it, since that
// path's "your request was declined" toast would be the wrong message for
// something the user themselves chose to do.
export async function cancelConsultation(consultationId: string, requesterEmail: string): Promise<Consultation> {
  const c = assertParticipant(await consultationRepo.findConsultationById(consultationId), requesterEmail);
  if (c.status !== 'ASSIGNED') throw new Error(`Cannot cancel a consultation in status ${c.status}`);
  c.status = 'CANCELLED';
  c.endedAt = Date.now();
  await consultationRepo.updateConsultation(c);
  await touchActivity(c.astrologerId);
  await recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:cancelled', c);
  await processQueue(c.astrologerId);
  return c;
}

// Either the astrologer or the user can end an active consultation now —
// previously only the astrologer could (assertOwnership), leaving the user
// with no way to disconnect on their own.
export async function endConsultation(consultationId: string, requesterEmail: string): Promise<Consultation> {
  const c = assertParticipant(await consultationRepo.findConsultationById(consultationId), requesterEmail);
  if (c.status === 'COMPLETED') {
    // Idempotent: already ended, return immediately so client transitions smoothly
    return c;
  }
  if (c.status !== 'ACTIVE' && c.status !== 'ACCEPTED') {
    throw new Error(`Cannot end a consultation in status ${c.status}`);
  }
  clearExpiryTimers(c.id);
  c.status = 'COMPLETED';
  c.endedAt = Date.now();
  await consultationRepo.updateConsultation(c);
  await settleConsultationBilling(c);
  recordDurationSample(c);
  if (c.startedAt && c.endedAt) await loyaltyRepo.addSessionMinutes(c.userEmail, c.astrologerId, c.endedAt - c.startedAt);
  await touchActivity(c.astrologerId);
  await recomputeStatus(c.astrologerId);
  bus.emitTyped('chat:ended', c);
  await createNotification(c.astrologerId, 'consultation_completed', `${c.userName}'s consultation has ended.`, c.id, `complete-${c.id}`);
  await processQueue(c.astrologerId);
  return c;
}

export async function cancelQueueEntry(entryId: string, userEmail: string) {
  const entry = await queueRepo.findQueueEntryById(entryId);
  if (!entry) throw new Error('Queue entry not found');
  if (entry.userEmail.toLowerCase() !== userEmail.toLowerCase()) throw new Error('Not authorized for this queue entry');
  if (entry.status !== 'QUEUED') return entry;
  entry.status = 'CANCELLED';
  await queueRepo.updateQueueEntry(entry);
  await broadcastQueuePositions(entry.astrologerId);
  return entry;
}

async function broadcastQueuePositions(astrologerId: number, executor?: Executor) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return;
  const waiting = await queueRepo.listQueuedForAstrologer(astrologerId, executor);
  await Promise.all(waiting.map(async (entry, idx) => {
    const eta = await calcEta(astro, idx, executor);
    bus.emitTyped('queue:position', { entry, position: idx + 1, eta });
  }));
}

// One locked attempt: if there's capacity and someone waiting, promote the
// single oldest QUEUED entry. Returns whether it promoted anyone, so
// processQueue can keep calling this until either is false.
async function promoteOneIfCapacity(astrologerId: number): Promise<boolean> {
  const promoted = await withAstrologerLock(astrologerId, async client => {
    const astro = astrologers.get(astrologerId);
    if (!astro || astro.status === 'OFFLINE' || astro.intent !== 'ONLINE') return null;
    if ((await countActive(astrologerId, client)) >= astro.maxConcurrent) return null;

    const [next] = await queueRepo.listQueuedForAstrologer(astrologerId, client);
    if (!next) return null;

    next.status = 'PROMOTED';
    await queueRepo.updateQueueEntry(next, client);
    const consultation = await createConsultation(astrologerId, {
      requestId: next.requestId, userEmail: next.userEmail, userName: next.userName, category: next.category, type: next.type,
      durationMinutes: next.durationMinutes,
    }, true, client);
    next.promotedConsultationId = consultation.id;
    await queueRepo.updateQueueEntry(next, client);
    return { entry: next, consultation };
  });
  if (!promoted) return false;
  // Re-emit post-commit — same reasoning as requestConsultation's identical
  // comment (a resync triggered by the emit inside createConsultation, still
  // inside the transaction, can otherwise race an uncommitted read).
  bus.emitTyped('queue:promoted', promoted);
  bus.emitTyped('chat:assigned', promoted.consultation);
  return true;
}

export async function processQueue(astrologerId: number) {
  // Each promotion takes its own lock rather than holding one lock across
  // the whole loop — keeps any single transaction short.
  while (await promoteOneIfCapacity(astrologerId)) { /* keep promoting while there's room and people waiting */ }
  await broadcastQueuePositions(astrologerId);
}

// ── Periodic maintenance (auto-away, queue timeout) ──────────────────────

export async function runMaintenanceTick(now = Date.now()) {
  for (const astro of astrologers.values()) {
    if (astro.intent === 'ONLINE' && !awayFlags.get(astro.id)) {
      const idleMs = now - astro.lastActivityAt;
      const timeoutMs = adminConfig.awayTimeoutMinutes * 60_000;
      if (idleMs > timeoutMs) {
        awayFlags.set(astro.id, true);
        await recomputeStatus(astro.id);
        bus.emitTyped('astrologer:away', { astrologerId: astro.id });
      } else if (idleMs > timeoutMs * 0.7) {
        bus.emitTyped('astrologer:idle-warning', { astrologerId: astro.id });
      }
    }
  }

  const maxWaitMs = adminConfig.maxQueueWaitMinutes * 60_000;
  for (const astro of astrologers.values()) {
    const queued = await queueRepo.listQueuedForAstrologer(astro.id);
    for (const entry of queued) {
      if (now - entry.joinedAt > maxWaitMs) {
        entry.status = 'EXPIRED';
        await queueRepo.updateQueueEntry(entry);
        const recs = (await getRecommendations(entry.category, astro.id)).astrologers;
        bus.emitTyped('queue:expired', { entry, recommendations: recs });
      }
    }
    if (queued.length > 0) await broadcastQueuePositions(astro.id);
  }
}

// ── Reconnect / resync ────────────────────────────────────────────────────

export async function getAstrologerSyncSnapshot(astrologerId: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) return null;
  const [active, pendingAssignments, queue, notifications] = await Promise.all([
    consultationRepo.findActiveOrAcceptedForAstrologer(astrologerId),
    consultationRepo.findAssignedForAstrologer(astrologerId),
    queueRepo.listQueuedForAstrologer(astrologerId),
    listNotifications(astrologerId),
  ]);
  const queueWithPositions = await Promise.all(queue.map(async (entry, idx) => ({ entry, position: idx + 1, eta: await calcEta(astro, idx) })));
  return {
    status: astro.status,
    intent: astro.intent,
    activeConsultation: active || null,
    pendingAssignments,
    queue: queueWithPositions,
    notifications,
  };
}

export async function getUserSyncSnapshot(userEmail: string) {
  const [consultation, queued] = await Promise.all([
    consultationRepo.findLatestForUser(userEmail),
    queueRepo.findQueuedEntryForUserEmail(userEmail),
  ]);
  if (queued) {
    const astro = astrologers.get(queued.entry.astrologerId);
    return { consultation: consultation || null, queueEntry: queued.entry, position: queued.position, eta: astro ? await calcEta(astro, queued.position - 1) : null };
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

export async function setMaxConcurrent(astrologerId: number, maxConcurrent: number) {
  const astro = astrologers.get(astrologerId);
  if (!astro) throw new Error('Unknown astrologer');
  astro.maxConcurrent = Math.max(1, maxConcurrent);
  await updateMaxConcurrent(astrologerId, astro.maxConcurrent);
  await recomputeStatus(astrologerId);
  await processQueue(astrologerId);
  return astro.maxConcurrent;
}
