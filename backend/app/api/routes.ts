import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  acceptConsultation, cancelConsultation, cancelQueueEntry, declineConsultation, endConsultation,
  getAdminConfig, getAstrologer, getAstrologerByEmail, getAstrologerSyncSnapshot,
  getRecommendations, getUserSyncSnapshot, listNotifications, listPublicAstrologers,
  markAllNotificationsRead, markNotificationRead, requestConsultation, setIntent,
  setMaxConcurrent, touchActivity, updateAdminConfig,
} from '../services/realtimeStore.ts';
import type { ConsultationType } from '../models/types.ts';
import { clientIp, countryFromRequest } from '../services/geoLocation.ts';
import { listActiveBanners } from '../repositories/bannerRepository.ts';
import {
  countPoojaSessionRegistrations, findPoojaSession, isRegisteredForPoojaSession, listPoojaBooks, listPoojaVideos,
  listUpcomingPoojaSessions, registerForPoojaSession,
} from '../repositories/poojaRepository.ts';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { findUserByEmail } from '../repositories/userRepository.ts';
import { findNonTerminalForUser } from '../repositories/consultationRepository.ts';
import { findQueuedEntryForUserEmail } from '../repositories/queueRepository.ts';
import { recordAnonLead, recordPageView } from '../repositories/pageViewRepository.ts';

export const router = Router();

// Identity comes ONLY from the verified bearer token (req.user, set by
// requireAuth from the JWT + users row) — never from an `email` the client
// puts in the body/query. On top of that, ownership is enforced in
// realtimeStore.ts: an astrologer can only accept/decline/end their OWN
// consultations, and a user can only cancel their OWN queue entry.

// The logged-in astrologer's catalog record, or a 403 if this account isn't one.
function myAstrologer(req: Request, res: Response) {
  const astro = getAstrologerByEmail(req.user!.email);
  if (!astro) { res.status(403).json({ error: 'Not an astrologer account' }); return null; }
  return astro;
}

// Lets the frontend auto-select a phone country-calling-code (see
// AuthPage.tsx's phone entry step) without shipping its own IP geolocation —
// reuses the same free, offline, no-rate-limit lookup pricing already relies
// on. `countryCode` is an ISO 3166-1 alpha-2 code (e.g. "IN") or null when it
// can't be determined (localhost, an IP with no geo data) — the frontend
// falls back to a sensible default in that case, same as pricing does.
router.get('/geo/country', (req, res) => {
  res.json({ countryCode: countryFromRequest(req) });
});

const pageViewLimiter = rateLimit({ windowMs: 60_000, max: 120 });

// Fire-and-forget page-view logging for the admin/staff Users drawer's
// activity trail and the Overview page's traffic feed (see
// pageViewRepository.ts) — optionalAuth so this never 401s. Logged even for
// an anonymous visitor (user_id null) so staff/admin can see where traffic
// is coming from before/without a signup, not just from existing accounts.
router.post('/track/pageview', pageViewLimiter, optionalAuth, async (req, res) => {
  const path = typeof req.body?.path === 'string' ? req.body.path.slice(0, 200) : '';
  const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.slice(0, 100) : null;
  if (path) {
    await recordPageView(req.user?.id ?? null, visitorId, path, clientIp(req), req.headers['user-agent'] || '', countryFromRequest(req)).catch(() => {});
  }
  res.json({ success: true });
});

// Fire-and-forget lead capture for a visitor who filled a calculator form
// (name/email/phone — see BirthDetailsForm.tsx) without logging in. Logged
// in users already have this info on their account (see listLeads's `users`
// join) — this route is skipped for them, there's nothing to add.
router.post('/track/lead', pageViewLimiter, optionalAuth, async (req, res) => {
  if (req.user) return res.json({ success: true });
  const visitorId = typeof req.body?.visitorId === 'string' ? req.body.visitorId.slice(0, 100) : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 150) : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().slice(0, 200) : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().slice(0, 30) : null;
  const source = typeof req.body?.source === 'string' ? req.body.source.slice(0, 100) : '';
  if (visitorId && email) {
    await recordAnonLead(visitorId, name, email, phone, source).catch(() => {});
  }
  res.json({ success: true });
});

router.get('/astrologers', async (_req, res) => {
  res.json(await listPublicAstrologers());
});

// Public feed for the homepage CampaignBanner carousel — staff-managed, see
// admin.routes.ts's 'banners' section. No auth: same trust level as the
// public astrologer catalog above.
router.get('/banners/active', async (_req, res) => {
  res.json(await listActiveBanners(Date.now()));
});

router.get('/astrologers/:id/recommendations', async (req, res) => {
  const category = String(req.query.category || '');
  const result = await getRecommendations(category, Number(req.params.id));
  res.json(result);
});

// Pooja hub — recorded videos, upcoming group sessions and the aarti/book
// library are all public reads, same trust level as the astrologer catalog.
router.get('/pooja/videos', async (_req, res) => {
  res.json(await listPoojaVideos());
});

// meetingUrl is withheld here — only revealed by the join endpoint below,
// once the requester is actually registered. registeredCount is attached
// so the frontend can show a "seats filling up" indicator — this list is
// small and staff-curated, so an N+1 count per row is fine at this scale.
router.get('/pooja/sessions', async (_req, res) => {
  const sessions = await listUpcomingPoojaSessions(Date.now());
  const withCounts = await Promise.all(sessions.map(async ({ meetingUrl: _meetingUrl, ...s }) => ({
    ...s, registeredCount: await countPoojaSessionRegistrations(s.id),
  })));
  res.json(withCounts);
});

router.get('/pooja/books', async (_req, res) => {
  res.json(await listPoojaBooks());
});

// Everything below needs a logged-in user.
router.use(['/availability', '/heartbeat', '/astrologers/:id/sync', '/users', '/consultations', '/queue', '/notifications', '/admin', '/pooja/sessions/:id/join'], requireAuth);

// RSVP to a group pooja — idempotent, and returns the meeting link only once
// registered (so it never leaks to someone who hasn't joined).
router.post('/pooja/sessions/:id/join', async (req, res) => {
  const session = await findPoojaSession(String(req.params.id));
  if (!session) return res.status(404).json({ error: 'Unknown session' });
  await registerForPoojaSession(session.id, req.user!.email, Date.now());
  res.json({ ...session, registered: true });
});

router.get('/pooja/sessions/:id/registration', requireAuth, async (req, res) => {
  res.json({ registered: await isRegisteredForPoojaSession(String(req.params.id), req.user!.email) });
});

router.post('/availability', async (req, res) => {
  const { intent } = req.body as { intent?: 'ONLINE' | 'OFFLINE' };
  const astro = myAstrologer(req, res);
  if (!astro) return;
  if (intent !== 'ONLINE' && intent !== 'OFFLINE') return res.status(400).json({ error: 'intent must be ONLINE or OFFLINE' });
  const status = await setIntent(astro.id, intent);
  res.json({ status });
});

router.post('/heartbeat', async (req, res) => {
  const astro = myAstrologer(req, res);
  if (!astro) return;
  await touchActivity(astro.id);
  res.json({ ok: true });
});

router.get('/astrologers/:id/sync', async (req, res) => {
  // An astrologer's private dashboard state — only that astrologer (or an admin).
  if (req.user!.role !== 'ADMIN' && getAstrologerByEmail(req.user!.email)?.id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const snapshot = await getAstrologerSyncSnapshot(Number(req.params.id));
  if (!snapshot) return res.status(404).json({ error: 'Unknown astrologer' });
  res.json(snapshot);
});

router.get('/users/sync', async (req, res) => {
  res.json(await getUserSyncSnapshot(req.user!.email));
});

const requestSchema = z.object({
  requestId: z.string().min(1).max(100),
  astrologerId: z.number().int().positive(),
  userName: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  type: z.enum(['chat', 'voice', 'video']) satisfies z.ZodType<ConsultationType>,
  durationMinutes: z.number().int().positive().max(600).optional(),
  kundliDetails: z.object({
    name: z.string().trim().min(1).max(100),
    date: z.string().min(1).max(20),
    time: z.string().max(20).optional(),
    placeName: z.string().max(200).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    timezoneOffsetMinutes: z.number().optional(),
  }).optional(),
});

router.post('/consultations/request', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
  const { requestId, astrologerId, userName, category, type, durationMinutes, kundliDetails } = parsed.data;
  const userEmail = req.user!.email;
  const astro = getAstrologer(astrologerId);
  if (!astro) return res.status(404).json({ error: 'Unknown astrologer' });
  // Wallet billing (see realtimeStore.ts's acceptConsultation) only computes
  // a real duration once the astrologer accepts — this is just a cheap
  // upfront gate so nobody queues (and wastes an astrologer's slot) with
  // literally nothing to bill.
  const requester = await findUserByEmail(userEmail);
  if (!requester || requester.wallet_balance <= 0) {
    return res.status(402).json({ error: 'Insufficient wallet balance. Please recharge your wallet to start a consultation.' });
  }
  // A second simultaneous request would let two different astrologers'
  // acceptConsultation calls each size their own session off the SAME,
  // still-undiminished wallet balance (see findNonTerminalForUser's own
  // comment) — requestConsultation only locks the target astrologer's row,
  // so this is the only place that actually stops it.
  // ponytail: check-then-act, not locked — closes the common case (one
  // request at a time) but two truly simultaneous requests from the same
  // user could still both pass this check before either's row exists.
  // Upgrade path: a per-user advisory lock (pg_advisory_xact_lock) around
  // this check + requestConsultation if that narrow race ever matters in
  // practice.
  if (await findNonTerminalForUser(userEmail)) {
    return res.status(409).json({ error: 'You already have an active or pending consultation.' });
  }
  if (await findQueuedEntryForUserEmail(userEmail)) {
    return res.status(409).json({ error: 'You are already in a queue for another astrologer.' });
  }
  const countryCode = countryFromRequest(req);
  const result = await requestConsultation({ requestId, astrologerId, userEmail, userName, category, type, durationMinutes, countryCode, kundliDetails });
  res.json(result);
});

router.post('/consultations/:id/accept', async (req, res) => {
  try {
    res.json(await acceptConsultation(req.params.id, req.user!.email));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/consultations/:id/decline', async (req, res) => {
  try {
    res.json(await declineConsultation(req.params.id, req.user!.email));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/consultations/:id/end', async (req, res) => {
  try {
    res.json(await endConsultation(req.params.id, req.user!.email));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// No direct REST route for /extend — this used to exist here unguarded
// (any logged-in participant could add arbitrary free minutes to any
// consultation, fully bypassing wallet billing; a real, live exploit, not
// hypothetical). The wallet-billing model's real equivalent is implicit:
// recharging mid-call re-runs the same balance/pricePerMin math via
// onWalletTopUp (realtimeStore.ts) and reschedules the session automatically
// — no separate "add minutes" action should exist. extendConsultation()
// itself is kept only for the legacy, payment-gated CONSULTATION_EXTEND
// purpose in fulfillment.ts, which computes and charges a real amount
// server-side before ever calling it.

router.post('/consultations/:id/cancel', async (req, res) => {
  try {
    res.json(await cancelConsultation(req.params.id, req.user!.email));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/queue/:id/cancel', async (req, res) => {
  try {
    res.json(await cancelQueueEntry(req.params.id, req.user!.email));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/notifications', async (req, res) => {
  const astro = myAstrologer(req, res);
  if (!astro) return;
  res.json(await listNotifications(astro.id));
});

router.post('/notifications/:id/read', async (req, res) => {
  const astro = myAstrologer(req, res);
  if (!astro) return;
  await markNotificationRead(astro.id, req.params.id);
  res.json({ ok: true });
});

router.post('/notifications/read-all', async (req, res) => {
  const astro = myAstrologer(req, res);
  if (!astro) return;
  await markAllNotificationsRead(astro.id);
  res.json({ ok: true });
});

// Admin config — ADMIN only, enforced here (the frontend hiding the UI is
// cosmetic). Only these known keys, each a sane positive integer.
const minutes = z.number().int().positive().max(24 * 60);
const adminConfigSchema = z.object({
  maxQueueWaitMinutes: minutes, awayTimeoutMinutes: minutes, defaultConsultationMinutes: minutes,
  defaultMaxConcurrent: z.number().int().positive().max(100),
}).partial().strict();

router.get('/admin/config', requireRole('ADMIN'), (_req, res) => {
  res.json(getAdminConfig());
});

router.post('/admin/config', requireRole('ADMIN'), (req, res) => {
  const parsed = adminConfigSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Invalid config values' });
  res.json(updateAdminConfig(parsed.data));
});

router.post('/admin/astrologers/:id/max-concurrent', requireRole('ADMIN'), async (req, res) => {
  try {
    const max = await setMaxConcurrent(Number(req.params.id), Number(req.body.maxConcurrent));
    res.json({ maxConcurrent: max });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
