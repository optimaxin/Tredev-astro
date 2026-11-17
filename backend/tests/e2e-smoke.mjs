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
  // Fully drain what this test consumed — otherwise the ASSIGNED consultation
  // and two QUEUED entries linger and block every later test that also needs
  // to book astrologer #1 (the only astrologer with a real login). Go OFFLINE
  // *before* declining so declining doesn't cascade-promote the queue.
  await post('/api/availability', { email: 'demo.astrologer@tredevastro.local', intent: 'OFFLINE' });
  for (const r of race) {
    if (r.json?.outcome === 'ASSIGNED') await post(`/api/consultations/${r.json.consultation.id}/decline`, { email: 'demo.astrologer@tredevastro.local' });
    else if (r.json?.outcome === 'QUEUED') await post(`/api/queue/${r.json.entry.id}/cancel`, { email: r.json.entry.userEmail });
  }

  // Chat messages: book, accept, exchange messages, verify persistence +
  // ownership boundaries (section 30 — never allow reading someone else's chat).
  await post('/api/availability', { email: 'demo.astrologer@tredevastro.local', intent: 'ONLINE' });
  const astroLogin = await post('/api/auth/login', { email: 'demo.astrologer@tredevastro.local', password: 'DevAstro@123' });
  const astroToken = astroLogin.json?.data?.accessToken;

  const chatBooking = await post('/api/consultations/request', {
    requestId: `smoke-chat-${Date.now()}`, astrologerId: 1, userEmail: email, userName: 'Smoke Test', category: 'Career', type: 'chat',
  });
  const chatConsultationId = chatBooking.json?.consultation?.id;

  const beforeAccept = await post(`/api/consultations/${chatConsultationId}/messages`, { content: 'Too early' }, accessToken);
  ok('chat rejects messages before the astrologer accepts (409)', beforeAccept.status === 409);

  await post(`/api/consultations/${chatConsultationId}/accept`, { email: 'demo.astrologer@tredevastro.local' });

  const sent = await post(`/api/consultations/${chatConsultationId}/messages`, { content: 'Hello from smoke test' }, accessToken);
  ok('user can send a chat message once accepted (201)', sent.status === 201);

  const reply = await post(`/api/consultations/${chatConsultationId}/messages`, { content: 'Reply from astrologer' }, astroToken);
  ok('astrologer can reply', reply.status === 201);

  const history = await get(`/api/consultations/${chatConsultationId}/messages`, accessToken);
  ok('message history returns both messages in order', history.json?.data?.length === 2 && history.json.data[0].senderRole === 'USER' && history.json.data[1].senderRole === 'ASTROLOGIST');

  const noAuthHistory = await get(`/api/consultations/${chatConsultationId}/messages`);
  ok('chat history requires auth (401)', noAuthHistory.status === 401);

  const strangerReg = await post('/api/auth/register', { name: 'Stranger', email: `smoke-stranger-${Date.now()}@example.com`, password: 'password123' });
  const strangerToken = strangerReg.json?.data?.accessToken;
  const strangerRead = await get(`/api/consultations/${chatConsultationId}/messages`, strangerToken);
  ok('an unrelated authenticated user cannot read someone else\'s chat (403)', strangerRead.status === 403);

  // Drain this test's own consultation too, so re-running the script starts clean.
  await post(`/api/consultations/${chatConsultationId}/end`, { email: 'demo.astrologer@tredevastro.local' });
  await post('/api/availability', { email: 'demo.astrologer@tredevastro.local', intent: 'OFFLINE' });

  // Astrologer discovery/catalog
  const catalog = await get('/api/astrologers/catalog');
  ok('catalog list returns astrologers with pagination', catalog.status === 200 && Array.isArray(catalog.json?.data) && catalog.json.data.length > 0 && catalog.json.pagination?.total > 0);

  const filtered = await get('/api/astrologers/catalog?category=Career');
  ok('catalog filters by category', filtered.status === 200 && filtered.json.data.every(a => a.categories.includes('Career')));

  const sorted = await get('/api/astrologers/catalog?sort=price&limit=10');
  const prices = sorted.json?.data?.map(a => a.chatPrice) || [];
  ok('catalog sorts by price ascending', prices.every((p, i) => i === 0 || p >= prices[i - 1]));

  const singleProfile = await get('/api/astrologers/catalog/1');
  ok('single astrologer profile returns expected shape', singleProfile.status === 200 && singleProfile.json?.data?.id === 1 && !('email' in singleProfile.json.data));

  const missingProfile = await get('/api/astrologers/catalog/999999');
  ok('unknown astrologer id returns 404', missingProfile.status === 404);

  const badQuery = await get('/api/astrologers/catalog?limit=999');
  ok('out-of-range limit is rejected (422)', badQuery.status === 422);

  console.log(`\n${pass} passed, ${fail} failed`);
  // ponytail: process.exitCode (not process.exit()) lets Node drain any
  // still-open fetch keep-alive sockets on its own — forcing an immediate
  // exit here crashes on some Windows/Node builds (libuv UV_HANDLE_CLOSING
  // assertion) if a connection is still winding down.
  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch(e => {
  console.error('Smoke test crashed:', e);
  process.exitCode = 1;
});
