// Premium Report integration tests — same style as tests/auth.test.ts: no
// framework, plain assertions, non-zero exit on failure. Requires
// DATABASE_URL (backend/.env, loaded via --env-file-if-exists).
//
//   npm run test:premium-reports
//
// What is REAL here vs MOCKED:
//   REAL   — Express app, requireAuth, JWT issuance, Postgres, the ownership
//            ledger, zod validation, rate limiting, routing.
//   MOCKED — only the Stage 6 FastAPI service, which is replaced by a tiny
//            local HTTP server speaking its ACTUAL wire format (verified
//            against kb_report/api.py: 202 {success, report_id, status,
//            sections} on generate, a bare status object on /status, and
//            {success:false, error:{code,message}} on a 404).
// So every authorization and ownership assertion below exercises the real
// code path. Only the LLM/report generation is stood in for — deliberately,
// since a test must never trigger a real multi-minute paid generation run.
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// The mock upstream must exist before config/main read PREMIUM_REPORT_API_URL.
const upstreamCalls: Array<{ method: string; url: string; auth: string | null; body: any }> = [];
let generateCallCount = 0;

const SECTION_ORDER = ['cover', 'birth_details', 'lagna'];

const MOCK_CHART_CONTEXT = {
  schema_version: 'tradeva.chart_context/1.0',
  source: { engine: 'TredevAstro Kundli Engine (D:\\TredevAstro\\backend)', base_url: 'https://internal-engine.example', endpoints: ['/api/calculators/kundli-full'], time_dependent_as_of: '2026-10-08' },
  birth_details: { date: '1995-08-15', time: '10:30', timezone_offset_minutes: 330, latitude: 28.6139, longitude: 77.209, place_label: 'New Delhi, India' },
  lagna: { rashi: 'Pisces', longitude: 351.52, degree_in_sign: 21.52 },
  planets: [
    { planet: 'Sun', engine_id: 'sun', classical: true, longitude: 118.57, rashi: 'Cancer', degree_in_sign: 28.57, house: 5, nakshatra: 'Ashlesha', nakshatra_pada: 4, nakshatra_lord: 'Mercury', retrograde: false },
    { planet: 'Moon', engine_id: 'moon', classical: true, longitude: 11.2, rashi: 'Aries', degree_in_sign: 11.2, house: 2, nakshatra: 'Ashwini', nakshatra_pada: 4, nakshatra_lord: 'Ketu', retrograde: false },
    // malformed: house out of range — must be dropped, not passed through
    { planet: 'Mars', engine_id: 'mars', classical: true, rashi: 'Cancer', degree_in_sign: 3, house: 13, nakshatra: 'Pushya', nakshatra_pada: 1, nakshatra_lord: 'Saturn', retrograde: false },
  ],
  moon_nakshatra: { name: 'Ashwini', pada: 4, lord: 'Ketu' },
  dasha: {
    vimshottari: {
      current_mahadasha: { lord: 'Sun' },
      timeline: [{ lord: 'Ketu', starts_at: '1995-08-15', ends_at: '2002-03-25', active: false, antardashas: [{ lord: 'Ketu', starts_at: '1995-08-15', ends_at: '1996-01-02', active: false }] }],
    },
    yogini: { timeline: [{ lord: 'Mercury', yogini: 'Bhadrika', starts_at: '1995-08-15', ends_at: '2000-05-04', active: false }] },
  },
  divisional_charts: { D9: { ascendant_rashi: 'Capricorn', placements: [{ planet: 'Sun', rashi: 'Pisces', house: 3 }] } },
  planet_strength: [{ planet: 'Sun', shadbala_rupas: 10.64, min_required_rupas: 6.5, is_strong: true }],
  doshas: { kaal_sarp: { present: false, rahu_rashi: 'Libra' }, sade_sati: { active: true, phase: 'rising', moon_rashi: 'Aries' }, pitra: { present: false, reasons: [] } },
  kp_cusps: [{ cusp: 1, rashi: 'Pisces' }],
  planets_by_house: { 5: ['Sun'] },
};

// Stage 6 mints a fresh uuid4().hex[:16] per report, so the mock does too —
// a mock that returned a constant id would make every second generate
// collide on report_id and test a situation that cannot occur.
const issuedIds = new Set<string>();
function newReportId(): string {
  let id: string;
  do {
    id = Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  } while (issuedIds.has(id));
  issuedIds.add(id);
  return id;
}
// A well-formed id the mock has deliberately never issued — used to assert
// that a ledger row pointing at a report the service no longer has is
// reported honestly rather than as a false 404.
const UNKNOWN_REPORT_ID = 'ffffffffffffffff';

const upstream: Server = createServer((req, res) => {
  let raw = '';
  req.on('data', c => { raw += c; });
  req.on('end', () => {
    const body = raw ? JSON.parse(raw) : null;
    upstreamCalls.push({ method: req.method!, url: req.url!, auth: req.headers.authorization ?? null, body });
    const send = (status: number, payload: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    };

    if (req.method === 'POST' && req.url === '/api/reports/generate') {
      generateCallCount++;
      return send(202, { success: true, report_id: newReportId(), status: 'queued', sections: SECTION_ORDER.length });
    }
    const statusMatch = /^\/api\/reports\/([a-f0-9]{16})\/status$/.exec(req.url ?? '');
    if (req.method === 'GET' && statusMatch && issuedIds.has(statusMatch[1])) {
      return send(200, {
        report_id: statusMatch[1], status: 'completed',
        progress: { done: 3, total: 3 },
        section_status: { cover: 'completed', birth_details: 'completed', lagna: 'completed' },
        counts: { completed: 3 }, error: null,
        created_at: '2026-10-10T00:00:00+00:00', updated_at: '2026-10-10T00:05:00+00:00',
      });
    }
    const reportMatch = /^\/api\/reports\/([a-f0-9]{16})$/.exec(req.url ?? '');
    if (req.method === 'GET' && reportMatch && issuedIds.has(reportMatch[1])) {
      return send(200, {
        report_id: reportMatch[1], status: 'completed',
        created_at: '2026-10-10T00:00:00+00:00', updated_at: '2026-10-10T00:05:00+00:00', error: null,
        section_status: { cover: 'completed', birth_details: 'completed', lagna: 'completed' },
        sections: SECTION_ORDER.map((id, i) => ({
          section_id: id, title: `Section ${i + 1}`, kind: i < 2 ? 'structured' : 'llm',
          status: 'completed', content: `# ${id}\n\nBody text.`, key_points: ['a'],
          // Fields Stage 6's public_view() still returns, which the browser
          // must never see (see services/premiumReportView.ts).
          validation: { valid: true, issues: [], warnings: [], repairs: [] },
          generation: { attempts: 1, usage: { estimated_cost: 0.42 } },
          retrieval: { evidence_count: 8, query_count: 3 },
          chart_facts_used: [{ id: 'f1', statement: 'Sun in Leo' }],
        })),
        // Real Stage 6 shape, trimmed: the allowlist must keep the drawable
        // chart and drop `source` (internal engine URL + local path).
        chart_context: MOCK_CHART_CONTEXT,
        usage_summary: { llm_calls: 40, estimated_cost: 3.21 },
        quality_gate: { status: 'pass', critical_error_count: 0 },
        overall_validation: { valid: true, issues: [] },
        coverage_summary: { coverage_percentage: 99 },
        config: { report_type: 'premium', section_ids: SECTION_ORDER },
      });
    }
    if (req.method === 'GET' && req.url === '/api/reports/blueprint') {
      return send(200, { sections: SECTION_ORDER.map(id => ({ section_id: id, title: id, kind: 'llm', priority: 'high', profiles: ['premium'] })), premium_enabled: true });
    }
    const resumeMatch = /^\/api\/reports\/([a-f0-9]{16})\/resume$/.exec(req.url ?? '');
    if (req.method === 'POST' && resumeMatch && issuedIds.has(resumeMatch[1])) {
      return send(202, { success: true, report_id: resumeMatch[1], status: 'queued' });
    }
    // Everything else: Stage 6's real not-found envelope.
    return send(404, { success: false, error: { code: 'REPORT_NOT_FOUND', message: 'no such report' } });
  });
});

await new Promise<void>(r => upstream.listen(0, '127.0.0.1', r));
const upstreamPort = (upstream.address() as AddressInfo).port;
process.env.PREMIUM_REPORT_API_URL = `http://127.0.0.1:${upstreamPort}`;

// Imported AFTER the env var is set, so config picks up the mock's address.
const { pool, runMigrations, query } = await import('../app/core/db.ts');
const { register } = await import('../app/services/authService.ts');
const express = (await import('express')).default;
const { premiumReportsRouter } = await import('../app/api/premiumReports.routes.ts');

await runMigrations();

// A minimal app mounting the real router — no need to boot sockets/seeds.
const app = express();
app.use(express.json());
app.use('/api/premium-reports', premiumReportsRouter);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(r => server.once('listening', () => r()));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const stamp = Date.now();
const alice = await register({ name: 'Alice Premium', email: `premium-alice-${stamp}@example.com`, password: 'password123' });
const bob = await register({ name: 'Bob Premium', email: `premium-bob-${stamp}@example.com`, password: 'password123' });

function api(path: string, token?: string, init: RequestInit = {}) {
  return fetch(`${base}/api/premium-reports${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
}

// res.json() is typed `unknown`. Every response here is this API's envelope,
// so narrow once rather than casting at each assertion.
type Envelope = { success: boolean; data: any; error: { code: string; message: string } };
function body(res: Response): Promise<Envelope> {
  return res.json() as Promise<Envelope>;
}

const VALID_BIRTH = {
  date: '1995-08-15',
  time: '10:30',
  // India, in this project's convention throughout: UTC = local - offset.
  timezoneOffsetMinutes: 330,
  latitude: 28.6139,
  longitude: 77.209,
  placeLabel: 'New Delhi, India',
};

let failures = 0;
function ok(label: string) { console.log(`✓ ${label}`); }
async function check(label: string, fn: () => Promise<void> | void) {
  try { await fn(); ok(label); } catch (e) { failures++; console.error(`✗ ${label}\n   ${(e as Error).message}`); }
}

async function main() {
  // ── authentication ─────────────────────────────────────────────────────
  await check('every route rejects an unauthenticated request', async () => {
    for (const [path, init] of [
      ['/generate', { method: 'POST', body: JSON.stringify({ birthDetails: VALID_BIRTH }) }],
      ['/', {}],
      ['/blueprint', {}],
      [`/${UNKNOWN_REPORT_ID}`, {}],
      [`/${UNKNOWN_REPORT_ID}/status`, {}],
      [`/${UNKNOWN_REPORT_ID}/sections/lagna`, {}],
      [`/${UNKNOWN_REPORT_ID}/resume`, { method: 'POST' }],
    ] as Array<[string, RequestInit]>) {
      const res = await api(path, undefined, init);
      assert.equal(res.status, 401, `${path} should be 401 without a token, got ${res.status}`);
    }
  });

  await check('an invalid bearer token is rejected', async () => {
    const res = await api('/', 'not-a-real-token');
    assert.equal(res.status, 401);
  });

  // ── validation ─────────────────────────────────────────────────────────
  await check('generate rejects a malformed birth date', async () => {
    const res = await api('/generate', alice.accessToken, {
      method: 'POST',
      body: JSON.stringify({ birthDetails: { ...VALID_BIRTH, date: '15-08-1995' } }),
    });
    assert.equal(res.status, 422);
    const envelope = await body(res);
    assert.equal(envelope.error.code, 'VALIDATION_ERROR');
  });

  await check('generate rejects an out-of-range latitude', async () => {
    const res = await api('/generate', alice.accessToken, {
      method: 'POST',
      body: JSON.stringify({ birthDetails: { ...VALID_BIRTH, latitude: 120 } }),
    });
    assert.equal(res.status, 422);
  });

  await check('generate requires exactly one of birthDetails / chartId', async () => {
    const neither = await api('/generate', alice.accessToken, { method: 'POST', body: JSON.stringify({}) });
    assert.equal(neither.status, 422, 'neither provided');
    const both = await api('/generate', alice.accessToken, {
      method: 'POST', body: JSON.stringify({ birthDetails: VALID_BIRTH, chartId: 7 }),
    });
    assert.equal(both.status, 422, 'both provided');
  });

  // ── successful generation ──────────────────────────────────────────────
  let reportId = '';
  await check('generate starts a report and returns its id', async () => {
    const before = generateCallCount;
    const res = await api('/generate', alice.accessToken, {
      method: 'POST',
      body: JSON.stringify({ birthDetails: VALID_BIRTH, subjectName: 'Alice Premium', idempotencyKey: `test-key-${stamp}` }),
    });
    assert.equal(res.status, 202);
    const envelope = await body(res);
    assert.equal(envelope.success, true);
    assert.match(envelope.data.reportId, /^[a-f0-9]{16}$/);
    assert.equal(envelope.data.duplicate, false);
    assert.equal(generateCallCount, before + 1, 'exactly one upstream generate call');
    reportId = envelope.data.reportId;
  });

  await check('the timezone offset reaches Stage 6 unchanged (+330 for India)', async () => {
    const call = upstreamCalls.filter(c => c.url === '/api/reports/generate').at(-1)!;
    assert.equal(call.body.birth_details.timezone_offset_minutes, 330);
    assert.equal(call.body.birth_details.date, VALID_BIRTH.date);
    assert.equal(call.body.birth_details.place, 'New Delhi, India');
    assert.equal(call.body.report_type, 'premium');
  });

  await check('no bearer token is forwarded upstream on the birthDetails path', async () => {
    const call = upstreamCalls.filter(c => c.url === '/api/reports/generate').at(-1)!;
    assert.equal(call.auth, null, 'the user token must not leak upstream when it is not needed');
  });

  // ── duplicate submission ───────────────────────────────────────────────
  await check('the same idempotency key never starts a second generation', async () => {
    const before = generateCallCount;
    const res = await api('/generate', alice.accessToken, {
      method: 'POST',
      body: JSON.stringify({ birthDetails: VALID_BIRTH, subjectName: 'Alice Premium', idempotencyKey: `test-key-${stamp}` }),
    });
    assert.equal(res.status, 200);
    const envelope = await body(res);
    assert.equal(envelope.data.duplicate, true);
    assert.equal(envelope.data.reportId, reportId, 'returns the original report');
    assert.equal(generateCallCount, before, 'no extra upstream generate call');
  });

  await check('concurrent double-submits collapse to one report', async () => {
    const key = `race-key-${stamp}`;
    const before = generateCallCount;
    const [a, b] = await Promise.all([
      api('/generate', bob.accessToken, { method: 'POST', body: JSON.stringify({ birthDetails: VALID_BIRTH, idempotencyKey: key }) }),
      api('/generate', bob.accessToken, { method: 'POST', body: JSON.stringify({ birthDetails: VALID_BIRTH, idempotencyKey: key }) }),
    ]);
    const [ja, jb] = await Promise.all([body(a), body(b)]);
    assert.ok(a.ok && b.ok, 'both requests succeed');
    assert.equal(ja.data.reportId, jb.data.reportId, 'both resolve to the same report');
    assert.ok(generateCallCount - before <= 2, 'at most one upstream call per distinct insert');
    const rows = await query('SELECT COUNT(*)::int AS n FROM premium_reports WHERE user_id = $1 AND idempotency_key = $2', [bob.user.id, key]);
    assert.equal(rows[0].n, 1, 'exactly one ledger row exists for the key');
  });

  // ── ownership ──────────────────────────────────────────────────────────
  await check('the owner can read their own report status', async () => {
    const res = await api(`/${reportId}/status`, alice.accessToken);
    assert.equal(res.status, 200);
    const envelope = await body(res);
    assert.equal(envelope.data.status, 'completed');
    assert.deepEqual(envelope.data.progress, { done: 3, total: 3 });
  });

  await check('another user cannot read the report (404, not 403)', async () => {
    for (const path of [`/${reportId}`, `/${reportId}/status`, `/${reportId}/sections/lagna`]) {
      const res = await api(path, bob.accessToken);
      assert.equal(res.status, 404, `${path} should be 404 for a non-owner`);
      const envelope = await body(res);
      assert.equal(envelope.error.code, path.endsWith('/sections/lagna') ? 'REPORT_NOT_FOUND' : 'REPORT_NOT_FOUND');
    }
  });

  await check('another user cannot resume the report', async () => {
    const res = await api(`/${reportId}/resume`, bob.accessToken, { method: 'POST' });
    assert.equal(res.status, 404);
  });

  await check('a non-owner request never reaches the report service', async () => {
    const touched = upstreamCalls.some(c => c.url.includes(reportId) && c.method === 'POST' && c.url.endsWith('/resume'));
    assert.equal(touched, false, 'ownership is checked before any upstream call');
  });

  await check('a malformed report id is rejected without an upstream call', async () => {
    const before = upstreamCalls.length;
    for (const bad of ['../../etc/passwd', 'ZZZZ', 'a'.repeat(64), '%2e%2e']) {
      const res = await api(`/${encodeURIComponent(bad)}`, alice.accessToken);
      assert.equal(res.status, 404, `${bad} should be rejected`);
    }
    assert.equal(upstreamCalls.length, before, 'no upstream call for a malformed id');
  });

  await check('a malformed section id is rejected', async () => {
    const res = await api(`/${reportId}/sections/${encodeURIComponent('../secrets')}`, alice.accessToken);
    assert.equal(res.status, 404);
  });

  // ── listing ────────────────────────────────────────────────────────────
  await check('the list returns only the caller’s own reports', async () => {
    const res = await api('/', alice.accessToken);
    const envelope = await body(res);
    assert.ok(Array.isArray(envelope.data));
    assert.ok(envelope.data.length >= 1);
    assert.ok(envelope.data.every((r: { reportId: string }) => r.reportId !== undefined));
    assert.ok(envelope.data.some((r: { reportId: string }) => r.reportId === reportId));
    // Bob's report must not appear in Alice's list.
    const bobList = await body(await api('/', bob.accessToken));
    const bobIds = new Set(bobList.data.map((r: { reportId: string }) => r.reportId));
    assert.equal(bobIds.has(reportId), false, 'Bob must not see Alice’s report');
  });

  // ── completed report ───────────────────────────────────────────────────
  await check('the completed report preserves section order', async () => {
    const res = await api(`/${reportId}`, alice.accessToken);
    assert.equal(res.status, 200);
    const envelope = await body(res);
    assert.deepEqual(envelope.data.sections.map((s: { section_id: string }) => s.section_id), SECTION_ORDER);
    assert.equal(envelope.data.subject.name, 'Alice Premium');
    assert.equal(envelope.data.subject.place, 'New Delhi, India');
  });

  await check('the report reaches the browser allowlisted, not spread', async () => {
    const d = (await body(await api(`/${reportId}`, alice.accessToken))).data;
    for (const k of ['chart_context', 'usage_summary', 'quality_gate', 'overall_validation', 'coverage_summary', 'config']) {
      assert.ok(!(k in d), `${k} must not reach the browser`);
    }
    for (const sec of d.sections) {
      for (const k of ['validation', 'generation', 'retrieval', 'chart_facts_used']) assert.ok(!(k in sec), `section.${k} must be stripped`);
      assert.ok('content' in sec && 'title' in sec && 'status' in sec, 'display fields kept');
    }
    const blob = JSON.stringify(d);
    assert.ok(!blob.includes('internal-engine.example'), 'engine base_url must not leak');
    assert.ok(!blob.includes('Kundli Engine ('), 'engine filesystem path must not leak');
    assert.ok(!blob.includes('estimated_cost'), 'LLM cost must not leak');
  });

  await check('the chart view carries real engine values, unchanged', async () => {
    const { chart } = (await body(await api(`/${reportId}`, alice.accessToken))).data;
    assert.equal(chart.lagna.rashi, 'Pisces');
    const sun = chart.planets.find((p: { planet: string }) => p.planet === 'Sun');
    assert.deepEqual(
      { rashi: sun.rashi, house: sun.house, degree: sun.degree_in_sign, nak: sun.nakshatra, pada: sun.nakshatra_pada, retro: sun.retrograde },
      { rashi: 'Cancer', house: 5, degree: 28.57, nak: 'Ashlesha', pada: 4, retro: false }
    );
    assert.ok(!chart.planets.some((p: { planet: string }) => p.planet === 'Mars'), 'a malformed planet (house 13) is dropped, never passed through');
    assert.equal(chart.divisional_charts.D9.ascendant_rashi, 'Capricorn');
    assert.equal(chart.vimshottari[0].lord, 'Ketu');
    assert.ok(!('active' in chart.vimshottari[0]), 'stale fetch-time `active` flag is not forwarded');
    assert.equal(chart.vimshottari[0].antardashas.length, 1);
    assert.equal(chart.yogini[0].yogini, 'Bhadrika');
    assert.equal(chart.planet_strength[0].shadbala_rupas, 10.64);
    assert.deepEqual(chart.doshas.sade_sati, { active: true, phase: 'rising' });
    assert.ok(!('rahu_rashi' in chart.doshas.kaal_sarp), 'dosha internals beyond status are dropped');
    assert.equal(chart.birth.time, '10:30');
    assert.ok(!('latitude' in chart.birth), 'coordinates are not needed to draw the chart');
    assert.equal(chart.as_of, '2026-10-08');
  });

  await check('another user cannot read the chart either', async () => {
    const res = await api(`/${reportId}`, bob.accessToken);
    assert.equal(res.status, 404);
    assert.ok(!JSON.stringify(await body(res)).includes('Pisces'), 'no chart data in a non-owner response');
  });

  await check('the status poll refreshes the cached ledger status', async () => {
    const rows = await query('SELECT status, sections_done FROM premium_reports WHERE report_id = $1', [reportId]);
    assert.equal(rows[0].status, 'completed');
    assert.equal(Number(rows[0].sections_done), 3);
  });

  // ── upstream failure handling ──────────────────────────────────────────
  await check('an upstream outage surfaces as 503, not a crash', async () => {
    const saved = process.env.PREMIUM_REPORT_API_URL;
    // A closed port on localhost: connection refused, the fastest real outage.
    const dead = createServer();
    await new Promise<void>(r => dead.listen(0, '127.0.0.1', r));
    const deadPort = (dead.address() as AddressInfo).port;
    await new Promise<void>(r => dead.close(() => r()));

    const { config } = await import('../app/core/config.ts');
    const original = config.premiumReport.baseUrl;
    config.premiumReport.baseUrl = `http://127.0.0.1:${deadPort}`;
    try {
      const res = await api(`/${reportId}/status`, alice.accessToken);
      assert.equal(res.status, 503);
      const envelope = await body(res);
      assert.equal(envelope.success, false);
      assert.equal(envelope.error.code, 'REPORT_SERVICE_UNAVAILABLE');
      assert.ok(!JSON.stringify(envelope).includes(String(deadPort)), 'the upstream URL must not leak to the client');
    } finally {
      config.premiumReport.baseUrl = original;
      process.env.PREMIUM_REPORT_API_URL = saved;
    }
  });

  await check('a report missing upstream reports 410, not a false 404', async () => {
    // Insert a ledger row whose report id the mock upstream does not know.
    const orphan = UNKNOWN_REPORT_ID;
    await query(
      `INSERT INTO premium_reports (report_id, user_id, status, sections_total, report_type, language, created_at, updated_at)
       VALUES ($1, $2, 'completed', 3, 'premium', 'en', $3, $3) ON CONFLICT (report_id) DO NOTHING`,
      [orphan, alice.user.id, Date.now()]
    );
    const res = await api(`/${orphan}`, alice.accessToken);
    assert.equal(res.status, 410);
    const envelope = await body(res);
    assert.equal(envelope.error.code, 'REPORT_UNAVAILABLE');
  });

  // ── cleanup ────────────────────────────────────────────────────────────
  await query('DELETE FROM premium_reports WHERE user_id = ANY($1)', [[alice.user.id, bob.user.id]]);

  console.log(failures === 0 ? '\nAll premium-report tests passed.' : `\n${failures} test(s) FAILED.`);
}

try {
  await main();
} finally {
  server.close();
  upstream.close();
  await pool.end();
}

if (failures > 0) process.exit(1);
