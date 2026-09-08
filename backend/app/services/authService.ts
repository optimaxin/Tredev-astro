import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../core/config.ts';
import {
  createUser, findActivePasswordResetToken, findActiveRefreshToken, findUserByEmail, findUserByFirebaseUid, findUserById,
  insertPasswordResetToken, insertRefreshToken, linkFirebaseUid, markPasswordResetTokenUsed,
  markPhoneVerified, revokeAllRefreshTokensForUser, revokeRefreshToken, setVerifiedPhone, updatePasswordHash,
} from '../repositories/userRepository.ts';
import { toPublicUser, type PublicUser, type Role } from '../models/user.ts';
import { getFirebaseAuth } from '../core/firebaseAdmin.ts';

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

async function issueTokenPair(userId: string, role: Role): Promise<TokenPair> {
  const accessToken = jwt.sign({ sub: userId, role }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl as jwt.SignOptions['expiresIn'] });
  const refreshRaw = randomBytes(40).toString('hex');
  const expiresAt = Date.now() + config.jwt.refreshTtlDays * 86_400_000;
  await insertRefreshToken({ userId, tokenHash: hashToken(refreshRaw), expiresAt });
  return { accessToken, refreshToken: refreshRaw };
}

export async function register(params: {
  name: string; email: string; password: string; phoneNumber?: string; role?: Role;
  birthDate?: string; birthTime?: string; birthPlace?: string;
  birthLatitude?: number; birthLongitude?: number; birthTimezoneOffsetMinutes?: number;
}): Promise<{ user: PublicUser } & TokenPair> {
  if (await findUserByEmail(params.email)) throw new AuthError('An account with this email already exists', 409);
  const passwordHash = bcrypt.hashSync(params.password, BCRYPT_ROUNDS);
  const row = await createUser({
    name: params.name, email: params.email, passwordHash, role: params.role, phoneNumber: params.phoneNumber,
    birthDate: params.birthDate, birthTime: params.birthTime, birthPlace: params.birthPlace,
    birthLatitude: params.birthLatitude, birthLongitude: params.birthLongitude, birthTimezoneOffsetMinutes: params.birthTimezoneOffsetMinutes,
  });
  const tokens = await issueTokenPair(row.id, row.role);
  // Phone number is stored but not verified here — that only happens if/when
  // this account signs in via Firebase Phone Auth (see loginWithFirebase),
  // which replaced the old custom OTP-over-SMS verification step.
  return { user: toPublicUser(row), ...tokens };
}

export async function login(email: string, password: string): Promise<{ user: PublicUser } & TokenPair> {
  const row = await findUserByEmail(email);
  // Same generic error whether the email is unknown or the password is wrong —
  // never reveal which one it was (avoids account enumeration).
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AuthError('Invalid email or password', 401);
  }
  if (row.status === 'SUSPENDED') throw new AuthError('This account has been suspended', 403);
  const tokens = await issueTokenPair(row.id, row.role);
  return { user: toPublicUser(row), ...tokens };
}

export async function refresh(refreshTokenRaw: string): Promise<TokenPair> {
  const record = await findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (!record) throw new AuthError('Invalid or expired refresh token', 401);
  const user = await findUserById(record.user_id);
  if (!user || user.status === 'SUSPENDED') throw new AuthError('Account unavailable', 403);
  // Rotate: the old refresh token is single-use, so a stolen-and-replayed
  // token gets invalidated the moment the legitimate client uses it again.
  await revokeRefreshToken(record.id);
  return await issueTokenPair(user.id, user.role);
}

export async function logout(refreshTokenRaw: string) {
  const record = await findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (record) await revokeRefreshToken(record.id);
}

export function verifyAccessToken(token: string): { sub: string; role: Role } {
  return jwt.verify(token, config.jwt.accessSecret) as { sub: string; role: Role };
}

export async function getPublicUser(userId: string): Promise<PublicUser | undefined> {
  const row = await findUserById(userId);
  return row ? toPublicUser(row) : undefined;
}

// Returns the raw reset token only in non-production so the flow is testable
// end-to-end without an email provider wired up yet. A real deployment must
// plug EMAIL_PROVIDER_KEYS in and send this token by email instead of
// returning it — never expose it over the API in production.
export async function requestPasswordReset(email: string): Promise<{ devResetToken?: string }> {
  const row = await findUserByEmail(email);
  if (!row) return {}; // don't reveal whether the email exists
  const raw = randomBytes(32).toString('hex');
  await insertPasswordResetToken({ userId: row.id, tokenHash: hashToken(raw), expiresAt: Date.now() + 30 * 60_000 });
  return config.nodeEnv === 'production' ? {} : { devResetToken: raw };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const record = await findActivePasswordResetToken(hashToken(rawToken));
  if (!record) throw new AuthError('Invalid or expired reset token', 400);
  await markPasswordResetTokenUsed(record.id);
  await updatePasswordHash(record.user_id, bcrypt.hashSync(newPassword, BCRYPT_ROUNDS));
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

  if (!row) {
    isNewUser = true;
    // This account only ever signs in via Firebase — the password hash is
    // unusable filler, same reasoning as every NOT NULL column that doesn't
    // apply to a given signup path elsewhere in this file.
    const passwordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), BCRYPT_ROUNDS);
    row = await createUser({
      name: name || (email ? email.split('@')[0] : phoneNumber!),
      email: email || `${uid}@firebase.local`,
      passwordHash,
      phoneNumber,
      firebaseUid: uid,
    });
    if (phoneNumber) await markPhoneVerified(row.id);
  } else if (!row.firebase_uid) {
    await linkFirebaseUid(row.id, uid);
  }

  if (row.status === 'SUSPENDED') throw new AuthError('This account has been suspended', 403);
  const tokens = await issueTokenPair(row.id, row.role);
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
