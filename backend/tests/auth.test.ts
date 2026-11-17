// Minimal smoke test for the auth flow — no framework, just assertions that
// fail loudly (non-zero exit) if the auth logic regresses. Requires
// DATABASE_URL to be set (backend/.env, loaded automatically via
// --env-file-if-exists in package.json). Run with:
//   npm run test
import assert from 'node:assert/strict';

const { pool, runMigrations } = await import('../app/core/db.ts');
const { register, login, refresh, logout, verifyAccessToken, authenticate, AuthError } = await import('../app/services/authService.ts');

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
