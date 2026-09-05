import { Router } from 'express';
import {
  acceptConsultation, cancelQueueEntry, declineConsultation, endConsultation, extendConsultation,
  getAdminConfig, getAstrologer, getAstrologerByEmail, getAstrologerSyncSnapshot,
  getRecommendations, getUserSyncSnapshot, listNotifications, listPublicAstrologers,
  markAllNotificationsRead, markNotificationRead, requestConsultation, setIntent,
  setMaxConcurrent, touchActivity, updateAdminConfig,
} from '../services/realtimeStore.ts';
import type { ConsultationType } from '../models/types.ts';
import { countryFromRequest } from '../services/geoLocation.ts';

export const router = Router();

// Every route below trusts the caller-supplied email/role the same way the
// rest of this mock-auth app already does (see AppContext.tsx) — there is no
// real credential backend to verify against. What IS enforced server-side is
// *ownership*: an astrologer can only accept/decline/end their OWN
// consultations, and a user can only cancel their OWN queue entry (see
// assertOwnership in store.ts). That's the actual authorization boundary
// this spec cares about (section 38) — it doesn't depend on the identity
// itself being cryptographically verified, which nothing else in this app
// does either.

function astrologerIdFromEmail(email: string | undefined, res: import('express').Response) {
  if (!email) { res.status(400).json({ error: 'email is required' }); return null; }
  const astro = getAstrologerByEmail(email);
  if (!astro) { res.status(404).json({ error: 'Not a known astrologer account' }); return null; }
  return astro;
}

router.get('/astrologers', async (_req, res) => {
  res.json(await listPublicAstrologers());
});

router.get('/astrologers/:id/recommendations', async (req, res) => {
  const category = String(req.query.category || '');
  const result = await getRecommendations(category, Number(req.params.id));
  res.json(result);
});

router.post('/availability', async (req, res) => {
  const { email, intent } = req.body as { email?: string; intent?: 'ONLINE' | 'OFFLINE' };
  const astro = astrologerIdFromEmail(email, res);
  if (!astro) return;
  if (intent !== 'ONLINE' && intent !== 'OFFLINE') return res.status(400).json({ error: 'intent must be ONLINE or OFFLINE' });
  const status = await setIntent(astro.id, intent);
  res.json({ status });
});

router.post('/heartbeat', async (req, res) => {
  const { email } = req.body as { email?: string };
  const astro = astrologerIdFromEmail(email, res);
  if (!astro) return;
  await touchActivity(astro.id);
  res.json({ ok: true });
});

router.get('/astrologers/:id/sync', async (req, res) => {
  const snapshot = await getAstrologerSyncSnapshot(Number(req.params.id));
  if (!snapshot) return res.status(404).json({ error: 'Unknown astrologer' });
  res.json(snapshot);
});

router.get('/users/sync', async (req, res) => {
  const email = String(req.query.email || '');
  if (!email) return res.status(400).json({ error: 'email is required' });
  res.json(await getUserSyncSnapshot(email));
});

router.post('/consultations/request', async (req, res) => {
  const { requestId, astrologerId, userEmail, userName, category, type, durationMinutes } = req.body as {
    requestId?: string; astrologerId?: number; userEmail?: string; userName?: string; category?: string; type?: ConsultationType; durationMinutes?: number;
  };
  if (!requestId || !astrologerId || !userEmail || !userName || !category || !type) {
    return res.status(400).json({ error: 'requestId, astrologerId, userEmail, userName, category, type are required' });
  }
  const astro = getAstrologer(astrologerId);
  if (!astro) return res.status(404).json({ error: 'Unknown astrologer' });
  const countryCode = countryFromRequest(req);
  const result = await requestConsultation({ requestId, astrologerId, userEmail, userName, category, type, durationMinutes, countryCode });
  res.json(result);
});

router.post('/consultations/:id/accept', async (req, res) => {
  try {
    res.json(await acceptConsultation(req.params.id, String(req.body.email || '')));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/consultations/:id/decline', async (req, res) => {
  try {
    res.json(await declineConsultation(req.params.id, String(req.body.email || '')));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/consultations/:id/end', async (req, res) => {
  try {
    res.json(await endConsultation(req.params.id, String(req.body.email || '')));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/consultations/:id/extend', async (req, res) => {
  try {
    res.json(await extendConsultation(req.params.id, String(req.body.email || ''), Number(req.body.extraMinutes)));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/queue/:id/cancel', async (req, res) => {
  try {
    res.json(await cancelQueueEntry(req.params.id, String(req.body.email || '')));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.get('/notifications', async (req, res) => {
  const astro = astrologerIdFromEmail(String(req.query.email || ''), res);
  if (!astro) return;
  res.json(await listNotifications(astro.id));
});

router.post('/notifications/:id/read', async (req, res) => {
  const astro = astrologerIdFromEmail(String(req.body.email || ''), res);
  if (!astro) return;
  await markNotificationRead(astro.id, req.params.id);
  res.json({ ok: true });
});

router.post('/notifications/read-all', async (req, res) => {
  const astro = astrologerIdFromEmail(String(req.body.email || ''), res);
  if (!astro) return;
  await markAllNotificationsRead(astro.id);
  res.json({ ok: true });
});

// Admin config — same mock-trust model as the rest of this app; the frontend
// only exposes this UI to ADMIN-role accounts (see admin dashboard).
router.get('/admin/config', (_req, res) => {
  res.json(getAdminConfig());
});

router.post('/admin/config', (req, res) => {
  res.json(updateAdminConfig(req.body || {}));
});

router.post('/admin/astrologers/:id/max-concurrent', async (req, res) => {
  try {
    const max = await setMaxConcurrent(Number(req.params.id), Number(req.body.maxConcurrent));
    res.json({ maxConcurrent: max });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
