import { query, queryOne } from '../core/db.ts';

// Read-only access to `ai_usage` (see migrations/043_ai_usage.sql). Rows are
// written by the Python ai-core service, never by this backend — the backend
// is purely the reader that powers the admin Token Meter.
//
// Every figure here is a SQL aggregate over request-level rows rather than a
// maintained counter. That is slower per query and far easier to trust: a
// number that looks wrong can always be traced to the exact requests behind
// it. Once the table gets large enough for this to hurt, the fix is a
// materialised daily summary, not a counter column.
//
// Costs are stored in USD (every provider prices in USD) and converted to INR
// at read time using the fx rate snapshotted onto each row, so a change to
// today's rate never rewrites what last month reportedly cost.

export interface UsageOverview {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostInr: number;
  // Null when no provider in the window reported an actual charge — on a free
  // tier that is the honest answer, and is why the UI says "Estimated".
  actualCostUsd: number | null;
  avgCostPerRequestInr: number;
  avgTokensPerRequest: number;
  activeUsers: number;
  avgLatencyMs: number;
}

export interface UsageTimePoint {
  bucket: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
}

export interface ModelUsageRow {
  provider: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
  // Reliability and speed, per model. Latency is per LLM call as recorded by
  // ai-core; failed rows are counted in errorRate and excluded from latency.
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  errorRate: number;          // failed / requests, 0-1
  fallbackRate: number;       // answered by a fallback model / requests, 0-1
  // Calls whose provider sent no usage block (tokens are not estimated into
  // the sums above, so this says how much the totals undercount).
  callsWithoutTokens: number;
  // Share of this model's tokens spent grading answers (job-evaluate-response).
  evaluationRequests: number;
  evaluationTokens: number;
}

export interface UserUsageRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
  lastRequestAt: string | null;
}

export interface RequestLogRow {
  id: string;
  requestId: string;
  createdAt: string;
  userId: string | null;
  conversationId: string | null;
  role: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostInr: number;
  latencyMs: number | null;
  status: string;
  errorCode: string | null;
  fallbackUsed: boolean;
}

export interface ConversationUsageRow {
  conversationId: string;
  requests: number;
  totalTokens: number;
  estimatedCostInr: number;
  firstRequestAt: string | null;
  lastRequestAt: string | null;
}

export interface UsageFilters {
  from?: string;
  to?: string;
  userId?: string;
  model?: string;
  provider?: string;
  status?: string;
  conversationId?: string;
  // 'user' (default): real chat traffic only. 'internal': evaluation,
  // profiling, security-probe, benchmark, test and debug runs. 'unknown':
  // history that could not be verified either way (migration 061). 'all'.
  traffic?: 'user' | 'internal' | 'unknown' | 'all';
}

/**
 * Cost in rupees for one row, using that row's own snapshotted fx rate.
 * COALESCE keeps rows written before a rate was recorded from vanishing from
 * the sums — they simply contribute their USD value at the fallback rate.
 *
 * Takes the table alias because the per-user query joins `users`, and an
 * unqualified column there is ambiguous.
 */
const costInr = (alias = ''): string => {
  const p = alias ? `${alias}.` : '';
  return `(${p}total_cost_usd * COALESCE(${p}fx_rate_usd_inr, 88))`;
};

/**
 * Builds the shared WHERE clause. Every value goes in as a bound parameter —
 * these strings reach SQL only as $n placeholders, never interpolated.
 *
 * `alias` qualifies each column. Without it the per-user query breaks with
 * "column reference created_at is ambiguous", since `users` has one too.
 */
function buildWhere(
  filters: UsageFilters,
  opts: { startIndex?: number; alias?: string } = {},
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = opts.startIndex ?? 1;
  const p = opts.alias ? `${opts.alias}.` : '';

  if (filters.from) { conditions.push(`${p}created_at >= $${i++}`); params.push(filters.from); }
  if (filters.to) { conditions.push(`${p}created_at <= $${i++}`); params.push(filters.to); }
  if (filters.userId) { conditions.push(`${p}user_id = $${i++}`); params.push(filters.userId); }
  if (filters.model) { conditions.push(`${p}model = $${i++}`); params.push(filters.model); }
  if (filters.provider) { conditions.push(`${p}provider = $${i++}`); params.push(filters.provider); }
  if (filters.status) { conditions.push(`${p}status = $${i++}`); params.push(filters.status); }
  if (filters.conversationId) { conditions.push(`${p}conversation_id = $${i++}`); params.push(filters.conversationId); }
  // Real user traffic only by default (migration 058). Fixed literals, not
  // user input, so they are inlined rather than bound.
  const traffic = filters.traffic ?? 'user';
  if (traffic === 'user') conditions.push(`${p}traffic_source = 'user'`);
  // 'unknown' (migration 061): historical rows that could not be verified as
  // either; shown only on request, never folded into the other two views.
  else if (traffic === 'internal') conditions.push(`${p}traffic_source NOT IN ('user', 'unknown')`);
  else if (traffic === 'unknown') conditions.push(`${p}traffic_source = 'unknown'`);

  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

const num = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

export async function getOverview(filters: UsageFilters): Promise<UsageOverview> {
  const { clause, params } = buildWhere(filters);
  const row = await queryOne<Record<string, string | null>>(
    `SELECT
       COUNT(*)                                            AS total_requests,
       COUNT(*) FILTER (WHERE status = 'success')          AS successful_requests,
       COUNT(*) FILTER (WHERE status = 'failed')           AS failed_requests,
       COALESCE(SUM(input_tokens), 0)                      AS input_tokens,
       COALESCE(SUM(output_tokens), 0)                     AS output_tokens,
       COALESCE(SUM(total_tokens), 0)                      AS total_tokens,
       COALESCE(SUM(total_cost_usd), 0)                    AS cost_usd,
       COALESCE(SUM(${costInr()}), 0)                       AS cost_inr,
       SUM(actual_cost_usd)                                AS actual_cost_usd,
       COUNT(DISTINCT user_id)                             AS active_users,
       COALESCE(AVG(latency_ms), 0)                        AS avg_latency_ms
     FROM ai_usage ${clause}`,
    params,
  );

  const totalRequests = num(row?.total_requests);
  const totalTokens = num(row?.total_tokens);
  const totalCostInr = num(row?.cost_inr);

  return {
    totalRequests,
    successfulRequests: num(row?.successful_requests),
    failedRequests: num(row?.failed_requests),
    inputTokens: num(row?.input_tokens),
    outputTokens: num(row?.output_tokens),
    totalTokens,
    estimatedCostUsd: num(row?.cost_usd),
    estimatedCostInr: totalCostInr,
    actualCostUsd: row?.actual_cost_usd === null || row?.actual_cost_usd === undefined
      ? null
      : Number(row.actual_cost_usd),
    avgCostPerRequestInr: totalRequests ? totalCostInr / totalRequests : 0,
    avgTokensPerRequest: totalRequests ? totalTokens / totalRequests : 0,
    activeUsers: num(row?.active_users),
    avgLatencyMs: Math.round(num(row?.avg_latency_ms)),
  };
}

export async function getTimeseries(
  filters: UsageFilters,
  granularity: 'day' | 'week' | 'month',
): Promise<UsageTimePoint[]> {
  const { clause, params } = buildWhere(filters);
  // `granularity` is never interpolated from user input directly — the caller
  // maps it onto this closed set first.
  const unit = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day';
  const rows = await query<Record<string, string>>(
    `SELECT
       date_trunc('${unit}', created_at)   AS bucket,
       COUNT(*)                            AS requests,
       COALESCE(SUM(input_tokens), 0)      AS input_tokens,
       COALESCE(SUM(output_tokens), 0)     AS output_tokens,
       COALESCE(SUM(total_tokens), 0)      AS total_tokens,
       COALESCE(SUM(${costInr()}), 0)       AS cost_inr
     FROM ai_usage ${clause}
     GROUP BY bucket
     ORDER BY bucket ASC`,
    params,
  );
  return rows.map(r => ({
    bucket: new Date(r.bucket).toISOString(),
    requests: num(r.requests),
    inputTokens: num(r.input_tokens),
    outputTokens: num(r.output_tokens),
    totalTokens: num(r.total_tokens),
    estimatedCostInr: num(r.cost_inr),
  }));
}

export async function getModelUsage(filters: UsageFilters): Promise<ModelUsageRow[]> {
  const { clause, params } = buildWhere(filters);
  const rows = await query<Record<string, string>>(
    `SELECT provider, model,
       COUNT(*)                        AS requests,
       COALESCE(SUM(input_tokens), 0)  AS input_tokens,
       COALESCE(SUM(output_tokens), 0) AS output_tokens,
       COALESCE(SUM(total_tokens), 0)  AS total_tokens,
       COALESCE(SUM(${costInr()}), 0)   AS cost_inr,
       AVG(latency_ms) FILTER (WHERE status = 'success')                       AS avg_latency_ms,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
         FILTER (WHERE status = 'success')                                     AS p95_latency_ms,
       COUNT(*) FILTER (WHERE status <> 'success')                             AS failed,
       COUNT(*) FILTER (WHERE fallback_used)                                   AS fallbacks,
       COUNT(*) FILTER (WHERE total_tokens IS NULL AND status = 'success')     AS no_tokens,
       COUNT(*) FILTER (WHERE role = 'job-evaluate-response')                  AS eval_requests,
       COALESCE(SUM(total_tokens) FILTER (WHERE role = 'job-evaluate-response'), 0) AS eval_tokens
     FROM ai_usage ${clause}
     GROUP BY provider, model
     ORDER BY cost_inr DESC, requests DESC`,
    params,
  );
  return rows.map(r => ({
    provider: r.provider,
    model: r.model,
    requests: num(r.requests),
    inputTokens: num(r.input_tokens),
    outputTokens: num(r.output_tokens),
    totalTokens: num(r.total_tokens),
    estimatedCostInr: num(r.cost_inr),
    avgLatencyMs: r.avg_latency_ms == null ? null : Math.round(num(r.avg_latency_ms)),
    p95LatencyMs: r.p95_latency_ms == null ? null : Math.round(num(r.p95_latency_ms)),
    errorRate: num(r.requests) ? num(r.failed) / num(r.requests) : 0,
    fallbackRate: num(r.requests) ? num(r.fallbacks) / num(r.requests) : 0,
    callsWithoutTokens: num(r.no_tokens),
    evaluationRequests: num(r.eval_requests),
    evaluationTokens: num(r.eval_tokens),
  }));
}

/**
 * Per-user totals. LEFT JOIN because ai-core's user id is not always a
 * Tredev user row: an anonymous visitor on the Kundli page is keyed by a
 * hash of their birth details. Those are real usage and must still appear,
 * just without a name attached.
 */
export async function getUserUsage(
  filters: UsageFilters,
  opts: { search?: string; sort?: string; limit?: number } = {},
): Promise<UserUsageRow[]> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  let where = clause;
  const args = [...params];

  if (opts.search) {
    const i = args.length + 1;
    where = where
      ? `${where} AND (u.user_id ILIKE $${i} OR usr.name ILIKE $${i} OR usr.email ILIKE $${i})`
      : `WHERE (u.user_id ILIKE $${i} OR usr.name ILIKE $${i} OR usr.email ILIKE $${i})`;
    args.push(`%${opts.search}%`);
  }

  const sortColumn = ({
    tokens: 'total_tokens',
    cost: 'cost_inr',
    requests: 'requests',
    recent: 'last_request_at',
  } as Record<string, string>)[opts.sort ?? 'tokens'] ?? 'total_tokens';

  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);

  const rows = await query<Record<string, string | null>>(
    `SELECT u.user_id, usr.name AS user_name, usr.email AS user_email,
       COUNT(*)                          AS requests,
       COALESCE(SUM(u.input_tokens), 0)  AS input_tokens,
       COALESCE(SUM(u.output_tokens), 0) AS output_tokens,
       COALESCE(SUM(u.total_tokens), 0)  AS total_tokens,
       COALESCE(SUM(${costInr('u')}), 0) AS cost_inr,
       MAX(u.created_at)                 AS last_request_at
     FROM ai_usage u
     LEFT JOIN users usr ON usr.id::text = u.user_id
     ${where}
     GROUP BY u.user_id, usr.name, usr.email
     ORDER BY ${sortColumn} DESC NULLS LAST
     LIMIT ${limit}`,
    args,
  );

  return rows.map(r => ({
    userId: r.user_id ?? 'unknown',
    userName: r.user_name,
    userEmail: r.user_email,
    requests: num(r.requests),
    inputTokens: num(r.input_tokens),
    outputTokens: num(r.output_tokens),
    totalTokens: num(r.total_tokens),
    estimatedCostInr: num(r.cost_inr),
    lastRequestAt: r.last_request_at ? new Date(r.last_request_at).toISOString() : null,
  }));
}

export async function getRequestLogs(
  filters: UsageFilters,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ rows: RequestLogRow[]; total: number }> {
  const { clause, params } = buildWhere(filters);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ai_usage ${clause}`, params,
  );

  const rows = await query<Record<string, string | null>>(
    `SELECT id, request_id, created_at, user_id, conversation_id, role,
            provider, model, input_tokens, output_tokens, total_tokens,
            ${costInr()} AS cost_inr, latency_ms, status, error_code, fallback_used
     FROM ai_usage ${clause}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    total: num(countRow?.count),
    rows: rows.map(r => ({
      id: String(r.id),
      requestId: r.request_id ?? '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      userId: r.user_id,
      conversationId: r.conversation_id,
      role: r.role ?? '',
      provider: r.provider ?? '',
      model: r.model ?? '',
      inputTokens: r.input_tokens === null ? null : Number(r.input_tokens),
      outputTokens: r.output_tokens === null ? null : Number(r.output_tokens),
      totalTokens: r.total_tokens === null ? null : Number(r.total_tokens),
      estimatedCostInr: num(r.cost_inr),
      latencyMs: r.latency_ms === null ? null : Number(r.latency_ms),
      status: r.status ?? 'unknown',
      errorCode: r.error_code,
      fallbackUsed: Boolean(r.fallback_used),
    })),
  };
}

export async function getConversationUsage(filters: UsageFilters, limit = 100): Promise<ConversationUsageRow[]> {
  const { clause, params } = buildWhere(filters);
  const capped = Math.min(Math.max(limit, 1), 500);
  const rows = await query<Record<string, string | null>>(
    `SELECT conversation_id,
       COUNT(*)                       AS requests,
       COALESCE(SUM(total_tokens), 0) AS total_tokens,
       COALESCE(SUM(${costInr()}), 0)  AS cost_inr,
       MIN(created_at)                AS first_at,
       MAX(created_at)                AS last_at
     FROM ai_usage ${clause}
     GROUP BY conversation_id
     ORDER BY cost_inr DESC
     LIMIT ${capped}`,
    params,
  );
  return rows.map(r => ({
    conversationId: r.conversation_id ?? 'unknown',
    requests: num(r.requests),
    totalTokens: num(r.total_tokens),
    estimatedCostInr: num(r.cost_inr),
    firstRequestAt: r.first_at ? new Date(r.first_at).toISOString() : null,
    lastRequestAt: r.last_at ? new Date(r.last_at).toISOString() : null,
  }));
}

/** Distinct models and providers present, for populating the filter dropdowns. */
export async function getFilterOptions(): Promise<{ models: string[]; providers: string[] }> {
  const rows = await query<{ provider: string; model: string }>(
    'SELECT DISTINCT provider, model FROM ai_usage ORDER BY provider, model',
  );
  return {
    models: [...new Set(rows.map(r => r.model))],
    providers: [...new Set(rows.map(r => r.provider))],
  };
}
