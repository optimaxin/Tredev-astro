import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { getPublicUser } from '../services/authService.ts';
import { ChatError, listMessages, sendMessage } from '../services/chatService.ts';
import { findAllForAstrologer, findAllForUser } from '../repositories/consultationRepository.ts';
import { findAstrologerByIdRaw, findAstrologerByUserId } from '../repositories/astrologerRepository.ts';
import { findReviewByConsultation } from '../repositories/reviewRepository.ts';

export const chatRouter = Router();

const messageLimiter = rateLimit({ windowMs: 60_000, max: 60 });

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// Chat is only reachable by real, authenticated users now (unlike the older
// realtime routes below it, which still trust a client-supplied email — see
// their own comments). This is a new, more sensitive surface, so it's built
// on the real auth system from the start rather than the legacy trust model.
async function requesterEmail(req: import('express').Request, res: import('express').Response): Promise<string | null> {
  const user = await getPublicUser(req.user!.id);
  if (!user) {
    fail(res, 401, 'UNAUTHORIZED', 'User account not found');
    return null;
  }
  return user.email;
}

// A user's own consultation history, with the astrologer's name resolved and
// whether each completed one has already been reviewed — the client needs
// both to render a "My Consultations" list with a "Leave a Review" action.
chatRouter.get('/mine', requireAuth, async (req, res) => {
  const email = await requesterEmail(req, res);
  if (!email) return;
  const rows = await findAllForUser(email);
  const data = await Promise.all(rows.map(async c => {
    const astro = await findAstrologerByIdRaw(c.astrologerId);
    const reviewed = c.status === 'COMPLETED' ? !!(await findReviewByConsultation(c.id)) : false;
    return { ...c, astrologerName: astro?.name || `Astrologer #${c.astrologerId}`, reviewed };
  }));
  res.json({ success: true, data });
});

// An astrologer's own consultation history — same shape as user's `/mine`
// but from the other side. `amount` is an estimate (current catalog price
// for that consultation's type) rather than a historically-locked price,
// since no price is captured at booking time and there is no real
// payment/payout system in this app yet.
// ponytail: current-price estimate, not a ledger — swap for a captured
// price-at-booking-time column if real payouts are ever built.
chatRouter.get('/mine-as-astrologer', requireAuth, async (req, res) => {
  const astro = await findAstrologerByUserId(req.user!.id);
  if (!astro) return fail(res, 404, 'NOT_FOUND', 'No astrologer catalog entry for this account');
  const rows = await findAllForAstrologer(astro.id);
  // Each consultation already carries its own locked-at-creation price
  // (offer/loyalty/Boost-adjusted) — use that instead of the astrologer's
  // current catalog price, so a past session's estimate doesn't drift when
  // pricing changes later.
  const data = rows.map(c => ({ ...c, estimatedAmount: c.pricePerMin || 0 }));
  res.json({ success: true, data });
});

chatRouter.get('/:id/messages', requireAuth, async (req, res) => {
  const email = await requesterEmail(req, res);
  if (!email) return;
  try {
    res.json({ success: true, data: await listMessages(String(req.params.id), email) });
  } catch (e) {
    if (e instanceof ChatError) return fail(res, e.status, 'CHAT_ERROR', e.message);
    throw e;
  }
});

// TEXT stays capped at 4000 chars; IMAGE/AUDIO/FILE content is a base64
// data URL (no upload/object-storage service exists in this app, and this
// is the least new infrastructure that gets the feature working) so it
// needs a much larger ceiling — ~7M chars covers a ~5MB raw file.
const sendMessageSchema = z.object({
  content: z.string().trim().min(1),
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'AUDIO']).default('TEXT'),
}).refine(
  b => b.content.length <= (b.messageType === 'TEXT' ? 4000 : 7_000_000),
  { message: 'Message content is too large' }
);

chatRouter.post('/:id/messages', requireAuth, messageLimiter, async (req, res) => {
  const email = await requesterEmail(req, res);
  if (!email) return;
  try {
    const body = sendMessageSchema.parse(req.body);
    const message = await sendMessage(String(req.params.id), email, body.content, body.messageType);
    res.status(201).json({ success: true, data: message });
  } catch (e) {
    if (e instanceof ChatError) return fail(res, e.status, 'CHAT_ERROR', e.message);
    if (e instanceof z.ZodError) return fail(res, 422, 'VALIDATION_ERROR', e.issues.map(i => i.message).join('; '));
    throw e;
  }
});
