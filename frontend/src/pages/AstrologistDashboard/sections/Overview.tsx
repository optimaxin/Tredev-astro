import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { ASTROLOGERS } from '../../../data/mockData';
import { useRealtime } from '../../../realtime/RealtimeContext';
import ChatWindow from '../../../components/ChatWindow/ChatWindow';
import {
  DAY_MS, TYPE_ICON, isSameDay, formatTime, formatDateShort,
  EmptyState, KpiCard, MiniBarChart, Panel,
} from './shared';
import { useDashboardNav } from './shared';
import styles from './sections.module.css';

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
            <ChatWindow consultationId={active.id} otherPartyName={active.userName} />
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

export default function Overview() {
  const { currentUser, t, consultations, consultationRequests, acceptConsultationRequest, declineConsultationRequest, completeConsultation, cancelConsultation } = useAppContext();
  const { navigate } = useDashboardNav();
  const profile = ASTROLOGERS.find(a => a.name === currentUser?.name) || ASTROLOGERS[0];
  const now = new Date();
  const yesterday = new Date(now.getTime() - DAY_MS);

  const todaysSchedule = consultations
    .filter(c => isSameDay(new Date(c.scheduledAt), now))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const yesterdaysCount = consultations.filter(c => isSameDay(new Date(c.scheduledAt), yesterday)).length;
  const pendingRequests = consultationRequests.filter(r => r.status === 'PENDING').sort((a, b) => a.requestedFor.localeCompare(b.requestedFor));

  const completed = consultations.filter(c => c.status === 'completed');
  const thisMonth = completed.filter(c => { const d = new Date(c.scheduledAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = completed.filter(c => { const d = new Date(c.scheduledAt); return d.getMonth() === lastMonthRef.getMonth() && d.getFullYear() === lastMonthRef.getFullYear(); });
  const thisMonthTotal = thisMonth.reduce((s, c) => s + c.amount, 0);
  const lastMonthTotal = lastMonth.reduce((s, c) => s + c.amount, 0);
  const monthDelta = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : null;

  const thisWeek = consultations.filter(c => now.getTime() - new Date(c.scheduledAt).getTime() >= 0 && now.getTime() - new Date(c.scheduledAt).getTime() <= 7 * DAY_MS);
  const lastWeek = consultations.filter(c => { const diff = now.getTime() - new Date(c.scheduledAt).getTime(); return diff > 7 * DAY_MS && diff <= 14 * DAY_MS; });
  const thisWeekEarnings = thisWeek.filter(c => c.status === 'completed').reduce((s, c) => s + c.amount, 0);
  const lastWeekEarnings = lastWeek.filter(c => c.status === 'completed').reduce((s, c) => s + c.amount, 0);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const weeksAgo = 5 - i;
    const bucket = completed.filter(c => {
      const diffDays = Math.floor((now.getTime() - new Date(c.scheduledAt).getTime()) / DAY_MS);
      return diffDays >= weeksAgo * 7 && diffDays < (weeksAgo + 1) * 7;
    });
    return { label: weeksAgo === 0 ? 'This wk' : `${weeksAgo}w ago`, value: bucket.reduce((s, c) => s + c.amount, 0) };
  });

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name?.split(' ').slice(-1)[0];

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

      <div className={styles.kpiRow}>
        <KpiCard label={t('astro_kpi_today')} value={todaysSchedule.length} hint={todaysSchedule.length !== yesterdaysCount ? `${todaysSchedule.length > yesterdaysCount ? '+' : ''}${todaysSchedule.length - yesterdaysCount} from yesterday` : 'Same as yesterday'} />
        <KpiCard label={t('astro_kpi_pending')} value={pendingRequests.length} />
        <KpiCard label={t('astro_kpi_month_earnings')} value={`₹${thisMonthTotal.toLocaleString()}`} hint={monthDelta !== null ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs last month` : undefined} />
        <KpiCard label={t('astro_kpi_rating')} value={`★ ${profile.rating}`} hint={`${profile.reviews.toLocaleString()} reviews`} />
      </div>

      <div className={styles.split6535}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{t('astro_todays_schedule')}</h3>
          </div>
          {todaysSchedule.length === 0 ? (
            <EmptyState icon="◎" title={t('astro_empty_schedule_title')} desc={t('astro_empty_schedule_desc')} />
          ) : (
            <div className={styles.timeline}>
              {todaysSchedule.map(c => (
                <div key={c.id} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{formatTime(c.scheduledAt)}</span>
                  <div className={styles.timelineDotWrap}><span className={`${styles.timelineDot} ${styles['timelineDot_' + c.status]}`} /></div>
                  <div>
                    <div className={styles.timelineClient}>{TYPE_ICON[c.type]} {c.clientName}</div>
                    <div className={styles.timelineMeta}>{c.service} · {c.duration} min</div>
                  </div>
                  {c.status === 'upcoming' ? (
                    <div className={styles.requestActions}>
                      <button className={styles.iconBtn} onClick={() => completeConsultation(c.id)}>{t('astro_action_complete')}</button>
                      <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => cancelConsultation(c.id)}>{t('astro_action_cancel')}</button>
                    </div>
                  ) : (
                    <span className={styles.tableMuted}>{c.status === 'completed' ? 'Completed' : 'Cancelled'}</span>
                  )}
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
                  <span className={styles.requestAvatar}>{req.clientName.charAt(0)}</span>
                  <div>
                    <div className={styles.requestName}>{req.clientName}</div>
                    <div className={styles.requestMeta}>{req.service} · {formatDateShort(req.requestedFor)}</div>
                  </div>
                  <span className={styles.requestAmount}>₹{req.price}</span>
                </div>
                <div className={styles.requestActions}>
                  <button className={`${styles.btnSm} ${styles.btnGold}`} onClick={() => acceptConsultationRequest(req.id)}>{t('astro_action_accept')}</button>
                  <button className={styles.btnSm} onClick={() => declineConsultationRequest(req.id)}>{t('astro_action_decline')}</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}><h3 className={styles.panelTitle}>Quick Actions</h3></div>
        <div className={styles.quickActions}>
          <button className={styles.btnSm} onClick={() => navigate('availability')}>Manage Availability</button>
          <button className={styles.btnSm} onClick={() => navigate('calendar')}>View Calendar</button>
          <button className={styles.btnSm} onClick={() => navigate('clients')}>View Clients</button>
          <button className={styles.btnSm} onClick={() => navigate('earnings')}>View Earnings</button>
        </div>
      </div>

      <div className={styles.performanceGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHead}><h3 className={styles.panelTitle}>Consultations</h3></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>This week</span><span className={styles.statRowValue}>{thisWeek.length}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Completed</span><span className={styles.statRowValue}>{thisWeek.filter(c => c.status === 'completed').length}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Cancelled</span><span className={styles.statRowValue}>{thisWeek.filter(c => c.status === 'cancelled').length}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Upcoming</span><span className={styles.statRowValue}>{thisWeek.filter(c => c.status === 'upcoming').length}</span></div>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHead}><h3 className={styles.panelTitle}>Earnings</h3></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>This week</span><span className={styles.statRowValue}>₹{thisWeekEarnings.toLocaleString()}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Last week</span><span className={styles.statRowValue}>₹{lastWeekEarnings.toLocaleString()}</span></div>
          {chartData.some(d => d.value > 0) && <div style={{ marginTop: 10 }}><MiniBarChart data={chartData} /></div>}
        </div>
      </div>
    </div>
  );
}
