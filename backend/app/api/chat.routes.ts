import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { getPublicUser } from '../services/authService.ts';
import { ChatError, listMessages, sendMessage } from '../services/chatService.ts';
import { findAllForUser } from '../repositories/consultationRepository.ts';
import { findAstrologerByIdRaw } from '../repositories/astrologerRepository.ts';
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

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

chatRouter.post('/:id/messages', requireAuth, messageLimiter, async (req, res) => {
  const email = await requesterEmail(req, res);
  if (!email) return;
  try {
    const body = sendMessageSchema.parse(req.body);
    const message = await sendMessage(String(req.params.id), email, body.content);
    res.status(201).json({ success: true, data: message });
  } catch (e) {
    if (e instanceof ChatError) return fail(res, e.status, 'CHAT_ERROR', e.message);
    if (e instanceof z.ZodError) return fail(res, 422, 'VALIDATION_ERROR', e.issues.map(i => i.message).join('; '));
    throw e;
  }
});
