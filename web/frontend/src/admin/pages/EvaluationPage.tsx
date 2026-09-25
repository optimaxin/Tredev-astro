import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService, AdminApiError } from '../../services/adminService';
import type {
  AiDimensionAverages,
  AiEvaluatedResponse,
  AiEvaluationQuery,
  AiFeedbackReason,
  AiQualityOverview,
  AiQualityTrendPoint,
  AiQualityVsCostRow,
  AiResponseDetail,
  AiUsageGranularity,
} from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatCard, StatusBadge, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

// AI Evaluation. Sits next to the Token Meter and answers the question that
// page cannot: is the spend buying good answers?
//
// Three signals are shown side by side and never merged into one number:
//
//   Reward score   an automated estimate, produced by a model
//   User feedback  what a real person actually said
//   Tokens / cost  what the answer took to produce
//
// The reward score is labelled as an estimate throughout, because it is one.
// A model grading a model is useful for spotting trends and outliers; it is
// not ground truth, and user feedback is the signal that matters.

type RangeKey = '7d' | '30d' | '90d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

type TabKey = 'dimensions' | 'responses' | 'cost';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dimensions', label: 'Quality breakdown' },
  { key: 'responses', label: 'Responses' },
  { key: 'cost', label: 'Quality vs cost' },
];

// Display order groups content dimensions before conversational ones, which
// is how someone reading the page thinks about them.
const DIMENSION_LABELS: { key: keyof AiDimensionAverages; label: string; group: string }[] = [
  { key: 'relevance', label: 'Relevance', group: 'Content' },
  { key: 'grounding', label: 'Context grounding', group: 'Content' },
  { key: 'personalization', label: 'Personalization', group: 'Content' },
  { key: 'completeness', label: 'Completeness', group: 'Content' },
  { key: 'humanLikeness', label: 'Human-likeness', group: 'Conversational' },
  { key: 'hinglishQuality', label: 'Hinglish quality', group: 'Conversational' },
  { key: 'whatsappStyle', label: 'WhatsApp style', group: 'Conversational' },
  { key: 'clarity', label: 'Clarity', group: 'Conversational' },
  { key: 'conciseness', label: 'Conciseness', group: 'Conversational' },
  { key: 'warmth', label: 'Warmth', group: 'Conversational' },
  { key: 'safety', label: 'Safety (gate, not weighted)', group: 'Safety' },
];

const REASON_LABELS: Record<string, string> = {
  incorrect_information: 'Incorrect information',
  too_generic: 'Too generic',
  too_long: 'Too long',
  did_not_answer: "Didn't answer the question",
  not_personalized: 'Not personalized',
  poor_hinglish: 'Poor Hinglish',
  too_formal: 'Too formal',
  not_conversational: 'Not conversational',
  wrong_context_usage: 'Wrong chart/context usage',
  other: 'Other',
};

/** Scores are 0..1. Null means not evaluated, which is not the same as zero. */
const score = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : value.toFixed(2);

const percent = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;

const inr = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  if (!value) return '₹0';
  return value < 1 ? `₹${value.toFixed(4)}` : `₹${value.toFixed(2)}`;
};

const tokens = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : Math.round(value).toLocaleString('en-IN');

export default function EvaluationPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [granularity, setGranularity] = useState<AiUsageGranularity>('day');
  const [feedbackFilter, setFeedbackFilter] = useState<'' | 'helpful' | 'not_helpful'>('');
  const [tab, setTab] = useState<TabKey>('dimensions');

  const [overview, setOverview] = useState<AiQualityOverview | null>(null);
  const [dimensions, setDimensions] = useState<AiDimensionAverages | null>(null);
  const [reasons, setReasons] = useState<AiFeedbackReason[]>([]);
  const [trend, setTrend] = useState<AiQualityTrendPoint[]>([]);
  const [vsCost, setVsCost] = useState<AiQualityVsCostRow[]>([]);
  const [responses, setResponses] = useState<AiEvaluatedResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AiResponseDetail | null>(null);

  const query = useMemo<AiEvaluationQuery>(() => {
    const days = RANGES.find(r => r.key === range)?.days ?? null;
    const q: AiEvaluationQuery = {};
    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      q.from = from.toISOString();
    } else {
      // The backend defaults to 30 days when `from` is absent, so "All time"
      // has to say so rather than simply omitting it.
      q.from = new Date(0).toISOString();
    }
    if (feedbackFilter) q.feedbackType = feedbackFilter;
    return q;
  }, [range, feedbackFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [o, t, c, r] = await Promise.all([
        adminService.aiEvaluationOverview(query),
        adminService.aiEvaluationTrend({ ...query, granularity }),
        adminService.aiEvaluationQualityVsCost(query),
        adminService.aiEvaluationResponses({ ...query, limit: 100 }),
      ]);
      setOverview(o.overview);
      setDimensions(o.dimensions);
      setReasons(o.feedbackReasons);
      setTrend(t);
      setVsCost(c);
      setResponses(r.rows);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load AI evaluation data.');
    } finally {
      setLoading(false);
    }
  }, [query, granularity]);

  useEffect(() => { void load(); }, [load]);

  const openResponse = async (requestId: string) => {
    try {
      setDetail(await adminService.aiEvaluationResponseDetail(requestId));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load that response.');
    }
  };

  const maxReason = Math.max(1, ...reasons.map(r => r.count));

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>AI Evaluation</div>
      </div>

      <div className={styles.toolbar}>
        <select className={styles.select} value={range}
                onChange={e => setRange(e.target.value as RangeKey)} aria-label="Date range">
          {RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <select className={styles.select} value={granularity}
                onChange={e => setGranularity(e.target.value as AiUsageGranularity)} aria-label="Trend granularity">
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
        <select className={styles.select} value={feedbackFilter}
                onChange={e => setFeedbackFilter(e.target.value as '' | 'helpful' | 'not_helpful')}
                aria-label="Feedback">
          <option value="">All feedback</option>
          <option value="helpful">👍 Helpful only</option>
          <option value="not_helpful">👎 Not helpful only</option>
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && !overview ? (
        <EmptyState title="Loading…" description="Fetching evaluation data." />
      ) : !overview || overview.totalResponses === 0 ? (
        <EmptyState
          title="No AI responses yet"
          description="Quality data appears here once the assistant answers a question."
        />
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <StatCard icon="◈" label="AI responses" value={overview.totalResponses.toLocaleString('en-IN')} />
            <StatCard icon="✓" label="Evaluated" value={`${overview.evaluatedResponses.toLocaleString('en-IN')} (${overview.judgedResponses} judged)`} />
            <StatCard icon="★" label="Avg reward (est.)" value={score(overview.avgRewardScore)} />
            <StatCard icon="👍" label="Helpful rate" value={percent(overview.helpfulRate)} />
            <StatCard icon="💬" label="Feedback received" value={overview.feedbackCount.toLocaleString('en-IN')} />
            <StatCard icon="☆" label="Avg rating" value={overview.avgRating === null ? '—' : overview.avgRating.toFixed(1)} />
            <StatCard icon="⚠" label="With check failures" value={overview.responsesWithFailures.toLocaleString('en-IN')} />
          </div>

          {/* Saying this plainly matters. A model grading a model is useful
              for trends and outliers, and is not the same as a person saying
              the answer helped. */}
          <div className={styles.noteBanner}>
            <strong>Reward score is an automated estimate</strong>, produced by an LLM judge —
            useful for spotting trends and outliers, not ground truth. User feedback
            ({overview.helpfulCount} 👍 / {overview.notHelpfulCount} 👎 from {overview.feedbackCount} vote(s))
            is the real preference signal and is tracked separately.
            {overview.evaluatedResponses < overview.totalResponses && (
              <> Only {overview.evaluatedResponses} of {overview.totalResponses} responses were evaluated —
              the judge is sampled (EVALUATION_SAMPLE_RATE).</>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Quality trend</div>
            {trend.length === 0 ? (
              <EmptyState title="No data in this range" description="Try a wider date range." />
            ) : (
              <DataTable
                columns={[
                  { key: 'date', label: 'Date', render: (p: AiQualityTrendPoint) => new Date(p.bucket).toLocaleDateString('en-IN') },
                  { key: 'responses', label: 'Responses', render: (p: AiQualityTrendPoint) => p.responses },
                  { key: 'reward', label: 'Avg reward (est.)', render: (p: AiQualityTrendPoint) => score(p.avgRewardScore) },
                  { key: 'helpful', label: 'Helpful rate', render: (p: AiQualityTrendPoint) => percent(p.helpfulRate) },
                  { key: 'tokens', label: 'Avg tokens', render: (p: AiQualityTrendPoint) => tokens(p.avgTotalTokens) },
                  { key: 'cost', label: 'Avg cost', render: (p: AiQualityTrendPoint) => inr(p.avgCostInr) },
                ]}
                rows={trend}
                keyField="bucket"
                emptyState={<EmptyState title="No data" description="—" />}
              />
            )}
          </div>

          <div className={styles.toolbar}>
            {TABS.map(item => (
              <button
                key={item.key}
                className={`${styles.tabButton} ${tab === item.key ? styles.tabButtonActive : ''}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'dimensions' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Average scores by dimension (0–1)</div>
                {DIMENSION_LABELS.map(d => {
                  const value = dimensions?.[d.key] ?? null;
                  return (
                    <div key={d.key} className={styles.dimensionRow}>
                      <span className={styles.dimensionLabel}>{d.label}</span>
                      <span className={styles.dimensionBarTrack}>
                        <span
                          className={styles.dimensionBarFill}
                          style={{ width: `${(value ?? 0) * 100}%` }}
                        />
                      </span>
                      <span className={styles.dimensionValue}>{score(value)}</span>
                    </div>
                  );
                })}
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Why users said 👎</div>
                {reasons.length === 0 ? (
                  <EmptyState title="No reasons given" description="Users can optionally pick a reason after 👎." />
                ) : (
                  reasons.map(r => (
                    <div key={r.reason} className={styles.dimensionRow}>
                      <span className={styles.dimensionLabel}>{REASON_LABELS[r.reason] ?? r.reason}</span>
                      <span className={styles.dimensionBarTrack}>
                        <span className={styles.dimensionBarNegative} style={{ width: `${(r.count / maxReason) * 100}%` }} />
                      </span>
                      <span className={styles.dimensionValue}>{r.count}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'responses' && (
            <DataTable
              columns={[
                { key: 'when', label: 'When', render: (r: AiEvaluatedResponse) => formatDateTime(r.createdAt) },
                {
                  key: 'req',
                  label: 'Response',
                  render: (r: AiEvaluatedResponse) => (
                    <button className={styles.linkButton} onClick={() => void openResponse(r.requestId)}>
                      {r.requestId.slice(0, 12)}…
                    </button>
                  ),
                },
                { key: 'model', label: 'Model', render: (r: AiEvaluatedResponse) => r.model ?? '—' },
                {
                  key: 'reward',
                  label: 'Reward (est.)',
                  render: (r: AiEvaluatedResponse) => (r.judgeUsed ? score(r.rewardScore) : `${score(r.rewardScore)} *`),
                },
                {
                  key: 'feedback',
                  label: 'User',
                  render: (r: AiEvaluatedResponse) =>
                    r.feedbackType === 'helpful' ? '👍'
                      : r.feedbackType === 'not_helpful' ? `👎 ${r.feedbackReason ? `(${REASON_LABELS[r.feedbackReason] ?? r.feedbackReason})` : ''}`
                      : '—',
                },
                { key: 'tokens', label: 'Tokens', render: (r: AiEvaluatedResponse) => tokens(r.totalTokens) },
                { key: 'cost', label: 'Cost', render: (r: AiEvaluatedResponse) => inr(r.estimatedCostInr) },
                {
                  key: 'checks',
                  label: 'Checks',
                  render: (r: AiEvaluatedResponse) =>
                    r.deterministicFailures.length === 0
                      ? <StatusBadge status="COMPLETED" label="pass" />
                      : <StatusBadge status="CANCELLED" label={r.deterministicFailures.join(', ')} />,
                },
              ]}
              rows={responses}
              keyField="requestId"
              emptyState={<EmptyState title="No responses" description="Nothing in this range." />}
            />
          )}

          {tab === 'cost' && (
            <>
              {/* Facts only, unranked. Whether a higher reward justifies a
                  higher cost is a judgement for a person, not this table. */}
              <div className={styles.noteBanner}>
                Models are listed by volume, not ranked. Whether a higher reward justifies a
                higher cost is a trade-off for you to make.
              </div>
              <DataTable
                columns={[
                  { key: 'provider', label: 'Provider', render: (r: AiQualityVsCostRow) => r.provider },
                  { key: 'model', label: 'Model', render: (r: AiQualityVsCostRow) => r.model },
                  { key: 'responses', label: 'Responses', render: (r: AiQualityVsCostRow) => r.responses },
                  { key: 'tokens', label: 'Avg tokens', render: (r: AiQualityVsCostRow) => tokens(r.avgTotalTokens) },
                  { key: 'cost', label: 'Avg cost', render: (r: AiQualityVsCostRow) => inr(r.avgCostInr) },
                  { key: 'reward', label: 'Avg reward (est.)', render: (r: AiQualityVsCostRow) => score(r.avgRewardScore) },
                  { key: 'helpful', label: 'Helpful rate', render: (r: AiQualityVsCostRow) => percent(r.helpfulRate) },
                ]}
                rows={vsCost}
                keyField="model"
                emptyState={<EmptyState title="No model data" description="Nothing in this range." />}
              />
            </>
          )}
        </>
      )}

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="AI response">
        {detail && (
          <div>
            <div className={styles.drawerMeta}>
              {formatDateTime(detail.createdAt)} · {detail.provider}/{detail.model}
              <br />request {detail.requestId}
              <br />user {detail.userId ?? '—'} · conversation {detail.conversationId ?? '—'}
            </div>

            <div className={styles.kpiGrid}>
              <StatCard icon="★" label="Reward (est.)" value={score(detail.rewardScore)} />
              <StatCard icon="Σ" label="Total tokens" value={tokens(detail.totalTokens)} />
              <StatCard icon="₹" label="Est. cost" value={inr(detail.estimatedCostInr)} />
              <StatCard icon="⏱" label="Latency" value={detail.latencyMs === null ? '—' : `${detail.latencyMs} ms`} />
            </div>

            <div className={styles.sectionTitle}>User feedback</div>
            <div className={styles.noteBanner}>
              {detail.feedbackType
                ? <>
                    {detail.feedbackType === 'helpful' ? '👍 Helpful' : '👎 Not helpful'}
                    {detail.feedbackReason && <> · {REASON_LABELS[detail.feedbackReason] ?? detail.feedbackReason}</>}
                    {detail.rating !== null && <> · rated {detail.rating}/5</>}
                    {detail.feedbackComment && <><br />“{detail.feedbackComment}”</>}
                  </>
                : 'No feedback given for this response.'}
            </div>

            <div className={styles.sectionTitle}>
              Automated evaluation {detail.judgeUsed ? '' : '(deterministic checks only — not sampled for the judge)'}
            </div>
            {DIMENSION_LABELS.map(d => (
              <div key={d.key} className={styles.dimensionRow}>
                <span className={styles.dimensionLabel}>{d.label}</span>
                <span className={styles.dimensionBarTrack}>
                  <span className={styles.dimensionBarFill} style={{ width: `${(detail.dimensions[d.key] ?? 0) * 100}%` }} />
                </span>
                <span className={styles.dimensionValue}>{score(detail.dimensions[d.key])}</span>
              </div>
            ))}

            {detail.deterministicFailures.length > 0 && (
              <div className={styles.errorBanner}>
                Failed checks: {detail.deterministicFailures.join(', ')}
              </div>
            )}

            <div className={styles.drawerMeta}>
              Evaluator: {detail.evaluatorProvider ?? '—'}/{detail.evaluatorModel ?? '—'} ·
              rubric {detail.evaluationVersion ?? '—'}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
