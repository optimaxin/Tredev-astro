// Minimal smoke test for the auth flow — no framework, just assertions that
// fail loudly (non-zero exit) if the auth logic regresses. Requires
// DATABASE_URL to be set (backend/.env, loaded automatically via
// --env-file-if-exists in package.json). Run with:
//   npm run test
import assert from 'node:assert/strict';

const { pool, runMigrations } = await import('../app/core/db.ts');
const { register, login, refresh, logout, verifyAccessToken, authenticate, loginWithFirebase, AuthError } = await import('../app/services/authService.ts');
const { config } = await import('../app/core/config.ts');

await runMigrations();

// Unique per run so repeated runs against the same shared Postgres database
// don't collide on the UNIQUE email constraint.
const testEmail = `auth-smoke-${Date.now()}@example.com`;

async function main() {
  // Register
  const { user, accessToken, refreshToken } = await register({ name: 'Test User', email: testEmail, password: 'password123' });
  assert.equal(user.email, testEmail);
  assert.equal(user.role, 'USER');
  assert.ok(accessToken && refreshToken);
  console.log('✓ register creates a user and issues tokens');

  // Duplicate registration rejected
  await assert.rejects(register({ name: 'Dup', email: testEmail, password: 'password123' }), AuthError);
  console.log('✓ duplicate email registration rejected');

  // Access token is valid and carries the right identity
  const payload = verifyAccessToken(accessToken);
  assert.equal(payload.sub, user.id);
  assert.equal(payload.role, 'USER');
  console.log('✓ access token verifies with correct claims');

  // Login succeeds with correct password
  const loginResult = await login(testEmail, 'password123');
  assert.equal(loginResult.user.id, user.id);
  console.log('✓ login succeeds with correct credentials');

  // Login fails with wrong password
  await assert.rejects(login(testEmail, 'wrong-password'), AuthError);
  console.log('✓ login rejects wrong password');

  // Refresh rotates the token and the old one can no longer be reused
  const rotated = await refresh(refreshToken);
  assert.ok(rotated.accessToken && rotated.refreshToken);
  await assert.rejects(refresh(refreshToken), AuthError);
  console.log('✓ refresh token rotates and old token is invalidated');

  // Rotation keeps the session: the new access token still authenticates
  const authed = await authenticate(rotated.accessToken);
  assert.equal(authed?.id, user.id);
  assert.equal(authed?.email, testEmail);
  console.log('✓ rotated access token authenticates against the DB');

  // Logout revokes the current refresh token AND kills that session's access token
  await logout(rotated.refreshToken);
  await assert.rejects(refresh(rotated.refreshToken), AuthError);
  assert.equal(await authenticate(rotated.accessToken), null);
  console.log('✓ logout revokes the refresh token and its access token immediately');

  // Another session of the same user is unaffected by that logout
  assert.equal((await authenticate(loginResult.accessToken))?.id, user.id);
  console.log('✓ logout only ends its own session');

  // Dev-only mock login (see decodeMockToken in authService.ts). The
  // production gate is the whole point of these three — a mock token must
  // never be a valid credential once NODE_ENV says production.
  const mockPhone = `+9990000${String(Date.now()).slice(-6)}`;
  const realShortcuts = config.devShortcuts;
  config.devShortcuts = true;
  const mocked = await loginWithFirebase(`mock:${mockPhone}`);
  assert.equal(mocked.user.phone_number, mockPhone);
  assert.ok(mocked.accessToken && mocked.refreshToken);
  console.log('✓ dev mock login issues tokens for a phone number');

  await assert.rejects(loginWithFirebase('mock:not-a-phone'), AuthError);
  console.log('✓ dev mock login rejects a malformed phone number');

  config.devShortcuts = false;
  try {
    await assert.rejects(loginWithFirebase(`mock:${mockPhone}`), AuthError);
  } finally {
    config.devShortcuts = realShortcuts;
  }
  console.log('✓ dev mock login is rejected unless DEV_SHORTCUTS is on');

  console.log('\nAll auth smoke tests passed.');
}

main()
  .catch(e => {
    console.error('\n✗ AUTH SMOKE TEST FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
