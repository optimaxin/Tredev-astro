// End-to-end smoke check against a RUNNING backend (unlike auth.test.ts, which
// tests the auth logic in-process). Start the server first, then run this.
//
//   Terminal 1:  cd backend && npm run dev
//   Terminal 2:  node tests/e2e-smoke.mjs
//
// Exits non-zero if anything fails, so it can also be used in CI.

const BASE = process.env.API_URL || 'http://localhost:4000';
let pass = 0, fail = 0;

function ok(label, condition, detail = '') {
  if (condition) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label}${detail ? '  → ' + detail : ''}`); }
}

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function get(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  console.log(`Testing backend at ${BASE}\n`);

  // Health check
  try {
    const res = await fetch(`${BASE}/health`);
    ok('server is reachable (/health)', res.ok);
  } catch {
    console.log('✗ server is reachable (/health)  → could not connect. Is `npm run dev` running in backend/?');
    process.exit(1);
  }

  // Register a fresh throwaway account (unique email per run)
  const email = `smoke-${Date.now()}@example.com`;
  const reg = await post('/api/auth/register', { name: 'Smoke Test', email, password: 'password123' });
  ok('register succeeds (201)', reg.status === 201 && reg.json?.success, JSON.stringify(reg.json));
  const { accessToken, refreshToken } = reg.json?.data || {};

  const dup = await post('/api/auth/register', { name: 'Dup', email, password: 'password123' });
  ok('duplicate email rejected (409)', dup.status === 409);

  const weak = await post('/api/auth/register', { name: 'Weak', email: `weak-${Date.now()}@example.com`, password: '123' });
  ok('weak password rejected (422)', weak.status === 422);

  const me = await get('/api/auth/me', accessToken);
  ok('/me returns the right user with a valid token', me.status === 200 && me.json?.data?.email === email);

  const meNoToken = await get('/api/auth/me');
  ok('/me rejects missing token (401)', meNoToken.status === 401);

  const wrongPw = await post('/api/auth/login', { email, password: 'wrong-password' });
  ok('login rejects wrong password (401)', wrongPw.status === 401);

  // Demo accounts (seeded on server startup)
  const demoAccounts = [
    ['demo.user@tredevastro.local', 'DevUser@123', 'USER'],
    ['demo.astrologer@tredevastro.local', 'DevAstro@123', 'ASTROLOGIST'],
    ['demo.admin@tredevastro.local', 'DevAdmin@123', 'ADMIN'],
  ];
  for (const [demoEmail, demoPassword, role] of demoAccounts) {
    const res = await post('/api/auth/login', { email: demoEmail, password: demoPassword });
    ok(`demo ${role.toLowerCase()} account logs in with the right role`, res.json?.data?.user?.role === role);
  }

  const refreshed = await post('/api/auth/refresh', { refreshToken });
  ok('refresh issues a new token pair', refreshed.status === 200 && refreshed.json?.data?.accessToken);
  const newRefreshToken = refreshed.json?.data?.refreshToken;

  const staleRefresh = await post('/api/auth/refresh', { refreshToken });
  ok('reusing a rotated-out refresh token fails', staleRefresh.status === 401);

  await post('/api/auth/logout', { refreshToken: newRefreshToken });
  const afterLogout = await post('/api/auth/refresh', { refreshToken: newRefreshToken });
  ok('refresh token is dead after logout', afterLogout.status === 401);

  // Realtime booking + concurrency: astrologer #1, capacity 1, three
  // near-simultaneous requests must yield exactly one ASSIGNED + two QUEUED.
  await post('/api/availability', { email: 'demo.astrologer@tredevastro.local', intent: 'ONLINE' });
  const race = await Promise.all([1, 2, 3].map(i => post('/api/consultations/request', {
    requestId: `smoke-race-${Date.now()}-${i}`,
    astrologerId: 1,
    userEmail: `smoke-racer-${i}-${Date.now()}@example.com`,
    userName: `Racer ${i}`,
    category: 'Career',
    type: 'chat',
  })));
  const outcomes = race.map(r => r.json?.outcome);
  const assignedCount = outcomes.filter(o => o === 'ASSIGNED').length;
  const queuedCount = outcomes.filter(o => o === 'QUEUED').length;
  ok('concurrency: exactly one booking gets ASSIGNED under capacity=1', assignedCount === 1, `got outcomes: ${outcomes}`);
  ok('concurrency: the other two are QUEUED, never double-ASSIGNED', queuedCount === 2, `got outcomes: ${outcomes}`);
  // Reset astrologer back to OFFLINE so re-running this script starts clean.
  await post('/api/availability', { email: 'demo.astrologer@tredevastro.local', intent: 'OFFLINE' });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
