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

export async function createUser(params: { name: string; email: string; passwordHash: string; role?: Role }): Promise<UserRow> {
  const row: UserRow = {
    id: randomUUID(),
    name: params.name,
    email: normalizeEmail(params.email),
    password_hash: params.passwordHash,
    role: params.role || 'USER',
    status: 'ACTIVE',
    created_at: Date.now(),
  };
  await query(
    'INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [row.id, row.name, row.email, row.password_hash, row.role, row.status, row.created_at]
  );
  return row;
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
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
