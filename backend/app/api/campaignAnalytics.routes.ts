import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit.ts';
import { logCampaignEvent, summarizeCampaignEvents, summarizeCampaignEventsByUser, resetCampaignEvents } from '../repositories/campaignEventRepository.ts';
import { config } from '../core/config.ts';

export const campaignAnalyticsRouter = Router();

// Called from the campaign site on effectively every click — generous but
// still bounded, mainly to blunt abuse (someone scripting thousands of fake
// events) rather than to throttle real traffic.
const trackLimiter = rateLimit({ windowMs: 60_000, max: 120 });

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
    });
    res.status(204).end();
  } catch (err) {
    console.error('Failed to log campaign event:', err);
    res.status(500).json({ error: 'Could not log event' });
  }
});

// A single shared password (config.campaignAnalyticsPassword), not full
// user/JWT auth — see that config field's own comment for why. Accepted as
// either a query param (simplest for the dashboard page's own fetch calls)
// or a header, whichever the caller finds easier. Also checked (via the
// request body) on /reset, since that one's a real mutation.
function hasValidPassword(req: import('express').Request): boolean {
  const fromQuery = typeof req.query.password === 'string' ? req.query.password : '';
  const fromBody = typeof req.body?.password === 'string' ? req.body.password : '';
  const provided = fromQuery || fromBody || req.get('x-analytics-password') || '';
  return provided.length > 0 && provided === config.campaignAnalyticsPassword;
}

campaignAnalyticsRouter.get('/summary', async (req, res) => {
  if (!hasValidPassword(req)) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  const [events, byUser] = await Promise.all([summarizeCampaignEvents(), summarizeCampaignEventsByUser()]);
  res.json({ events, byUser });
});

// Wipes every recorded event — the dashboard gates this behind its own "are
// you sure" confirm() before ever calling it, but the real guard is the
// password check here (same as /summary), since this is a real, irreversible
// mutation reachable by anyone who can reach the API.
campaignAnalyticsRouter.post('/reset', async (req, res) => {
  if (!hasValidPassword(req)) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  try {
    await resetCampaignEvents();
    res.status(204).end();
  } catch (err) {
    console.error('Failed to reset campaign events:', err);
    res.status(500).json({ error: 'Could not reset data' });
  }
});
