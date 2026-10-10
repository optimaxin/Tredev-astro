import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit.ts';
import { logCampaignEvent, summarizeCampaignEvents, summarizeCampaignEventsByUser, listRegisteredUsers, listCampaigns, resetCampaignEvents } from '../repositories/campaignEventRepository.ts';

const GANESH_CAMPAIGN = 'ganesh-chaturthi';
import { config } from '../core/config.ts';

export const campaignAnalyticsRouter = Router();

// Called from the campaign site on effectively every click — generous but
// still bounded, mainly to blunt abuse (someone scripting thousands of fake
// events) rather than to throttle real traffic.
const trackLimiter = rateLimit({ windowMs: 60_000, max: 120 });
// Blunts password brute-forcing against the shared dashboard login.
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20 });

const trackSchema = z.object({
  eventType: z.string().min(1).max(60),
  eventLabel: z.string().min(1).max(120),
  meta: z.record(z.unknown()).optional(),
  // Attached client-side once the visitor has registered (see
  // ganesh-chaturthi/src/analytics.ts) — absent for the rare event fired
  // before that (or an older client build), never required.
  userName: z.string().max(200).optional(),
  userEmail: z.string().max(200).optional(),
  userPhone: z.string().max(50).optional(),
  // Which campaign microsite this came from (e.g. 'ganesh-chaturthi',
  // 'navratri-2026') — absent for the Ganesh client, which predates this
  // field and is backfilled server-side (see logCampaignEvent's default).
  campaign: z.string().min(1).max(60).optional(),
});

// Public, unauthenticated — the campaign site's visitors identify
// themselves only via the optional userName/Email/Phone fields above (sent
// once they've registered), not a server-side session. `meta` is
// caller-supplied and stored as-is (jsonb); it's never interpolated into
// SQL or rendered as HTML, only ever JSON.stringify'd back out, so it's not
// an injection vector.
campaignAnalyticsRouter.post('/track', trackLimiter, async (req, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid event payload' });
    return;
  }
  try {
    await logCampaignEvent(parsed.data.eventType, parsed.data.eventLabel, parsed.data.meta, {
      name: parsed.data.userName, email: parsed.data.userEmail, phone: parsed.data.userPhone,
    }, parsed.data.campaign);
    res.status(204).end();
  } catch (err) {
    console.error('Failed to log campaign event:', err);
    res.status(500).json({ error: 'Could not log event' });
  }
});

// A single shared username+password (config.campaignAnalyticsUsername/
// Password), not full user/JWT auth — see that config field's own comment
// for why. Sent as headers (or in the body on /reset) — never the query
// string, which ends up in access logs. Both must match, and an unset
// config value never matches anything.
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a), bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function hasValidCredentials(req: import('express').Request): boolean {
  const username = (typeof req.body?.username === 'string' && req.body.username) || req.get('x-analytics-username') || '';
  const password = (typeof req.body?.password === 'string' && req.body.password) || req.get('x-analytics-password') || '';
  return config.campaignAnalyticsUsername.length > 0 && config.campaignAnalyticsPassword.length > 0
    && safeEqual(username, config.campaignAnalyticsUsername)
    && safeEqual(password, config.campaignAnalyticsPassword);
}

// Lets the dashboard show a campaign picker before loading any data, instead
// of merging every campaign sharing this table into one meaningless total.
campaignAnalyticsRouter.get('/campaigns', loginLimiter, async (req, res) => {
  if (!hasValidCredentials(req)) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }
  res.json({ campaigns: await listCampaigns() });
});

campaignAnalyticsRouter.get('/summary', loginLimiter, async (req, res) => {
  if (!hasValidCredentials(req)) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }
  const campaign = typeof req.query.campaign === 'string' && req.query.campaign ? req.query.campaign : GANESH_CAMPAIGN;
  const [events, byUser, users] = await Promise.all([
    summarizeCampaignEvents(campaign),
    summarizeCampaignEventsByUser(campaign),
    // Registered-account listing only applies to Ganesh (see listRegisteredUsers' own comment) — an empty list for any other campaign.
    campaign === GANESH_CAMPAIGN ? listRegisteredUsers() : Promise.resolve([]),
  ]);
  res.json({ events, byUser, users });
});

// Wipes every recorded event for ONE campaign — the dashboard gates this
// behind its own "are you sure" confirm() before ever calling it, but the
// real guard is the credentials check here (same as /summary), since this
// is a real, irreversible mutation reachable by anyone who can reach the
// API. Scoped by campaign so resetting Navratri's data can't also wipe
// Ganesh's (or vice versa).
campaignAnalyticsRouter.post('/reset', loginLimiter, async (req, res) => {
  if (!hasValidCredentials(req)) {
    res.status(401).json({ error: 'Incorrect username or password' });
    return;
  }
  const campaign = typeof req.body?.campaign === 'string' && req.body.campaign ? req.body.campaign : GANESH_CAMPAIGN;
  try {
    await resetCampaignEvents(campaign);
    res.status(204).end();
  } catch (err) {
    console.error('Failed to reset campaign events:', err);
    res.status(500).json({ error: 'Could not reset data' });
  }
});
