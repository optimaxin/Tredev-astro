import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../core/config.ts';
import {
  createUser, findActivePasswordResetToken, findActiveRefreshToken, findUserByEmail, findUserByFirebaseUid, findUserById, findUserByPhone,
  insertPasswordResetToken, insertRefreshToken, isSessionActive, linkFirebaseUid, markPasswordResetTokenUsed,
  markPhoneVerified, revokeAllRefreshTokensForUser, revokeRefreshToken, setVerifiedPhone, updatePasswordHash,
} from '../repositories/userRepository.ts';
import { toPublicUser, type PublicUser, type Role } from '../models/user.ts';
import { getFirebaseAuth } from '../core/firebaseAdmin.ts';
import { sendEmail } from './emailService.ts';
import { notifyEventByTemplateId } from './notificationService.ts';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const BCRYPT_ROUNDS = 12;
const hashToken = (raw: string) => createHash('sha256').update(raw).digest('hex');

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// `familyId` identifies the login session across refresh rotations — it is
// embedded in the access token as `sid` so requireAuth can kill that access
// token as soon as the session is logged out/revoked (see authenticate).
async function issueTokenPair(userId: string, role: Role, familyId: string = randomUUID()): Promise<TokenPair> {
  const accessToken = jwt.sign({ sub: userId, role, sid: familyId }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl as jwt.SignOptions['expiresIn'] });
  const refreshRaw = randomBytes(40).toString('hex');
  const expiresAt = Date.now() + config.jwt.refreshTtlDays * 86_400_000;
  await insertRefreshToken({ userId, tokenHash: hashToken(refreshRaw), expiresAt, familyId });
  return { accessToken, refreshToken: refreshRaw };
}

export async function register(params: {
  name: string; email: string; password: string; phoneNumber?: string; role?: Role;
  birthDate?: string; birthTime?: string; birthPlace?: string;
  birthLatitude?: number; birthLongitude?: number; birthTimezoneOffsetMinutes?: number;
}): Promise<{ user: PublicUser } & TokenPair> {
  if (await findUserByEmail(params.email)) throw new AuthError('An account with this email already exists', 409);
  // Phone number is a second unique key — one account per number, so the
  // same visitor can't end up with several accounts by registering again
  // with a different email. Points them at logging in instead.
  if (params.phoneNumber && await findUserByPhone(params.phoneNumber)) {
    throw new AuthError('An account with this phone number already exists — please log in instead', 409);
  }
  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
  const row = await createUser({
    name: params.name, email: params.email, passwordHash, role: params.role, phoneNumber: params.phoneNumber,
    birthDate: params.birthDate, birthTime: params.birthTime, birthPlace: params.birthPlace,
    birthLatitude: params.birthLatitude, birthLongitude: params.birthLongitude, birthTimezoneOffsetMinutes: params.birthTimezoneOffsetMinutes,
  });
  const tokens = await issueTokenPair(row.id, row.role);
  // Phone number is stored but not verified here — that only happens if/when
  // this account signs in via Firebase Phone Auth (see loginWithFirebase),
  // which replaced the old custom OTP-over-SMS verification step.
  // Best-effort, never blocks registration itself (see notifyEventByTemplateId).
  void notifyEventByTemplateId({
    templateId: 'tpl-welcome', eventKey: 'user.welcome',
    vars: {}, user: { email: row.email, name: row.name },
  });
  return { user: toPublicUser(row), ...tokens };
}

export async function login(email: string, password: string): Promise<{ user: PublicUser } & TokenPair> {
  const row = await findUserByEmail(email);
  // Same generic error whether the email is unknown or the password is wrong —
  // never reveal which one it was (avoids account enumeration).
  if (!row || !await bcrypt.compare(password, row.password_hash)) {
    throw new AuthError('Invalid email or password', 401);
  }
  if (row.status === 'SUSPENDED') throw new AuthError('This account has been suspended', 403);
  const tokens = await issueTokenPair(row.id, row.role);
  void notifyEventByTemplateId({
    templateId: 'tpl-welcome-back', eventKey: 'user.login',
    vars: {}, user: { email: row.email, name: row.name },
  });
  return { user: toPublicUser(row), ...tokens };
}

export async function refresh(refreshTokenRaw: string): Promise<TokenPair> {
  const record = await findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (!record) throw new AuthError('Invalid or expired refresh token', 401);
  const user = await findUserById(record.user_id);
  if (!user || user.status === 'SUSPENDED') throw new AuthError('Account unavailable', 403);
  // Rotate: the old refresh token is single-use, so a stolen-and-replayed
  // token gets invalidated the moment the legitimate client uses it again.
  // New token first, then revoke — the session (family) must never have a
  // moment with zero live tokens, or in-flight access tokens would 401.
  const pair = await issueTokenPair(user.id, user.role, record.family_id ?? record.id);
  await revokeRefreshToken(record.id);
  return pair;
}

export async function logout(refreshTokenRaw: string) {
  const record = await findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (record) await revokeRefreshToken(record.id);
}

export function verifyAccessToken(token: string): { sub: string; role: Role; sid?: string } {
  return jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] }) as { sub: string; role: Role; sid?: string };
}

export interface AuthenticatedUser { id: string; role: Role; email: string }

// Signature + expiry check, then the database has the final word: the user
// must still exist and not be suspended, the role comes from the users row
// (never the JWT payload alone — a revoked role takes effect immediately),
// and the token's session must not have been logged out. Returns null for
// any rejection; callers turn that into a 401.
export async function authenticate(token: string): Promise<AuthenticatedUser | null> {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }
  const row = await findUserById(payload.sub);
  if (!row || row.status === 'SUSPENDED') return null;
  // ponytail: tokens minted before migration 048 have no sid — accepted
  // until they expire (≤ JWT_EXPIRATION); every new token carries one.
  if (payload.sid && !await isSessionActive(row.id, payload.sid)) return null;
  return { id: row.id, role: row.role, email: row.email.toLowerCase() };
}

export async function getPublicUser(userId: string): Promise<PublicUser | undefined> {
  const row = await findUserById(userId);
  return row ? toPublicUser(row) : undefined;
}

// Returns the raw reset token only in non-production (devShortcuts) so the
// flow is testable without a real inbox. In every environment it's also
// emailed via ZeptoMail (see emailService.ts) — never expose it over the API
// in production.
export async function requestPasswordReset(email: string): Promise<{ devResetToken?: string }> {
  const row = await findUserByEmail(email);
  if (!row) return {}; // don't reveal whether the email exists
  const raw = randomBytes(32).toString('hex');
  await insertPasswordResetToken({ userId: row.id, tokenHash: hashToken(raw), expiresAt: Date.now() + 30 * 60_000 });
  const resetLink = `${config.clientOrigins[0]}/reset-password?token=${raw}`;
  await sendEmail(row.email, 'Reset your TredevaAstro password', `
    <p>We received a request to reset your password.</p>
    <p><a href="${resetLink}">Click here to reset your password</a> (expires in 30 minutes).</p>
    <p>If you didn't request this, you can ignore this email.</p>
  `);
  return config.devShortcuts ? { devResetToken: raw } : {};
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const record = await findActivePasswordResetToken(hashToken(rawToken));
  if (!record) throw new AuthError('Invalid or expired reset token', 400);
  await markPasswordResetTokenUsed(record.id);
  await updatePasswordHash(record.user_id, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  await revokeAllRefreshTokensForUser(record.user_id); // force re-login everywhere after a password reset
}

// ── Firebase sign-in (Google, Phone Auth) ───────────────────────────────
// The frontend does the actual Google popup / phone-OTP flow with the
// Firebase client SDK and hands us the resulting ID token — Firebase itself
// already verified the phone number (sent + checked the OTP) or the Google
// account before minting that token, so this function only ever needs to
// verify the token's signature and map it to a local account. Replaces the
// old custom OTP-over-SMS verification (sendPhoneOtp/verifyPhoneOtp, AWS SNS).
export async function loginWithFirebase(idToken: string): Promise<{ user: PublicUser; isNewUser: boolean } & TokenPair> {
  const auth = await getFirebaseAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    throw new AuthError('Invalid or expired sign-in token', 401);
  }
  const uid = decoded.uid;
  const email = decoded.email as string | undefined;
  const phoneNumber = decoded.phone_number as string | undefined;
  const name = decoded.name as string | undefined;
  if (!email && !phoneNumber) throw new AuthError('This sign-in method did not provide an email or phone number', 400);

  let row = await findUserByFirebaseUid(uid);
  let isNewUser = false;
  if (!row && email) row = await findUserByEmail(email);
  // Without this, a phone number that already belongs to an account (e.g.
  // one created some other way, or a retried sign-in that got this far
  // before) falls through to the createUser() call below and hits the
  // phone_number UNIQUE constraint (see migration 042) as an unhandled DB
  // error — a 500, not the "already exists" case this should actually be.
  if (!row && phoneNumber) row = await findUserByPhone(phoneNumber);

  if (!row) {
    isNewUser = true;
    // This account only ever signs in via Firebase — the password hash is
    // unusable filler, same reasoning as every NOT NULL column that doesn't
    // apply to a given signup path elsewhere in this file.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
    row = await createUser({
      name: name || (email ? email.split('@')[0] : phoneNumber!),
      email: email || `${uid}@firebase.local`,
      passwordHash,
      phoneNumber,
      firebaseUid: uid,
    });
    if (phoneNumber) await markPhoneVerified(row.id);
    // Phone-only signups get a synthetic @firebase.local placeholder (see
    // above) — nothing to send there, so only email real addresses.
    if (email) {
      void notifyEventByTemplateId({
        templateId: 'tpl-welcome', eventKey: 'user.welcome',
        vars: {}, user: { email: row.email, name: row.name },
      });
    }
  } else if (!row.firebase_uid) {
    await linkFirebaseUid(row.id, uid);
  }

  if (row.status === 'SUSPENDED') throw new AuthError('This account has been suspended', 403);
  const tokens = await issueTokenPair(row.id, row.role);
  // Phone-only accounts still carry the synthetic @firebase.local
  // placeholder (see above) if they've never since added a real email —
  // nothing deliverable to send there.
  if (!isNewUser && !row.email.endsWith('@firebase.local')) {
    void notifyEventByTemplateId({
      templateId: 'tpl-welcome-back', eventKey: 'user.login',
      vars: {}, user: { email: row.email, name: row.name },
    });
  }
  return { user: toPublicUser(row), isNewUser, ...tokens };
}

// Post-registration phone verification (the "OTP" step) — the currently
// logged-in user already has an account; this just attaches + verifies a
// phone number to it via Firebase Phone Auth, rather than logging in as (or
// creating) a different account the way loginWithFirebase does. Kept
// separate from loginWithFirebase specifically so verifying your phone here
// can never fork off a second account for the same person.
export async function linkFirebasePhone(userId: string, idToken: string): Promise<PublicUser> {
  const auth = await getFirebaseAuth();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken);
  } catch {
    throw new AuthError('Invalid or expired verification code', 401);
  }
  const phoneNumber = decoded.phone_number as string | undefined;
  if (!phoneNumber) throw new AuthError('This did not verify a phone number', 400);

  const existing = await findUserByFirebaseUid(decoded.uid);
  if (existing && existing.id !== userId) throw new AuthError('This phone number is already linked to another account', 409);

  await setVerifiedPhone(userId, phoneNumber, decoded.uid);
  const row = await findUserById(userId);
  return toPublicUser(row!);
}
