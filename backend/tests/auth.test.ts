// Minimal smoke test for the auth flow — no framework, just assertions that
// fail loudly (non-zero exit) if the auth logic regresses. Run with:
//   npx tsx tests/auth.test.ts
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';

const TEST_DB = './data/test-auth.db';
if (existsSync(TEST_DB)) rmSync(TEST_DB);
process.env.DATABASE_URL = TEST_DB;
process.env.JWT_SECRET = 'test-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret';

const { db, runMigrations } = await import('../app/core/db.ts');
const { register, login, refresh, logout, verifyAccessToken, AuthError } = await import('../app/services/authService.ts');

runMigrations();

async function main() {
  // Register
  const { user, accessToken, refreshToken } = register({ name: 'Test User', email: 'test@example.com', password: 'password123' });
  assert.equal(user.email, 'test@example.com');
  assert.equal(user.role, 'USER');
  assert.ok(accessToken && refreshToken);
  console.log('✓ register creates a user and issues tokens');

  // Duplicate registration rejected
  assert.throws(() => register({ name: 'Dup', email: 'test@example.com', password: 'password123' }), AuthError);
  console.log('✓ duplicate email registration rejected');

  // Access token is valid and carries the right identity
  const payload = verifyAccessToken(accessToken);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.role, 'USER');
  console.log('✓ access token verifies with correct claims');

  // Login succeeds with correct password
  const loginResult = login('test@example.com', 'password123');
  assert.equal(loginResult.user.id, user.id);
  console.log('✓ login succeeds with correct credentials');

  // Login fails with wrong password
  assert.throws(() => login('test@example.com', 'wrong-password'), AuthError);
  console.log('✓ login rejects wrong password');

  // Refresh rotates the token and the old one can no longer be reused
  const rotated = refresh(refreshToken);
  assert.ok(rotated.accessToken && rotated.refreshToken);
  assert.throws(() => refresh(refreshToken), AuthError);
  console.log('✓ refresh token rotates and old token is invalidated');

  // Logout revokes the current refresh token
  logout(rotated.refreshToken);
  assert.throws(() => refresh(rotated.refreshToken), AuthError);
  console.log('✓ logout revokes the refresh token');

  console.log('\nAll auth smoke tests passed.');
}

main()
  .catch(e => {
    console.error('\n✗ AUTH SMOKE TEST FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
    if (existsSync(TEST_DB)) rmSync(TEST_DB);
    if (existsSync(TEST_DB + '-wal')) rmSync(TEST_DB + '-wal');
    if (existsSync(TEST_DB + '-shm')) rmSync(TEST_DB + '-shm');
  });
