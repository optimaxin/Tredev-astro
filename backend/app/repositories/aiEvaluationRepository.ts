import { query, queryOne } from '../core/db.ts';

// Read-only access to `ai_evaluations` and `ai_feedback` (migration 046),
// both written by the Python ai-core service. Powers the admin Evaluation
// page next to the Token Meter.
//
// The three signals stay separate everywhere in this file:
//
//   reward_score   an automated estimate, produced by a model
//   feedback       what a real person said
//   tokens / cost  what the answer took to produce (ai_usage)
//
// They are joined on `request_id` so "is the expensive answer the good one"
// can be answered, but they are never averaged into a single "score" — that
// would destroy exactly the comparison the system exists to make.

const COST_INR = `(u.total_cost_usd * COALESCE(u.fx_rate_usd_inr, 88))`;

export interface EvaluationFilters {
  from?: string;
  to?: string;
  userId?: string;
  model?: string;
  feedbackType?: string;
  minReward?: number;
  maxReward?: number;
  traffic?: 'user' | 'internal' | 'all';
}

export interface QualityOverview {
  totalResponses: number;
  evaluatedResponses: number;
  judgedResponses: number;
  avgRewardScore: number | null;
  feedbackCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulRate: number | null;
  avgRating: number | null;
  responsesWithFailures: number;
}

export interface DimensionAverages {
  relevance: number | null;
  grounding: number | null;
  personalization: number | null;
  completeness: number | null;
  humanLikeness: number | null;
  hinglishQuality: number | null;
  whatsappStyle: number | null;
  clarity: number | null;
  conciseness: number | null;
  warmth: number | null;
  safety: number | null;
}

export interface FeedbackReasonRow {
  reason: string;
  count: number;
}

export interface QualityTrendPoint {
  bucket: string;
  responses: number;
  avgRewardScore: number | null;
  helpfulRate: number | null;
  avgTotalTokens: number | null;
  avgCostInr: number | null;
}

export interface QualityVsCostRow {
  provider: string;
  model: string;
  responses: number;
  avgTotalTokens: number | null;
  avgCostInr: number | null;
  avgRewardScore: number | null;
  helpfulRate: number | null;
}

export interface EvaluatedResponseRow {
  requestId: string;
  createdAt: string;
  userId: string | null;
  conversationId: string | null;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostInr: number | null;
  rewardScore: number | null;
  judgeUsed: boolean;
  deterministicFailures: string[];
  feedbackType: string | null;
  rating: number | null;
  feedbackReason: string | null;
}

export interface ResponseDetail extends EvaluatedResponseRow {
  dimensions: DimensionAverages;
  feedbackComment: string | null;
  evaluatorProvider: string | null;
  evaluatorModel: string | null;
  evaluationVersion: string | null;
  latencyMs: number | null;
  status: string | null;
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const nullableNum = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/**
 * WHERE builder. Values are always bound parameters — nothing here is
 * interpolated into SQL. `alias` qualifies the columns because most of these
 * queries join ai_usage, ai_evaluations and ai_feedback, all of which have a
 * created_at.
 */
function buildWhere(
  filters: EvaluationFilters,
  opts: { alias?: string; startIndex?: number } = {},
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = opts.startIndex ?? 1;
  const p = opts.alias ? `${opts.alias}.` : '';

  if (filters.from) { conditions.push(`${p}created_at >= $${i++}`); params.push(filters.from); }
  if (filters.to) { conditions.push(`${p}created_at <= $${i++}`); params.push(filters.to); }
  if (filters.userId) { conditions.push(`${p}user_id = $${i++}`); params.push(filters.userId); }
  if (filters.model) { conditions.push(`u.model = $${i++}`); params.push(filters.model); }
  if (filters.feedbackType) { conditions.push(`f.feedback_type = $${i++}`); params.push(filters.feedbackType); }
  if (filters.minReward !== undefined) { conditions.push(`e.reward_score >= $${i++}`); params.push(filters.minReward); }
  if (filters.maxReward !== undefined) { conditions.push(`e.reward_score <= $${i++}`); params.push(filters.maxReward); }
  // Real user traffic only by default (migration 058).
  const traffic = filters.traffic ?? 'user';
  if (traffic === 'user') conditions.push(`u.traffic_source = 'user'`);
  else if (traffic === 'internal') conditions.push(`u.traffic_source <> 'user'`);

  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

/**
 * The base relation every query below builds on: one row per user-visible
 * answer, with its evaluation and feedback attached when they exist.
 *
 * LEFT JOINs throughout, and the driver is ai_usage rather than
 * ai_evaluations, because a response with no evaluation is still a response.
 * Inner-joining would silently report the helpful-rate of only the sampled
 * subset as if it were the whole picture.
 *
 * role = 'job-main-turn' restricts this to the answer the user actually read.
 * The intent-classification and judge calls in the same turn are real spend
 * (and appear in the Token Meter) but there is nothing to grade about them.
 */
const BASE_RELATION = `
  FROM ai_usage u
  LEFT JOIN ai_evaluations e ON e.request_id = u.request_id
  LEFT JOIN ai_feedback    f ON f.request_id = u.request_id
  WHERE_PLACEHOLDER
`;

function relationWith(clause: string): string {
  const roleFilter = `u.role = 'job-main-turn'`;
  const merged = clause ? `${clause} AND ${roleFilter}` : `WHERE ${roleFilter}`;
  return BASE_RELATION.replace('WHERE_PLACEHOLDER', merged);
}

export async function getQualityOverview(filters: EvaluationFilters): Promise<QualityOverview> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const row = await queryOne<Record<string, string | null>>(
    `SELECT
       COUNT(*)                                              AS total_responses,
       COUNT(e.id)                                           AS evaluated,
       COUNT(*) FILTER (WHERE e.judge_used)                  AS judged,
       AVG(e.reward_score)                                   AS avg_reward,
       COUNT(f.id)                                           AS feedback_count,
       COUNT(*) FILTER (WHERE f.feedback_type = 'helpful')     AS helpful,
       COUNT(*) FILTER (WHERE f.feedback_type = 'not_helpful') AS not_helpful,
       AVG(f.rating)                                         AS avg_rating,
       COUNT(*) FILTER (WHERE COALESCE(array_length(e.deterministic_failures, 1), 0) > 0)
                                                             AS with_failures
     ${relationWith(clause)}`,
    params,
  );

  const helpful = num(row?.helpful);
  const notHelpful = num(row?.not_helpful);
  const rated = helpful + notHelpful;

  return {
    totalResponses: num(row?.total_responses),
    evaluatedResponses: num(row?.evaluated),
    judgedResponses: num(row?.judged),
    avgRewardScore: nullableNum(row?.avg_reward),
    feedbackCount: num(row?.feedback_count),
    helpfulCount: helpful,
    notHelpfulCount: notHelpful,
    // Null rather than 0 when nobody has voted: "no data" and "nobody found
    // it helpful" are very different and must not render identically.
    helpfulRate: rated > 0 ? helpful / rated : null,
    avgRating: nullableNum(row?.avg_rating),
    responsesWithFailures: num(row?.with_failures),
  };
}

export async function getDimensionAverages(filters: EvaluationFilters): Promise<DimensionAverages> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const row = await queryOne<Record<string, string | null>>(
    `SELECT
       AVG(e.relevance_score)        AS relevance,
       AVG(e.grounding_score)        AS grounding,
       AVG(e.personalization_score)  AS personalization,
       AVG(e.completeness_score)     AS completeness,
       AVG(e.human_likeness_score)   AS human_likeness,
       AVG(e.hinglish_quality_score) AS hinglish_quality,
       AVG(e.whatsapp_style_score)   AS whatsapp_style,
       AVG(e.clarity_score)          AS clarity,
       AVG(e.conciseness_score)      AS conciseness,
       AVG(e.warmth_score)           AS warmth,
       AVG(e.safety_score)           AS safety
     ${relationWith(clause)}`,
    params,
  );
  return {
    relevance: nullableNum(row?.relevance),
    grounding: nullableNum(row?.grounding),
    personalization: nullableNum(row?.personalization),
    completeness: nullableNum(row?.completeness),
    humanLikeness: nullableNum(row?.human_likeness),
    hinglishQuality: nullableNum(row?.hinglish_quality),
    whatsappStyle: nullableNum(row?.whatsapp_style),
    clarity: nullableNum(row?.clarity),
    conciseness: nullableNum(row?.conciseness),
    warmth: nullableNum(row?.warmth),
    safety: nullableNum(row?.safety),
  };
}

/** Most common reasons behind 👎, ranked. Drives "what to fix next". */
export async function getFeedbackReasons(filters: EvaluationFilters): Promise<FeedbackReasonRow[]> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const rows = await query<Record<string, string>>(
    `SELECT f.feedback_reason AS reason, COUNT(*) AS count
     ${relationWith(clause)}
       AND f.feedback_reason IS NOT NULL
     GROUP BY f.feedback_reason
     ORDER BY count DESC`,
    params,
  );
  return rows.map(r => ({ reason: r.reason, count: num(r.count) }));
}

export async function getQualityTrend(
  filters: EvaluationFilters,
  granularity: 'day' | 'week' | 'month',
): Promise<QualityTrendPoint[]> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const unit = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day';
  const rows = await query<Record<string, string | null>>(
    `SELECT
       date_trunc('${unit}', u.created_at) AS bucket,
       COUNT(*)                            AS responses,
       AVG(e.reward_score)                 AS avg_reward,
       COUNT(*) FILTER (WHERE f.feedback_type = 'helpful')     AS helpful,
       COUNT(*) FILTER (WHERE f.feedback_type = 'not_helpful') AS not_helpful,
       AVG(u.total_tokens)                 AS avg_tokens,
       AVG(${COST_INR})                    AS avg_cost_inr
     ${relationWith(clause)}
     GROUP BY bucket
     ORDER BY bucket ASC`,
    params,
  );
  return rows.map(r => {
    const helpful = num(r.helpful);
    const rated = helpful + num(r.not_helpful);
    return {
      bucket: new Date(r.bucket as string).toISOString(),
      responses: num(r.responses),
      avgRewardScore: nullableNum(r.avg_reward),
      helpfulRate: rated > 0 ? helpful / rated : null,
      avgTotalTokens: nullableNum(r.avg_tokens),
      avgCostInr: nullableNum(r.avg_cost_inr),
    };
  });
}

/**
 * Quality against cost, per model. Returned as plain facts, deliberately
 * unranked — "best" depends on a trade-off only a human should make.
 */
export async function getQualityVsCost(filters: EvaluationFilters): Promise<QualityVsCostRow[]> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const rows = await query<Record<string, string | null>>(
    `SELECT
       u.provider, u.model,
       COUNT(*)            AS responses,
       AVG(u.total_tokens) AS avg_tokens,
       AVG(${COST_INR})    AS avg_cost_inr,
       AVG(e.reward_score) AS avg_reward,
       COUNT(*) FILTER (WHERE f.feedback_type = 'helpful')     AS helpful,
       COUNT(*) FILTER (WHERE f.feedback_type = 'not_helpful') AS not_helpful
     ${relationWith(clause)}
     GROUP BY u.provider, u.model
     ORDER BY responses DESC`,
    params,
  );
  return rows.map(r => {
    const helpful = num(r.helpful);
    const rated = helpful + num(r.not_helpful);
    return {
      provider: r.provider ?? 'unknown',
      model: r.model ?? 'unknown',
      responses: num(r.responses),
      avgTotalTokens: nullableNum(r.avg_tokens),
      avgCostInr: nullableNum(r.avg_cost_inr),
      avgRewardScore: nullableNum(r.avg_reward),
      helpfulRate: rated > 0 ? helpful / rated : null,
    };
  });
}

export async function listEvaluatedResponses(
  filters: EvaluationFilters,
  opts: { limit?: number; offset?: number } = {},
): Promise<{ rows: EvaluatedResponseRow[]; total: number }> {
  const { clause, params } = buildWhere(filters, { alias: 'u' });
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);

  const countRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count ${relationWith(clause)}`, params,
  );

  const rows = await query<Record<string, any>>(
    `SELECT
       u.request_id, u.created_at, u.user_id, u.conversation_id,
       u.provider, u.model, u.input_tokens, u.output_tokens, u.total_tokens,
       ${COST_INR} AS cost_inr,
       e.reward_score, e.judge_used, e.deterministic_failures,
       f.feedback_type, f.rating, f.feedback_reason
     ${relationWith(clause)}
     ORDER BY u.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return {
    total: num(countRow?.count),
    rows: rows.map(r => ({
      requestId: r.request_id,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
      userId: r.user_id,
      conversationId: r.conversation_id,
      provider: r.provider,
      model: r.model,
      inputTokens: nullableNum(r.input_tokens),
      outputTokens: nullableNum(r.output_tokens),
      totalTokens: nullableNum(r.total_tokens),
      estimatedCostInr: nullableNum(r.cost_inr),
      rewardScore: nullableNum(r.reward_score),
      judgeUsed: Boolean(r.judge_used),
      deterministicFailures: r.deterministic_failures ?? [],
      feedbackType: r.feedback_type,
      rating: nullableNum(r.rating),
      feedbackReason: r.feedback_reason,
    })),
  };
}

/** Everything known about one response, for the detail drawer. */
export async function getResponseDetail(requestId: string): Promise<ResponseDetail | null> {
  const r = await queryOne<Record<string, any>>(
    `SELECT
       u.request_id, u.created_at, u.user_id, u.conversation_id,
       u.provider, u.model, u.input_tokens, u.output_tokens, u.total_tokens,
       ${COST_INR} AS cost_inr, u.latency_ms, u.status,
       e.reward_score, e.judge_used, e.deterministic_failures,
       e.relevance_score, e.grounding_score, e.personalization_score, e.completeness_score,
       e.human_likeness_score, e.hinglish_quality_score, e.whatsapp_style_score,
       e.clarity_score, e.conciseness_score, e.warmth_score, e.safety_score,
       e.evaluator_provider, e.evaluator_model, e.evaluation_version,
       f.feedback_type, f.rating, f.feedback_reason, f.feedback_comment
     FROM ai_usage u
     LEFT JOIN ai_evaluations e ON e.request_id = u.request_id
     LEFT JOIN ai_feedback    f ON f.request_id = u.request_id
     WHERE u.request_id = $1 AND u.role = 'job-main-turn'
     LIMIT 1`,
    [requestId],
  );
  if (!r) return null;

  return {
    requestId: r.request_id,
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : '',
    userId: r.user_id,
    conversationId: r.conversation_id,
    provider: r.provider,
    model: r.model,
    inputTokens: nullableNum(r.input_tokens),
    outputTokens: nullableNum(r.output_tokens),
    totalTokens: nullableNum(r.total_tokens),
    estimatedCostInr: nullableNum(r.cost_inr),
    latencyMs: nullableNum(r.latency_ms),
    status: r.status,
    rewardScore: nullableNum(r.reward_score),
    judgeUsed: Boolean(r.judge_used),
    deterministicFailures: r.deterministic_failures ?? [],
    feedbackType: r.feedback_type,
    rating: nullableNum(r.rating),
    feedbackReason: r.feedback_reason,
    feedbackComment: r.feedback_comment,
    evaluatorProvider: r.evaluator_provider,
    evaluatorModel: r.evaluator_model,
    evaluationVersion: r.evaluation_version,
    dimensions: {
      relevance: nullableNum(r.relevance_score),
      grounding: nullableNum(r.grounding_score),
      personalization: nullableNum(r.personalization_score),
      completeness: nullableNum(r.completeness_score),
      humanLikeness: nullableNum(r.human_likeness_score),
      hinglishQuality: nullableNum(r.hinglish_quality_score),
      whatsappStyle: nullableNum(r.whatsapp_style_score),
      clarity: nullableNum(r.clarity_score),
      conciseness: nullableNum(r.conciseness_score),
      warmth: nullableNum(r.warmth_score),
      safety: nullableNum(r.safety_score),
    },
  };
}
