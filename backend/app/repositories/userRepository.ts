import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';
import type { Role, UserRow } from '../models/user.ts';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [normalizeEmail(email)]);
}

export function findUserById(id: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
}

export async function createUser(params: {
  name: string; email: string; passwordHash: string; role?: Role; phoneNumber?: string;
  birthDate?: string; birthTime?: string; birthPlace?: string;
  birthLatitude?: number; birthLongitude?: number; birthTimezoneOffsetMinutes?: number;
}): Promise<UserRow> {
  const row: UserRow = {
    id: randomUUID(),
    name: params.name,
    email: normalizeEmail(params.email),
    password_hash: params.passwordHash,
    role: params.role || 'USER',
    status: 'ACTIVE',
    created_at: Date.now(),
    birth_date: params.birthDate ?? null,
    birth_time: params.birthTime ?? null,
    birth_place: params.birthPlace ?? null,
    birth_latitude: params.birthLatitude ?? null,
    birth_longitude: params.birthLongitude ?? null,
    birth_timezone_offset_minutes: params.birthTimezoneOffsetMinutes ?? null,
    phone_number: params.phoneNumber ?? null,
    phone_verified: false,
  };
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone_offset_minutes, phone_number, phone_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [row.id, row.name, row.email, row.password_hash, row.role, row.status, row.created_at,
      row.birth_date, row.birth_time, row.birth_place, row.birth_latitude, row.birth_longitude, row.birth_timezone_offset_minutes,
      row.phone_number, row.phone_verified]
  );
  return row;
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

// Lets a returning user save their birth details once (e.g. from the Kundli
// maker) instead of retyping them into every calculator forever — the same
// columns registration optionally fills in, just writable after the fact.
export async function updateBirthDetails(userId: string, params: {
  birthDate: string; birthTime: string; birthPlace: string; birthLatitude: number; birthLongitude: number; birthTimezoneOffsetMinutes: number;
}) {
  await query(
    `UPDATE users SET birth_date = $1, birth_time = $2, birth_place = $3, birth_latitude = $4, birth_longitude = $5, birth_timezone_offset_minutes = $6
     WHERE id = $7`,
    [params.birthDate, params.birthTime, params.birthPlace, params.birthLatitude, params.birthLongitude, params.birthTimezoneOffsetMinutes, userId]
  );
}

// ── Admin operations ─────────────────────────────────────────────────────

export function listAllUsers(): Promise<UserRow[]> {
  return query<UserRow>('SELECT * FROM users ORDER BY created_at DESC');
}

export async function updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED') {
  await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
}

export async function updateUserRole(userId: string, role: Role) {
  await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
}

// Self-service display-name change (Admin/Staff "Edit Profile") — distinct
// from updateUserRole/updateUserStatus above, which are admin-on-someone-else
// operations; this one is a user acting on their own row.
export async function updateUserName(userId: string, name: string) {
  await query('UPDATE users SET name = $1 WHERE id = $2', [name, userId]);
}

// ── Refresh tokens ───────────────────────────────────────────────────────

export async function insertRefreshToken(params: { userId: string; tokenHash: string; expiresAt: number }) {
  const id = randomUUID();
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
    [id, params.userId, params.tokenHash, params.expiresAt, Date.now()]
  );
  return id;
}

export function findActiveRefreshToken(tokenHash: string) {
  return queryOne<{ id: string; user_id: string; expires_at: number }>(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > $2',
    [tokenHash, Date.now()]
  );
}

export async function revokeRefreshToken(id: string) {
  await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2', [Date.now(), id]);
}

export async function revokeAllRefreshTokensForUser(userId: string) {
  await query('UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2 AND revoked_at IS NULL', [Date.now(), userId]);
}

// ── Password reset tokens ───────────────────────────────────────────────

export async function insertPasswordResetToken(params: { userId: string; tokenHash: string; expiresAt: number }) {
  const id = randomUUID();
  await query(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
    [id, params.userId, params.tokenHash, params.expiresAt, Date.now()]
  );
  return id;
}

export function findActivePasswordResetToken(tokenHash: string) {
  return queryOne<{ id: string; user_id: string }>(
    'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > $2',
    [tokenHash, Date.now()]
  );
}

export async function markPasswordResetTokenUsed(id: string) {
  await query('UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2', [Date.now(), id]);
}

// ── Phone OTP verification ──────────────────────────────────────────────

export async function markPhoneVerified(userId: string) {
  await query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [userId]);
}

export async function insertPhoneOtp(params: { userId: string; codeHash: string; expiresAt: number }) {
  const id = randomUUID();
  await query(
    'INSERT INTO phone_otp_codes (id, user_id, code_hash, expires_at, attempts, created_at) VALUES ($1, $2, $3, $4, 0, $5)',
    [id, params.userId, params.codeHash, params.expiresAt, Date.now()]
  );
  return id;
}

// Only the most recent unused, unexpired code counts — a resend should
// invalidate any earlier code rather than leave multiple valid ones around.
export function findActivePhoneOtp(userId: string) {
  return queryOne<{ id: string; code_hash: string; attempts: number }>(
    'SELECT id, code_hash, attempts FROM phone_otp_codes WHERE user_id = $1 AND used_at IS NULL AND expires_at > $2 ORDER BY created_at DESC LIMIT 1',
    [userId, Date.now()]
  );
}

export async function incrementPhoneOtpAttempts(id: string) {
  await query('UPDATE phone_otp_codes SET attempts = attempts + 1 WHERE id = $1', [id]);
}

export async function markPhoneOtpUsed(id: string) {
  await query('UPDATE phone_otp_codes SET used_at = $1 WHERE id = $2', [Date.now(), id]);
}
