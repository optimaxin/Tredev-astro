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

export function findUserByFirebaseUid(uid: string): Promise<UserRow | undefined> {
  return queryOne<UserRow>('SELECT * FROM users WHERE firebase_uid = $1', [uid]);
}

// Used at registration to enforce "one account per phone number" — see
// authService.ts's register().
export function findUserByPhone(phoneNumber: string): Promise<UserRow | undefined> {
  const trimmed = phoneNumber.trim();
  const digits = trimmed.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  if (!last10) {
    return queryOne<UserRow>('SELECT * FROM users WHERE phone_number = $1', [trimmed]);
  }
  return queryOne<UserRow>(
    `SELECT * FROM users 
     WHERE phone_number = $1 
        OR (phone_number IS NOT NULL AND RIGHT(regexp_replace(phone_number, '[^0-9]', '', 'g'), 10) = $2)
     ORDER BY (phone_number = $1) DESC
     LIMIT 1`,
    [trimmed, last10]
  );
}

// Links an existing account (found by email match) to a Firebase identity
// on its first Google/Phone sign-in — see authService.ts's loginWithFirebase.
export async function linkFirebaseUid(userId: string, uid: string): Promise<void> {
  await query('UPDATE users SET firebase_uid = $1 WHERE id = $2', [uid, userId]);
}

export async function createUser(params: {
  name: string; email: string; passwordHash: string; role?: Role; phoneNumber?: string; firebaseUid?: string;
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
    wallet_balance: 0,
    firebase_uid: params.firebaseUid ?? null,
  };
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, birth_date, birth_time, birth_place, birth_latitude, birth_longitude, birth_timezone_offset_minutes, phone_number, phone_verified, firebase_uid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [row.id, row.name, row.email, row.password_hash, row.role, row.status, row.created_at,
      row.birth_date, row.birth_time, row.birth_place, row.birth_latitude, row.birth_longitude, row.birth_timezone_offset_minutes,
      row.phone_number, row.phone_verified, row.firebase_uid]
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

export async function insertRefreshToken(params: { userId: string; tokenHash: string; expiresAt: number; familyId: string }) {
  const id = randomUUID();
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, family_id) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, params.userId, params.tokenHash, params.expiresAt, Date.now(), params.familyId]
  );
  return id;
}

// A session (refresh-token family, see migration 048) is live while any of
// its tokens is unrevoked and unexpired — rotation revokes the old token
// only after inserting the new one, so a rotating session never looks dead.
export async function isSessionActive(userId: string, familyId: string) {
  return !!await queryOne(
    'SELECT 1 FROM refresh_tokens WHERE user_id = $1 AND (family_id = $2 OR id = $2) AND revoked_at IS NULL AND expires_at > $3 LIMIT 1',
    [userId, familyId, Date.now()]
  );
}

export function findActiveRefreshToken(tokenHash: string) {
  return queryOne<{ id: string; user_id: string; expires_at: number; family_id: string | null }>(
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

// ── Phone verification ──────────────────────────────────────────────────
// OTP generation/verification used to be custom (hashed code + AWS SNS) —
// replaced by Firebase Phone Auth (see authService.ts's loginWithFirebase),
// which verifies the phone number itself before ever handing us an ID
// token. This is now just the flag-setter, called once that token checks out.

export async function markPhoneVerified(userId: string) {
  await query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [userId]);
}

// Called right after a logged-in user completes Firebase Phone Auth to
// verify THEIR OWN number (post-registration step, see
// authService.ts's linkFirebasePhone) — distinct from markPhoneVerified
// above, which just flips the flag when the number's already on file.
export async function setVerifiedPhone(userId: string, phoneNumber: string, firebaseUid: string): Promise<void> {
  await query('UPDATE users SET phone_number = $1, phone_verified = TRUE, firebase_uid = $2 WHERE id = $3', [phoneNumber, firebaseUid, userId]);
}

// ── Wallet (consultation prepaid balance, see payments.routes.ts) ─────────

export async function creditWallet(userId: string, amount: number): Promise<number> {
  const row = await queryOne<{ wallet_balance: number }>(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 RETURNING wallet_balance',
    [amount, userId]
  );
  return Number(row?.wallet_balance ?? 0);
}

// Clamped to never overdraw — debits min(amount, current balance), atomically
// (the CTE locks the row before computing how much is actually available).
// Used by per-minute consultation billing (realtimeStore.ts), where the
// amount owed is computed from elapsed time and could in principle exceed
// whatever's left if a debit landed late.
export async function debitWallet(userId: string, amount: number): Promise<{ debited: number; balance: number }> {
  const row = await queryOne<{ balance: number; debited: number }>(
    `WITH old AS (SELECT wallet_balance FROM users WHERE id = $2 FOR UPDATE)
     UPDATE users SET wallet_balance = wallet_balance - LEAST($1::numeric, (SELECT wallet_balance FROM old))
     WHERE id = $2
     RETURNING wallet_balance AS balance, LEAST($1::numeric, (SELECT wallet_balance FROM old)) AS debited`,
    [amount, userId]
  );
  return { debited: Number(row?.debited ?? 0), balance: Number(row?.balance ?? 0) };
}
