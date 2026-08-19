import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../core/config.ts';
import {
  createUser, findActivePasswordResetToken, findActiveRefreshToken, findUserByEmail, findUserById,
  insertPasswordResetToken, insertRefreshToken, markPasswordResetTokenUsed, revokeAllRefreshTokensForUser,
  revokeRefreshToken, updatePasswordHash,
} from '../repositories/userRepository.ts';
import { toPublicUser, type PublicUser, type Role } from '../models/user.ts';

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

function issueTokenPair(userId: string, role: Role): TokenPair {
  const accessToken = jwt.sign({ sub: userId, role }, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl as jwt.SignOptions['expiresIn'] });
  const refreshRaw = randomBytes(40).toString('hex');
  const expiresAt = Date.now() + config.jwt.refreshTtlDays * 86_400_000;
  insertRefreshToken({ userId, tokenHash: hashToken(refreshRaw), expiresAt });
  return { accessToken, refreshToken: refreshRaw };
}

export function register(params: { name: string; email: string; password: string; role?: Role }): { user: PublicUser } & TokenPair {
  if (findUserByEmail(params.email)) throw new AuthError('An account with this email already exists', 409);
  const passwordHash = bcrypt.hashSync(params.password, BCRYPT_ROUNDS);
  const row = createUser({ name: params.name, email: params.email, passwordHash, role: params.role });
  const tokens = issueTokenPair(row.id, row.role);
  return { user: toPublicUser(row), ...tokens };
}

export function login(email: string, password: string): { user: PublicUser } & TokenPair {
  const row = findUserByEmail(email);
  // Same generic error whether the email is unknown or the password is wrong —
  // never reveal which one it was (avoids account enumeration).
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    throw new AuthError('Invalid email or password', 401);
  }
  if (row.status === 'SUSPENDED') throw new AuthError('This account has been suspended', 403);
  const tokens = issueTokenPair(row.id, row.role);
  return { user: toPublicUser(row), ...tokens };
}

export function refresh(refreshTokenRaw: string): TokenPair {
  const record = findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (!record) throw new AuthError('Invalid or expired refresh token', 401);
  const user = findUserById(record.user_id);
  if (!user || user.status === 'SUSPENDED') throw new AuthError('Account unavailable', 403);
  // Rotate: the old refresh token is single-use, so a stolen-and-replayed
  // token gets invalidated the moment the legitimate client uses it again.
  revokeRefreshToken(record.id);
  return issueTokenPair(user.id, user.role);
}

export function logout(refreshTokenRaw: string) {
  const record = findActiveRefreshToken(hashToken(refreshTokenRaw));
  if (record) revokeRefreshToken(record.id);
}

export function verifyAccessToken(token: string): { sub: string; role: Role } {
  return jwt.verify(token, config.jwt.accessSecret) as { sub: string; role: Role };
}

export function getPublicUser(userId: string): PublicUser | undefined {
  const row = findUserById(userId);
  return row ? toPublicUser(row) : undefined;
}

// Returns the raw reset token only in non-production so the flow is testable
// end-to-end without an email provider wired up yet. A real deployment must
// plug EMAIL_PROVIDER_KEYS in and send this token by email instead of
// returning it — never expose it over the API in production.
export function requestPasswordReset(email: string): { devResetToken?: string } {
  const row = findUserByEmail(email);
  if (!row) return {}; // don't reveal whether the email exists
  const raw = randomBytes(32).toString('hex');
  insertPasswordResetToken({ userId: row.id, tokenHash: hashToken(raw), expiresAt: Date.now() + 30 * 60_000 });
  return config.nodeEnv === 'production' ? {} : { devResetToken: raw };
}

export function resetPassword(rawToken: string, newPassword: string) {
  const record = findActivePasswordResetToken(hashToken(rawToken));
  if (!record) throw new AuthError('Invalid or expired reset token', 400);
  markPasswordResetTokenUsed(record.id);
  updatePasswordHash(record.user_id, bcrypt.hashSync(newPassword, BCRYPT_ROUNDS));
  revokeAllRefreshTokensForUser(record.user_id); // force re-login everywhere after a password reset
}
