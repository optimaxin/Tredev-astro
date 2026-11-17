import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  acceptConsultation, cancelQueueEntry, declineConsultation, endConsultation, extendConsultation,
  getAdminConfig, getAstrologer, getAstrologerByEmail, getAstrologerSyncSnapshot,
  getRecommendations, getUserSyncSnapshot, listNotifications, listPublicAstrologers,
  markAllNotificationsRead, markNotificationRead, requestConsultation, setIntent,
  setMaxConcurrent, touchActivity, updateAdminConfig,
} from '../services/realtimeStore.ts';
import type { ConsultationType } from '../models/types.ts';
import { countryFromRequest } from '../services/geoLocation.ts';
import { listActiveBanners } from '../repositories/bannerRepository.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';

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

// Everything below needs a logged-in user.
router.use(['/availability', '/heartbeat', '/astrologers/:id/sync', '/users', '/consultations', '/queue', '/notifications', '/admin'], requireAuth);

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
});

router.post('/consultations/request', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
  const { requestId, astrologerId, userName, category, type, durationMinutes } = parsed.data;
  const userEmail = req.user!.email;
  const astro = getAstrologer(astrologerId);
  if (!astro) return res.status(404).json({ error: 'Unknown astrologer' });
  const countryCode = countryFromRequest(req);
  const result = await requestConsultation({ requestId, astrologerId, userEmail, userName, category, type, durationMinutes, countryCode });
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

router.post('/consultations/:id/extend', async (req, res) => {
  try {
    res.json(await extendConsultation(req.params.id, req.user!.email, Number(req.body.extraMinutes)));
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
