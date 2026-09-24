import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService, AdminApiError } from '../../services/adminService';
import type {
  AiUsageConversationRow,
  AiUsageGranularity,
  AiUsageModelRow,
  AiUsageOverview,
  AiUsageQuery,
  AiUsageRequestRow,
  AiUsageTimePoint,
  AiUsageUserDetail,
  AiUsageUserRow,
} from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatCard, StatusBadge, SearchInput, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

// AI Token Meter. Reads `ai_usage`, which the Python ai-core service writes
// one row per LLM call (see ai-core/app/llm/usage_store.py).
//
// Costs arrive from the backend already in INR — the USD the provider bills
// is converted using the FX rate snapshotted onto each row, so no rate and no
// conversion logic lives in the browser.
//
// Everything is labelled "Estimated" because the current provider (Gemini,
// free tier during testing) reports no actual charge. When a provider does
// report one, `actualCostUsd` becomes non-null and the overview says so
// rather than continuing to imply the computed figure was billed.

type RangeKey = '7d' | '30d' | '90d' | 'all';

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
];

type TabKey = 'models' | 'users' | 'requests' | 'conversations';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'models', label: 'Models' },
  { key: 'users', label: 'Users' },
  { key: 'requests', label: 'Request logs' },
  { key: 'conversations', label: 'Conversations' },
];

/** Rupees. Sub-paisa amounts are common on a flash model, so small values
 *  keep four decimals rather than rounding to a misleading ₹0.00. */
function inr(value: number): string {
  if (!value) return '₹0';
  if (value < 1) return `₹${value.toFixed(4)}`;
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactTokens(value: number | null): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export default function TokenMeterPage() {
  const [range, setRange] = useState<RangeKey>('30d');
  const [granularity, setGranularity] = useState<AiUsageGranularity>('day');
  const [tab, setTab] = useState<TabKey>('models');

  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'success' | 'failed'>('');
  const [userSearch, setUserSearch] = useState('');

  const [overview, setOverview] = useState<AiUsageOverview | null>(null);
  const [series, setSeries] = useState<AiUsageTimePoint[]>([]);
  const [models, setModels] = useState<AiUsageModelRow[]>([]);
  const [users, setUsers] = useState<AiUsageUserRow[]>([]);
  const [requests, setRequests] = useState<AiUsageRequestRow[]>([]);
  const [conversations, setConversations] = useState<AiUsageConversationRow[]>([]);
  const [modelOptions, setModelOptions] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<AiUsageUserDetail | null>(null);

  const query = useMemo<AiUsageQuery>(() => {
    const days = RANGES.find(r => r.key === range)?.days ?? null;
    const q: AiUsageQuery = {};
    if (days !== null) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      q.from = from.toISOString();
    } else {
      // The backend defaults to 30 days when `from` is absent, so "All time"
      // has to say so explicitly rather than simply omitting it.
      q.from = new Date(0).toISOString();
    }
    if (modelFilter) q.model = modelFilter;
    if (statusFilter) q.status = statusFilter;
    return q;
  }, [range, modelFilter, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [o, s, m, u, r, c] = await Promise.all([
        adminService.aiUsageOverview(query),
        adminService.aiUsageTimeseries({ ...query, granularity }),
        adminService.aiUsageModels(query),
        adminService.aiUsageUsers({ ...query, search: userSearch || undefined }),
        adminService.aiUsageRequests({ ...query, limit: 100 }),
        adminService.aiUsageConversations(query),
      ]);
      setOverview(o); setSeries(s); setModels(m);
      setUsers(u); setRequests(r.rows); setConversations(c);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load AI usage.');
    } finally {
      setLoading(false);
    }
  }, [query, granularity, userSearch]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    adminService.aiUsageFilters()
      .then(f => setModelOptions(f.models))
      .catch(() => { /* the dropdown simply stays empty */ });
  }, []);

  const openUser = async (userId: string) => {
    try {
      setDetail(await adminService.aiUsageUserDetail(userId, query));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not load that user.');
    }
  };

  const peakTokens = Math.max(1, ...series.map(p => p.totalTokens));

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>AI Token Meter</div>
      </div>

      <div className={styles.toolbar}>
        <select
          className={styles.select}
          value={range}
          onChange={e => setRange(e.target.value as RangeKey)}
          aria-label="Date range"
        >
          {RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>

        <select
          className={styles.select}
          value={granularity}
          onChange={e => setGranularity(e.target.value as AiUsageGranularity)}
          aria-label="Chart granularity"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>

        <select
          className={styles.select}
          value={modelFilter}
          onChange={e => setModelFilter(e.target.value)}
          aria-label="Model"
        >
          <option value="">All models</option>
          {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          className={styles.select}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as '' | 'success' | 'failed')}
          aria-label="Status"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && !overview ? (
        <EmptyState title="Loading…" description="Fetching AI usage." />
      ) : !overview || overview.totalRequests === 0 ? (
        <EmptyState
          title="No AI usage yet"
          description="Usage appears here once the assistant answers a question. Every LLM call is recorded individually."
        />
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <StatCard icon="◈" label="Total requests" value={overview.totalRequests.toLocaleString('en-IN')} />
            <StatCard icon="↓" label="Input tokens" value={compactTokens(overview.inputTokens)} />
            <StatCard icon="↑" label="Output tokens" value={compactTokens(overview.outputTokens)} />
            <StatCard icon="Σ" label="Total tokens" value={compactTokens(overview.totalTokens)} />
            <StatCard icon="₹" label="Estimated cost" value={inr(overview.estimatedCostInr)} />
            <StatCard icon="⌀" label="Avg cost / request" value={inr(overview.avgCostPerRequestInr)} />
            <StatCard icon="≈" label="Avg tokens / request" value={Math.round(overview.avgTokensPerRequest).toLocaleString('en-IN')} />
            <StatCard icon="☰" label="Active AI users" value={overview.activeUsers.toLocaleString('en-IN')} />
          </div>

          {/* Saying this plainly matters: on the Gemini free tier nothing is
              actually billed, and a figure labelled only "cost" would read as
              money already spent. */}
          <div className={styles.noteBanner}>
            {overview.actualCostUsd === null
              ? `Costs are estimates from published model pricing (converted to INR). The current provider reports no actual billing amount — on a free tier nothing is charged. ${overview.failedRequests} failed request(s) in this range.`
              : `Provider-reported actual cost: $${overview.actualCostUsd.toFixed(6)}. Other figures are estimates from published pricing.`}
          </div>

          {/* A dependency-free bar chart. The admin panel ships no charting
              library, and adding one for two series would be a heavier change
              than this screen justifies. */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Token usage over time</div>
            {series.length === 0 ? (
              <EmptyState title="No data in this range" description="Try a wider date range." />
            ) : (
              <div className={styles.miniChart}>
                {series.map(point => {
                  const inputShare = point.totalTokens ? (point.inputTokens / point.totalTokens) * 100 : 0;
                  return (
                    <div
                      key={point.bucket}
                      className={styles.miniChartCol}
                      title={`${new Date(point.bucket).toLocaleDateString('en-IN')}
Requests: ${point.requests}
Input: ${point.inputTokens.toLocaleString('en-IN')}
Output: ${point.outputTokens.toLocaleString('en-IN')}
Total: ${point.totalTokens.toLocaleString('en-IN')}
Est. cost: ${inr(point.estimatedCostInr)}`}
                    >
                      <div
                        className={styles.miniChartBar}
                        style={{ height: `${Math.max(3, (point.totalTokens / peakTokens) * 100)}%` }}
                      >
                        <div className={styles.miniChartInput} style={{ height: `${inputShare}%` }} />
                      </div>
                      <span className={styles.miniChartLabel}>
                        {new Date(point.bucket).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className={styles.chartLegend}>
              <span><i className={styles.swatchInput} /> Input tokens</span>
              <span><i className={styles.swatchOutput} /> Output tokens</span>
            </div>
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

          {tab === 'models' && (
            <DataTable
              columns={[
                { key: 'provider', label: 'Provider', render: (r: AiUsageModelRow) => r.provider },
                { key: 'model', label: 'Model', render: (r: AiUsageModelRow) => r.model },
                { key: 'requests', label: 'Requests', render: (r: AiUsageModelRow) => r.requests.toLocaleString('en-IN') },
                { key: 'input', label: 'Input', render: (r: AiUsageModelRow) => compactTokens(r.inputTokens) },
                { key: 'output', label: 'Output', render: (r: AiUsageModelRow) => compactTokens(r.outputTokens) },
                { key: 'total', label: 'Total tokens', render: (r: AiUsageModelRow) => compactTokens(r.totalTokens) },
                { key: 'cost', label: 'Est. cost', render: (r: AiUsageModelRow) => inr(r.estimatedCostInr) },
              ]}
              rows={models}
              keyField="model"
              emptyState={<EmptyState title="No model usage" description="Nothing recorded in this range." />}
            />
          )}

          {tab === 'users' && (
            <>
              <div className={styles.toolbar}>
                <SearchInput value={userSearch} onChange={setUserSearch} placeholder="Search user, name or email" />
              </div>
              <DataTable
                columns={[
                  {
                    key: 'user',
                    label: 'User',
                    render: (r: AiUsageUserRow) => (
                      <button className={styles.linkButton} onClick={() => void openUser(r.userId)}>
                        {r.userName || r.userEmail || r.userId}
                      </button>
                    ),
                  },
                  { key: 'requests', label: 'Requests', render: (r: AiUsageUserRow) => r.requests.toLocaleString('en-IN') },
                  { key: 'input', label: 'Input', render: (r: AiUsageUserRow) => compactTokens(r.inputTokens) },
                  { key: 'output', label: 'Output', render: (r: AiUsageUserRow) => compactTokens(r.outputTokens) },
                  { key: 'total', label: 'Total tokens', render: (r: AiUsageUserRow) => compactTokens(r.totalTokens) },
                  { key: 'cost', label: 'Est. cost', render: (r: AiUsageUserRow) => inr(r.estimatedCostInr) },
                  { key: 'last', label: 'Last request', render: (r: AiUsageUserRow) => (r.lastRequestAt ? formatDateTime(r.lastRequestAt) : '—') },
                ]}
                rows={users}
                keyField="userId"
                emptyState={<EmptyState title="No users" description="No AI usage attributed in this range." />}
              />
            </>
          )}

          {tab === 'requests' && (
            <DataTable
              columns={[
                { key: 'ts', label: 'Timestamp', render: (r: AiUsageRequestRow) => formatDateTime(r.createdAt) },
                { key: 'user', label: 'User', render: (r: AiUsageRequestRow) => r.userId ?? '—' },
                { key: 'role', label: 'Job', render: (r: AiUsageRequestRow) => r.role.replace(/^job-/, '') },
                { key: 'model', label: 'Model', render: (r: AiUsageRequestRow) => r.model },
                { key: 'input', label: 'In', render: (r: AiUsageRequestRow) => compactTokens(r.inputTokens) },
                { key: 'output', label: 'Out', render: (r: AiUsageRequestRow) => compactTokens(r.outputTokens) },
                { key: 'total', label: 'Total', render: (r: AiUsageRequestRow) => compactTokens(r.totalTokens) },
                { key: 'cost', label: 'Est. cost', render: (r: AiUsageRequestRow) => inr(r.estimatedCostInr) },
                { key: 'latency', label: 'Latency', render: (r: AiUsageRequestRow) => (r.latencyMs === null ? '—' : `${r.latencyMs} ms`) },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r: AiUsageRequestRow) => (
                    <StatusBadge
                      status={r.status === 'success' ? 'COMPLETED' : 'CANCELLED'}
                      label={r.status === 'success' ? (r.fallbackUsed ? 'fallback' : 'success') : (r.errorCode || 'failed')}
                    />
                  ),
                },
              ]}
              rows={requests}
              keyField="id"
              emptyState={<EmptyState title="No requests" description="Nothing recorded in this range." />}
            />
          )}

          {tab === 'conversations' && (
            <DataTable
              columns={[
                { key: 'conv', label: 'Conversation', render: (r: AiUsageConversationRow) => r.conversationId },
                { key: 'requests', label: 'Requests', render: (r: AiUsageConversationRow) => r.requests.toLocaleString('en-IN') },
                { key: 'total', label: 'Total tokens', render: (r: AiUsageConversationRow) => compactTokens(r.totalTokens) },
                { key: 'cost', label: 'Est. cost', render: (r: AiUsageConversationRow) => inr(r.estimatedCostInr) },
                { key: 'first', label: 'Started', render: (r: AiUsageConversationRow) => (r.firstRequestAt ? formatDateTime(r.firstRequestAt) : '—') },
                { key: 'last', label: 'Last activity', render: (r: AiUsageConversationRow) => (r.lastRequestAt ? formatDateTime(r.lastRequestAt) : '—') },
              ]}
              rows={conversations}
              keyField="conversationId"
              emptyState={<EmptyState title="No conversations" description="Nothing recorded in this range." />}
            />
          )}
        </>
      )}

      <Drawer open={!!detail} onClose={() => setDetail(null)} title="AI usage — user">
        {detail && (
          <div>
            <div className={styles.drawerMeta}>{detail.userId}</div>
            <div className={styles.kpiGrid}>
              <StatCard icon="◈" label="Requests" value={detail.overview.totalRequests.toLocaleString('en-IN')} />
              <StatCard icon="↓" label="Input" value={compactTokens(detail.overview.inputTokens)} />
              <StatCard icon="↑" label="Output" value={compactTokens(detail.overview.outputTokens)} />
              <StatCard icon="Σ" label="Total tokens" value={compactTokens(detail.overview.totalTokens)} />
              <StatCard icon="₹" label="Estimated cost" value={inr(detail.overview.estimatedCostInr)} />
            </div>

            <div className={styles.sectionTitle}>Models used</div>
            <DataTable
              columns={[
                { key: 'model', label: 'Model', render: (r: AiUsageModelRow) => r.model },
                { key: 'requests', label: 'Requests', render: (r: AiUsageModelRow) => r.requests },
                { key: 'total', label: 'Tokens', render: (r: AiUsageModelRow) => compactTokens(r.totalTokens) },
                { key: 'cost', label: 'Est. cost', render: (r: AiUsageModelRow) => inr(r.estimatedCostInr) },
              ]}
              rows={detail.models}
              keyField="model"
              emptyState={<EmptyState title="No models" description="—" />}
            />

            <div className={styles.sectionTitle}>Recent requests</div>
            <DataTable
              columns={[
                { key: 'ts', label: 'When', render: (r: AiUsageRequestRow) => formatDateTime(r.createdAt) },
                { key: 'model', label: 'Model', render: (r: AiUsageRequestRow) => r.model },
                { key: 'total', label: 'Tokens', render: (r: AiUsageRequestRow) => compactTokens(r.totalTokens) },
                { key: 'cost', label: 'Est. cost', render: (r: AiUsageRequestRow) => inr(r.estimatedCostInr) },
                {
                  key: 'status',
                  label: 'Status',
                  render: (r: AiUsageRequestRow) => (
                    <StatusBadge
                      status={r.status === 'success' ? 'COMPLETED' : 'CANCELLED'}
                      label={r.status === 'success' ? 'success' : (r.errorCode || 'failed')}
                    />
                  ),
                },
              ]}
              rows={detail.recentRequests}
              keyField="id"
              emptyState={<EmptyState title="No requests" description="—" />}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
