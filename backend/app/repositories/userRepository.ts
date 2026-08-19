import { randomUUID } from 'node:crypto';
import { db } from '../core/db.ts';
import type { Role, UserRow } from '../models/user.ts';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function createUser(params: { name: string; email: string; passwordHash: string; role?: Role }): UserRow {
  const row: UserRow = {
    id: randomUUID(),
    name: params.name,
    email: normalizeEmail(params.email),
    password_hash: params.passwordHash,
    role: params.role || 'USER',
    status: 'ACTIVE',
    created_at: Date.now(),
  };
  // node:sqlite's named-parameter overload requires an index-signature type;
  // UserRow is intentionally a plain named interface, so cast at this one
  // native-binding boundary rather than loosening the interface everywhere.
  db.prepare(
    'INSERT INTO users (id, name, email, password_hash, role, status, created_at) VALUES (@id, @name, @email, @password_hash, @role, @status, @created_at)'
  ).run(row as unknown as Record<string, string | number>);
  return row;
}

export function updatePasswordHash(userId: string, passwordHash: string) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

// ── Refresh tokens ───────────────────────────────────────────────────────

export function insertRefreshToken(params: { userId: string; tokenHash: string; expiresAt: number }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, params.userId, params.tokenHash, params.expiresAt, Date.now());
  return id;
}

export function findActiveRefreshToken(tokenHash: string) {
  return db
    .prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?')
    .get(tokenHash, Date.now()) as { id: string; user_id: string; expires_at: number } | undefined;
}

export function revokeRefreshToken(id: string) {
  db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?').run(Date.now(), id);
}

export function revokeAllRefreshTokensForUser(userId: string) {
  db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(Date.now(), userId);
}

// ── Password reset tokens ───────────────────────────────────────────────

export function insertPasswordResetToken(params: { userId: string; tokenHash: string; expiresAt: number }) {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, params.userId, params.tokenHash, params.expiresAt, Date.now());
  return id;
}

export function findActivePasswordResetToken(tokenHash: string) {
  return db
    .prepare('SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .get(tokenHash, Date.now()) as { id: string; user_id: string } | undefined;
}

export function markPasswordResetTokenUsed(id: string) {
  db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').run(Date.now(), id);
}
