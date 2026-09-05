import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useRealtime } from '../../../realtime/RealtimeContext';
import { astrologerService, AstrologerApiError, type BoostStatus } from '../../../services/astrologerService';
import { consultationService } from '../../../services/consultationService';
import type { MyConsultationAsAstrologer } from '../../../services/consultationService';
import ChatWindow from '../../../components/ChatWindow/ChatWindow';
import CallWindow from '../../../components/CallWindow/CallWindow';
import {
  DAY_MS, TYPE_ICON, isSameDay, formatTime, formatDateShort,
  EmptyState, KpiCard, MiniBarChart, Panel, ConfirmModal,
} from './shared';
import { useDashboardNav } from './shared';
import styles from './sections.module.css';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function LiveStatusCard() {
  const { astrologerSync, goOnline, goOffline, endActiveConsultation, connected } = useRealtime();
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState('');

  const active = astrologerSync?.activeConsultation;
  const isOnline = astrologerSync?.intent === 'ONLINE';
  const queueCount = astrologerSync?.queue.length || 0;
  const nextInQueue = astrologerSync?.queue[0];

  useEffect(() => {
    if (!active?.startedAt) { setElapsed(''); return; }
    const tick = () => {
      const ms = Date.now() - (active.startedAt as number);
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setElapsed(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.startedAt]);

  const toggle = async () => {
    setBusy(true);
    try { await (isOnline ? goOffline() : goOnline()); } finally { setBusy(false); }
  };

  return (
    <Panel title="Live Status">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            {isOnline ? '🟢 You’re Online' : '⚪ You’re Offline'}
          </div>
          <div className={styles.tableMuted}>{isOnline ? 'Accepting new consultations' : 'Not accepting new consultations'}</div>
          {!connected && <div className={styles.tableMuted} style={{ color: '#a33c3c' }}>Realtime service unreachable</div>}
        </div>
        <button className={`${styles.btnSm} ${isOnline ? styles.btnDanger : styles.btnGold}`} disabled={busy || !connected} onClick={toggle}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {active && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <div className={styles.panelTitle} style={{ fontSize: 11, marginBottom: 8 }}>Current Consultation</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className={styles.tablePrimary}>{active.userName}</div>
              <div className={styles.tableMuted}>{active.category} · {active.type}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, color: 'var(--gold-primary)' }}>{elapsed}</div>
              <button className={styles.iconBtn} style={{ marginTop: 4 }} onClick={endActiveConsultation}>End Consultation</button>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {active.type === 'voice' ? (
              <CallWindow consultationId={active.id} otherPartyName={active.userName} isInitiator={false} />
            ) : (
              <ChatWindow consultationId={active.id} otherPartyName={active.userName} />
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div className={styles.panelTitle} style={{ fontSize: 11, marginBottom: 4 }}>Waiting Queue</div>
          <div className={styles.tableMuted}>{queueCount} {queueCount === 1 ? 'user' : 'users'} waiting</div>
        </div>
        {nextInQueue && (
          <div style={{ textAlign: 'right' }}>
            <div className={styles.panelTitle} style={{ fontSize: 11, marginBottom: 4 }}>Next Up</div>
            <div className={styles.tableMuted}>{nextInQueue.entry.userName} · ~{nextInQueue.eta.minMinutes}-{nextInQueue.eta.maxMinutes} min</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// Quick-action version of the full "Offers & Boost" panel in
// Availability.tsx (which keeps the detailed history) — just the button and
// current status, for the astrologer who wants more consultations right now
// without leaving Overview.
function BoostCard() {
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    astrologerService.getMyBoost().then(setBoost).catch(() => {});
  }, []);

  const activate = async () => {
    setBusy(true);
    setError('');
    try {
      await astrologerService.activateMyBoost();
      setBoost(await astrologerService.getMyBoost());
      setConfirming(false);
    } catch (e) {
      setError(e instanceof AstrologerApiError ? e.message : 'Could not activate Boost');
    } finally {
      setBusy(false);
    }
  };

  const active = boost?.active;
  const remainingMin = active ? Math.max(0, Math.round((active.endsAt - Date.now()) / 60000)) : 0;
  const keepPercent = boost?.pendingPayoutSharePercent ?? 70;

  return (
    <Panel title="Boost">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          {active ? (
            <>
              <div className={styles.tablePrimary}>● Boost {active.displayId} active — {remainingMin} min of visibility left</div>
              <div className={styles.tableMuted}>You're ranked at the top of listings right now.</div>
            </>
          ) : (
            <div className={styles.tableMuted}>30 minutes of extra visibility at the top of listings, in exchange for a reduced share ({keepPercent}%) on any session it brings you.</div>
          )}
        </div>
        {!active && <button className={`${styles.btnSm} ${styles.btnGold}`} disabled={busy} onClick={() => setConfirming(true)}>Activate Boost</button>}
      </div>
      {error && <div className={styles.tableMuted} style={{ color: 'var(--danger, #e05252)', marginTop: 8 }}>{error}</div>}

      {confirming && (
        <ConfirmModal
          title="Activate Boost?"
          body={(
            <>
              Your profile will jump to the top of listings for 30 minutes.<br /><br />
              On any session this brings you, you'll get <strong>{keepPercent}%</strong> and the platform keeps <strong>{100 - keepPercent}%</strong> — this never changes what the user pays.
            </>
          )}
          confirmLabel="Yes, Activate"
          busy={busy}
          onConfirm={activate}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Panel>
  );
}

export default function Overview() {
  const { t, currentUser } = useAppContext();
  const { astrologerSync, acceptAssignment } = useRealtime();
  const { navigate } = useDashboardNav();
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [consultations, setConsultations] = useState<MyConsultationAsAstrologer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    astrologerService.getMyProfile().then(p => { setRating(p.rating); setReviewCount(p.reviews); }).catch(() => {});
    consultationService.listMineAsAstrologer().then(setConsultations).catch(() => {});
  }, []);

  const now = new Date();
  const pendingRequests = astrologerSync?.pendingAssignments || [];
  const recent = consultations.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  const createdToday = consultations.filter(c => isSameDay(new Date(c.createdAt), now)).length;
  const yesterday = new Date(now.getTime() - DAY_MS);
  const createdYesterday = consultations.filter(c => isSameDay(new Date(c.createdAt), yesterday)).length;

  const completed = consultations.filter(c => c.status === 'COMPLETED');
  const thisMonth = completed.filter(c => { const d = new Date(c.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = completed.filter(c => { const d = new Date(c.createdAt); return d.getMonth() === lastMonthRef.getMonth() && d.getFullYear() === lastMonthRef.getFullYear(); });
  const thisMonthTotal = thisMonth.reduce((s, c) => s + c.estimatedAmount, 0);
  const lastMonthTotal = lastMonth.reduce((s, c) => s + c.estimatedAmount, 0);
  const monthDelta = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null;

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const weeksAgo = 5 - i;
    const bucket = completed.filter(c => {
      const diffDays = Math.floor((now.getTime() - c.createdAt) / DAY_MS);
      return diffDays >= weeksAgo * 7 && diffDays < (weeksAgo + 1) * 7;
    });
    return { label: weeksAgo === 0 ? 'This wk' : `${weeksAgo}w ago`, value: bucket.reduce((s, c) => s + c.estimatedAmount, 0) };
  });

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name?.split(' ').slice(-1)[0];

  const handleAccept = async (id: string) => { setBusyId(id); try { await acceptAssignment(id); } finally { setBusyId(null); } };

  return (
    <div>
      <div className={styles.overviewHead}>
        <div>
          <h1 className={styles.overviewTitle}>{greeting}, {firstName}</h1>
          <p className={styles.overviewSub}>Here's what's happening with your practice today.</p>
        </div>
        <div className={styles.overviewDate}>{now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      </div>

      <LiveStatusCard />
      <BoostCard />

      <div className={styles.kpiRow}>
        <KpiCard label={t('astro_kpi_today')} value={createdToday} hint={createdToday !== createdYesterday ? `${createdToday > createdYesterday ? '+' : ''}${createdToday - createdYesterday} from yesterday` : 'Same as yesterday'} />
        <KpiCard label={t('astro_kpi_pending')} value={pendingRequests.length} />
        <KpiCard label={t('astro_kpi_month_earnings')} value={`₹${thisMonthTotal.toLocaleString()}`} hint={monthDelta !== null ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs last month` : undefined} />
        <KpiCard label={t('astro_kpi_rating')} value={`★ ${rating}`} hint={`${reviewCount.toLocaleString()} reviews`} />
      </div>

      <div className={styles.split6535}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Recent Consultations</h3>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon="◎" title={t('astro_empty_schedule_title')} desc={t('astro_empty_schedule_desc')} />
          ) : (
            <div className={styles.timeline}>
              {recent.map(c => (
                <div key={c.id} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{formatTime(new Date(c.createdAt).toISOString())}</span>
                  <div className={styles.timelineDotWrap}><span className={styles.timelineDot} /></div>
                  <div>
                    <div className={styles.timelineClient}>{TYPE_ICON[c.type]} {c.userName}</div>
                    <div className={styles.timelineMeta}>{c.category} · {formatDateShort(new Date(c.createdAt).toISOString())}</div>
                  </div>
                  <span className={styles.tableMuted}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('astro_pending_requests')}</h3>
            {pendingRequests.length > 0 && <button className={styles.iconBtn} onClick={() => navigate('requests')}>{t('astro_view_all')}</button>}
          </div>
          {pendingRequests.length === 0 ? (
            <EmptyState icon="◎" title={t('astro_empty_requests_title')} desc={t('astro_empty_requests_desc')} />
          ) : (
            pendingRequests.slice(0, 4).map(req => (
              <div key={req.id} className={styles.requestCard}>
                <div className={styles.requestTop}>
                  <span className={styles.requestAvatar}>{req.userName.charAt(0)}</span>
                  <div>
                    <div className={styles.requestName}>{req.userName}</div>
                    <div className={styles.requestMeta}>{req.category} · {timeAgo(req.createdAt)}</div>
                  </div>
                </div>
                <div className={styles.requestActions}>
                  <button className={`${styles.btnSm} ${styles.btnGold}`} disabled={busyId === req.id} onClick={() => handleAccept(req.id)}>{t('astro_action_accept')}</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h3 className={styles.panelTitle}>Quick Actions</h3></div>
        <div className={styles.quickActions}>
          <button className={styles.btnSm} onClick={() => navigate('consultations')}>View Consultations</button>
          <button className={styles.btnSm} onClick={() => navigate('earnings')}>View Earnings</button>
          <button className={styles.btnSm} onClick={() => navigate('reviews')}>View Reviews</button>
        </div>
      </div>

      <div className={styles.performanceGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}><h3 className={styles.panelTitle}>Earnings</h3></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>This month</span><span className={styles.statRowValue}>₹{thisMonthTotal.toLocaleString()}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Last month</span><span className={styles.statRowValue}>₹{lastMonthTotal.toLocaleString()}</span></div>
          {chartData.some(d => d.value > 0) && <div style={{ marginTop: 10 }}><MiniBarChart data={chartData} /></div>}
        </div>
      </div>
    </div>
  );
}
