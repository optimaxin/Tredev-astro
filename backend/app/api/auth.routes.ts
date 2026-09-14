import { Router } from 'express';
import { z } from 'zod';
import { AuthError, getPublicUser, linkFirebasePhone, login, loginWithFirebase, logout, refresh, register, requestPasswordReset, resetPassword } from '../services/authService.ts';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { updateBirthDetails } from '../repositories/userRepository.ts';
import { MAINSTREAM_EMAIL_DOMAINS } from '../core/mainstreamEmailDomains.ts';

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

// Signup is restricted to mainstream email providers — blocks throwaway/
// temp-mail addresses (a common fake-account vector) without maintaining an
// ever-growing disposable-domain blocklist. Deliberately NOT applied to
// login/forgot-password: an already-registered account must keep working
// regardless of its email's domain.
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().refine(
    email => MAINSTREAM_EMAIL_DOMAINS.has(email.split('@')[1] ?? ''),
    { message: 'Please sign up with a Gmail, Outlook, Yahoo, iCloud, or other major email provider — temporary/disposable email addresses are not allowed.' },
  ),
  password: z.string().min(8).max(200),
  phoneNumber: z.string().trim().min(8).max(20),
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

const birthDetailsSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, 'birthTime must be HH:MM'),
  birthPlace: z.string().trim().min(1).max(200),
  birthLatitude: z.number().min(-90).max(90),
  birthLongitude: z.number().min(-180).max(180),
  birthTimezoneOffsetMinutes: z.number().min(-720).max(840),
});

authRouter.patch('/me/birth-details', requireAuth, async (req, res) => {
  const parsed = birthDetailsSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  await updateBirthDetails(req.user!.id, parsed.data);
  const user = await getPublicUser(req.user!.id);
  res.json({ success: true, data: user });
});

// ── Firebase sign-in (Google, Phone Auth) ────────────────────────────────
// The frontend runs the actual Google popup / phone-OTP flow with the
// Firebase client SDK and sends us just the resulting ID token — see
// authService.ts's loginWithFirebase for verification + account mapping.
const firebaseLoginSchema = z.object({ idToken: z.string().min(1) });

authRouter.post('/firebase', authLimiter, async (req, res) => {
  try {
    const { idToken } = firebaseLoginSchema.parse(req.body);
    const result = await loginWithFirebase(idToken);
    res.json({ success: true, data: result });
  } catch (e) {
    handleAuthError(e, res);
  }
});

// Post-registration "verify your phone" step — the logged-in user already
// has an account (from /register); this attaches + verifies a phone number
// on THAT account via Firebase Phone Auth, rather than logging in/creating
// a separate one (see authService.ts's linkFirebasePhone).
authRouter.post('/me/link-firebase-phone', requireAuth, async (req, res) => {
  try {
    const { idToken } = firebaseLoginSchema.parse(req.body);
    const user = await linkFirebasePhone(req.user!.id, idToken);
    res.json({ success: true, data: user });
  } catch (e) {
    handleAuthError(e, res);
  }
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
