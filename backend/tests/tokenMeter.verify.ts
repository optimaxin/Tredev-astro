/**
 * Token Meter verification against a THROW-AWAY local database.
 *
 *   DATABASE_URL=postgresql://...@127.0.0.1:<port>/<db> JWT_SECRET=x REFRESH_TOKEN_SECRET=x \
 *     npx tsx tests/tokenMeter.verify.ts
 *
 * The database must already have the migrations applied (through 062). This
 * script inserts rows with known answers, runs the real repository functions
 * the admin Token Meter uses, and asserts every figure. It refuses to run
 * against anything but localhost because it writes rows.
 */
import assert from 'node:assert/strict';

const url = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
  console.error(`Refusing to run: DATABASE_URL host is ${url.hostname}, not localhost.`);
  process.exit(2);
}

const { pool } = await import('../app/core/db.ts');
// The shared pool is configured for Supabase TLS; a local test server has none.
(pool as unknown as { options: { ssl: unknown } }).options.ssl = false;
const usage = await import('../app/repositories/aiUsageRepository.ts');

let n = 0;
async function row(r: {
  model: string; role?: string; status?: string; latency: number; total?: number | null;
  fallback?: boolean; traffic: string; error?: string | null;
}) {
  n += 1;
  const total = r.total === undefined ? 150 : r.total;
  await pool.query(
    `INSERT INTO ai_usage (request_id, role, user_id, conversation_id, provider, model, status, error_code,
       input_tokens, output_tokens, total_tokens, latency_ms, fallback_used, traffic_source, created_at)
     VALUES ($1,$2,'u','c','nvidia',$3,$4,$5,$6,$7,$8,$9,$10,$11,'2026-11-20T10:00:00Z')`,
    [`tm-${n}`, r.role ?? 'job-main-turn', r.model, r.status ?? 'success', r.error ?? null,
     total === null ? null : Math.round(total * 2 / 3), total === null ? null : Math.round(total / 3), total,
     r.latency, r.fallback ?? false, r.traffic],
  );
}

const L = 'nvidia/nemotron-3.5-lightning-30b-a3b';
const B = 'nvidia/nemotron-3.5-bolt-e4b';
await pool.query(`DELETE FROM ai_usage WHERE request_id LIKE 'tm-%'`);
// Real users: Lightning answers 1..10 s, one provider-unreported answer, one timeout.
for (let s = 1; s <= 10; s++) await row({ model: L, latency: s * 1000, traffic: 'user' });
await row({ model: L, latency: 5500, total: null, traffic: 'user' });
await row({ model: L, latency: 25000, total: null, status: 'failed', error: 'timeout', traffic: 'user' });
// Bolt: two fallback answers and three evaluation calls.
await row({ model: B, latency: 800, total: 80, fallback: true, traffic: 'user' });
await row({ model: B, latency: 900, total: 80, fallback: true, traffic: 'user' });
for (let i = 0; i < 3; i++) await row({ model: B, role: 'job-evaluate-response', latency: 700, total: 200, traffic: 'user' });
// Internal and unverified traffic that must stay out of the user view.
for (let i = 0; i < 5; i++) await row({ model: L, latency: 99000, total: 1000, traffic: 'evaluation' });
await row({ model: L, latency: 1000, total: 1000, traffic: 'test' });
for (let i = 0; i < 2; i++) await row({ model: L, latency: 1000, total: 500, traffic: 'unknown' });

const range = { from: '2026-11-20T00:00:00Z', to: '2026-11-21T00:00:00Z' };
const checks: string[] = [];
const ok = (name: string) => { checks.push(name); console.log(`[PASS] ${name}`); };

const userView = await usage.getOverview({ ...range });   // default traffic = 'user'
assert.equal(userView.totalRequests, 17); assert.equal(userView.failedRequests, 1);
assert.equal(userView.totalTokens, 10 * 150 + 2 * 80 + 3 * 200);
ok('Real users (default): 17 requests, 1 failed, 2,260 tokens; internal/unknown excluded');

const internal = await usage.getOverview({ ...range, traffic: 'internal' });
assert.equal(internal.totalRequests, 6); assert.equal(internal.totalTokens, 6000);
ok('Internal: evaluation + test runs only (6 requests, 6,000 tokens)');

const unknown = await usage.getOverview({ ...range, traffic: 'unknown' });
assert.equal(unknown.totalRequests, 2);
ok('Unverified history: only the 2 unknown rows');

const all = await usage.getOverview({ ...range, traffic: 'all' });
assert.equal(all.totalRequests, 25);
ok('All traffic: 25 = 17 + 6 + 2 (nothing dropped or double-counted)');

const models = await usage.getModelUsage({ ...range });
const l = models.find(m => m.model === L)!; const b = models.find(m => m.model === B)!;
assert.equal(l.requests, 12);
assert.equal(l.avgLatencyMs, 5500);           // successes only: (1..10 s + 5.5 s) / 11
assert.equal(l.p95LatencyMs, 9500);           // percentile_cont(0.95) over the 11 successes
assert.ok(Math.abs(l.errorRate - 1 / 12) < 1e-9);
assert.equal(l.fallbackRate, 0);
assert.equal(l.callsWithoutTokens, 1);        // provider did not report: not estimated, not summed
assert.equal(l.totalTokens, 1500);
ok('Lightning: avg 5,500 ms, p95 9,500 ms, error 1/12, 1 call without provider tokens (not estimated)');
assert.equal(b.requests, 5); assert.equal(b.fallbackRate, 0.4);
assert.equal(b.evaluationRequests, 3); assert.equal(b.evaluationTokens, 600); assert.equal(b.totalTokens, 760);
ok('Bolt: fallback rate 2/5, evaluation 3 calls / 600 tokens separated from answer tokens');

await pool.query(`DELETE FROM ai_usage WHERE request_id LIKE 'tm-%'`);
await pool.end();
console.log(`\n${checks.length}/${checks.length} Token Meter checks passed`);
