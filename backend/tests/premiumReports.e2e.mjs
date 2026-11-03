// REAL-STACK end-to-end test. Unlike tests/premiumReports.test.ts (which
// mocks the Stage 6 service), nothing here is mocked except the LLM
// provider, so this verifies the ACTUAL API contract between all four
// pieces. Run it by hand, with all services already up:
//
//   1. Stage 6:   cd "D:\Tradeva Premium"
//                 REPORT_FULL_BLUEPRINT_ENABLED=true LLM_PROVIDER=mock //                 python -m uvicorn kb_report.api:app --host 127.0.0.1 --port 8100
//   2. Backend:   cd backend && PREMIUM_REPORT_API_URL=http://127.0.0.1:8100 npm run start
//   3. This test: node tests/premiumReports.e2e.mjs
//
// LLM_PROVIDER=mock is not optional: without it, every invocation starts a
// real, multi-minute, paid 43-section generation run.
//
// End-to-end check against the REAL stack:
//   this script -> TredevAstro Express backend (:4000, real auth + ownership)
//                -> Stage 6 FastAPI (:8100, real orchestrator/store)
//                -> Kundli Engine (:4000 calculators, real chart maths)
// Only the LLM provider is mocked (LLM_PROVIDER=mock), so no paid generation.
const API = 'http://127.0.0.1:4000';
const stamp = Date.now();

const log = (...a) => console.log(...a);
let failures = 0;
function expect(cond, label) {
  if (cond) log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

async function j(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

// ── two real accounts ──────────────────────────────────────────────────────
log('\n[1] registering two real users');
let phoneSeq = 0;
const mk = async name => {
  // phone numbers are UNIQUE in the users table (migration 042)
  const phone = `+9198${String(stamp).slice(-6)}${String(phoneSeq++).padStart(2, '0')}`;
  const r = await j('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email: `e2e.${name}.${stamp}@gmail.com`, password: 'password123', phoneNumber: phone }),
  });
  if (!r.body?.success) throw new Error(`register failed: ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const alice = await mk('alice');
const bob = await mk('bob');
expect(!!alice.accessToken && !!bob.accessToken, 'both users registered and hold tokens');

const auth = t => ({ Authorization: `Bearer ${t}` });

// ── blueprint through the proxy ────────────────────────────────────────────
log('\n[2] blueprint via the authenticated proxy');
const bp = await j('/api/premium-reports/blueprint', { headers: auth(alice.accessToken) });
expect(bp.status === 200, `blueprint 200 (got ${bp.status})`);
expect(bp.body?.data?.sections?.length === 43, `43 sections (got ${bp.body?.data?.sections?.length})`);
expect(bp.body?.data?.premium_enabled === true, 'premium blueprint enabled');

// ── generate, for real ─────────────────────────────────────────────────────
log('\n[3] generating a real report (mock LLM, real chart + store)');
const idemKey = `e2e-${stamp}`;
const birthDetails = {
  date: '1995-08-15', time: '10:30',
  timezoneOffsetMinutes: 330,           // India, this project's convention
  latitude: 28.6139, longitude: 77.209,
  placeLabel: 'New Delhi, India',
};
const gen = await j('/api/premium-reports/generate', {
  method: 'POST', headers: auth(alice.accessToken),
  body: JSON.stringify({ birthDetails, subjectName: 'Alice E2E', idempotencyKey: idemKey }),
});
log('   generate ->', gen.status, JSON.stringify(gen.body?.data ?? gen.body));
expect(gen.status === 202, `generate returns 202 (got ${gen.status})`);
const reportId = gen.body?.data?.reportId;
expect(/^[a-f0-9]{16}$/.test(reportId ?? ''), `real Stage 6 report id (${reportId})`);
expect(gen.body?.data?.sections === 43, `43 sections queued (got ${gen.body?.data?.sections})`);

// ── duplicate submission ───────────────────────────────────────────────────
log('\n[4] duplicate submission');
const dup = await j('/api/premium-reports/generate', {
  method: 'POST', headers: auth(alice.accessToken),
  body: JSON.stringify({ birthDetails, subjectName: 'Alice E2E', idempotencyKey: idemKey }),
});
expect(dup.status === 200 && dup.body?.data?.duplicate === true, 'same key returns the existing report');
expect(dup.body?.data?.reportId === reportId, 'and the same report id');

// ── ownership, against the real service ────────────────────────────────────
log('\n[5] ownership enforcement');
for (const p of [``, `/status`, `/sections/lagna`]) {
  const r = await j(`/api/premium-reports/${reportId}${p}`, { headers: auth(bob.accessToken) });
  expect(r.status === 404, `Bob gets 404 on ${p || '(report)'} (got ${r.status})`);
}
const bobResume = await j(`/api/premium-reports/${reportId}/resume`, { method: 'POST', headers: auth(bob.accessToken) });
expect(bobResume.status === 404, `Bob cannot resume (got ${bobResume.status})`);

const bobList = await j('/api/premium-reports/', { headers: auth(bob.accessToken) });
expect(!(bobList.body?.data ?? []).some(r => r.reportId === reportId), 'Alice’s report is absent from Bob’s list');

// ── poll to a terminal state ───────────────────────────────────────────────
log('\n[6] polling real generation status');
let last = null;
// A wall-clock budget, not a correctness bound: a full 43-section run
// legitimately outlives it, and stopping here exercises the partial-
// report path rather than indicating a failure.
const deadline = Date.now() + 10 * 60 * 1000;
while (Date.now() < deadline) {
  const s = await j(`/api/premium-reports/${reportId}/status`, { headers: auth(alice.accessToken) });
  if (s.status !== 200) { console.error('   status call failed', s.status, JSON.stringify(s.body)); break; }
  last = s.body.data;
  process.stdout.write(`\r   ${last.status}  ${last.progress.done}/${last.progress.total}   `);
  if (['completed', 'partial', 'failed'].includes(last.status)) break;
  await new Promise(r => setTimeout(r, 3000));
}
log('');
expect(last !== null, 'status endpoint responded');
log('   terminal status:', last?.status, JSON.stringify(last?.progress));
if (last?.error) log('   error:', JSON.stringify(last.error));

// ── fetch the finished report ──────────────────────────────────────────────
log('\n[7] fetching the report');
const rep = await j(`/api/premium-reports/${reportId}`, { headers: auth(alice.accessToken) });
expect(rep.status === 200, `report 200 (got ${rep.status})`);
const data = rep.body?.data;
if (data) {
  const secs = data.sections ?? [];
  log(`   sections returned: ${secs.length}`);
  log(`   first 5 in order:  ${secs.slice(0, 5).map(s => s.section_id).join(', ')}`);
  log(`   statuses:          ${JSON.stringify(secs.reduce((a, s) => (a[s.status] = (a[s.status] ?? 0) + 1, a), {}))}`);
  expect(secs.length > 0, 'report has sections');
  expect(data.subject?.name === 'Alice E2E', 'subject metadata from the ownership ledger');

  // THE security assertion: no internal/evidence/credential data may appear.
  const blob = JSON.stringify(data);
  for (const needle of ['chunk_id', 'api_key', 'apiKey', 'PINECONE', 'ANTHROPIC_API', 'sk-ant', 'system_prompt', 'LLM_API_KEY']) {
    expect(!blob.includes(needle), `no "${needle}" in the user-facing payload`);
  }

  // Retrieval must be reduced to COUNTS, never evidence text. Checked
  // structurally rather than by substring: a plain includes('evidence')
  // match fires on the legitimate `evidence_count` key and says nothing
  // about whether real evidence leaked.
  for (const s of secs) {
    if (!s.retrieval) continue;
    expect(!Array.isArray(s.retrieval.evidence), `${s.section_id}: retrieval carries counts, not evidence text`);
  }
  const evidenceKeys = [...new Set([...blob.matchAll(/"([a-z_]*evidence[a-z_]*)"\s*:/gi)].map(m => m[1]))];
  expect(evidenceKeys.every(k => k === 'evidence_count'), `the only "evidence" key is evidence_count (saw ${JSON.stringify(evidenceKeys)})`);

  // Internal planning/grounding keys must never reach a client.
  for (const s of secs) {
    for (const k of ['evidence_used', 'summary_inputs', 'must_mention', 'coverage_directives']) {
      expect(!(k in s), `${s.section_id}: no "${k}" key`);
    }
  }
  expect(!('coverage' in data), 'no "coverage" (internal validation metadata)');
  expect(!('repetition_metrics' in data), 'no raw "repetition_metrics"');
  const sample = secs.find(s => s.content);
  if (sample) log(`   sample content:    ${JSON.stringify(String(sample.content).slice(0, 110))}…`);
}

// ── a report id that is well-formed but not Alice's ────────────────────────
log('\n[8] unknown report id');
const unknown = await j('/api/premium-reports/00000000000000aa', { headers: auth(alice.accessToken) });
expect(unknown.status === 404, `unknown id -> 404 (got ${unknown.status})`);

log(failures === 0 ? '\nE2E: all assertions passed.' : `\nE2E: ${failures} assertion(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
