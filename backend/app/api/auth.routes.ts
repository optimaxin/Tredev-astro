import { Router } from 'express';
import { z } from 'zod';
import { AuthError, getPublicUser, login, logout, refresh, register, requestPasswordReset, resetPassword } from '../services/authService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';

export const authRouter = Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 10 });

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

function handleAuthError(e: unknown, res: import('express').Response) {
  if (e instanceof AuthError) return fail(res, e.status, 'AUTH_ERROR', e.message);
  if (e instanceof z.ZodError) return fail(res, 422, 'VALIDATION_ERROR', e.issues.map(i => i.message).join('; '));
  console.error(e);
  fail(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  birthPlace: z.string().optional(),
  birthLatitude: z.number().optional(),
  birthLongitude: z.number().optional(),
  birthTimezoneOffsetMinutes: z.number().optional(),
});

authRouter.post('/register', authLimiter, async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await register(body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    handleAuthError(e, res);
  }
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post('/login', authLimiter, async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email, body.password);
    res.json({ success: true, data: result });
  } catch (e) {
    handleAuthError(e, res);
  }
});

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

authRouter.post('/refresh', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);
    res.json({ success: true, data: await refresh(body.refreshToken) });
  } catch (e) {
    handleAuthError(e, res);
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const body = refreshSchema.parse(req.body);
    await logout(body.refreshToken);
    res.json({ success: true, data: { ok: true } });
  } catch (e) {
    handleAuthError(e, res);
  }
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await getPublicUser(req.user!.id);
  if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found');
  res.json({ success: true, data: user });
});

const forgotSchema = z.object({ email: z.string().trim().email() });

authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const body = forgotSchema.parse(req.body);
    const result = await requestPasswordReset(body.email);
    // Always the same response shape whether or not the email exists.
    res.json({ success: true, data: { message: 'If that email exists, a reset link has been sent.', ...result } });
  } catch (e) {
    handleAuthError(e, res);
  }
});

const resetSchema = z.object({ token: z.string().min(1), newPassword: z.string().min(8).max(200) });

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const body = resetSchema.parse(req.body);
    await resetPassword(body.token, body.newPassword);
    res.json({ success: true, data: { ok: true } });
  } catch (e) {
    handleAuthError(e, res);
  }
});
