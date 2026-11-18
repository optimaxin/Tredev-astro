import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { StatCard, ActivityTimeline } from '../components/SharedControls';
import type { TimelineItem } from '../components/SharedControls';
import type { AdminSection } from '../adminTypes';
import { adminService } from '../../services/adminService';
import type { ApiDashboardStats, ApiTrafficEntry } from '../../services/adminService';
import { formatMsg, formatDateTime, visitFingerprint } from '../adminUtils';
import styles from './AdminPages.module.css';

interface Props {
  onNavigate: (section: AdminSection) => void;
  // Same list AdminSidebar filters its nav items by — without this, a
  // Staff account missing a section (e.g. only overview/astrologers/users)
  // still saw a card for every section here, and clicking one silently did
  // nothing (AdminConsole's navigate() no-ops on a disallowed section).
  // Undefined means unrestricted (ADMIN).
  allowedSections?: AdminSection[];
}

export default function OverviewPage({ onNavigate, allowedSections }: Props) {
  const { t, currentUser, accounts } = useAppContext();
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);
  const [traffic, setTraffic] = useState<ApiTrafficEntry[] | null>(null);

  useEffect(() => {
    adminService.getDashboardStats().then(setStats).catch(() => setStats(null));
    adminService.getTraffic().then(setTraffic).catch(() => setTraffic(null));
  }, []);

  const totalUsers = accounts.filter(a => a.role === 'USER').length;
  const activeUsers = accounts.filter(a => a.role === 'USER' && (a.status ?? 'ACTIVE') === 'ACTIVE').length;
  const totalAstrologers = accounts.filter(a => a.role === 'ASTROLOGIST').length;

  // Staff never gets a revenue figure back from the API (see admin.routes.ts's
  // dashboard-stats) — the KPI card itself is omitted rather than shown as
  // "—", so there's no revenue-shaped hole hinting at hidden money data.
  const kpis = [
    { icon: '☰', label: t('admin_kpi_total_users'), value: totalUsers },
    { icon: '✓', label: t('admin_kpi_active_users'), value: activeUsers },
    { icon: '☉', label: t('admin_kpi_astrologers'), value: totalAstrologers },
    { icon: '◐', label: t('admin_kpi_todays_consultations'), value: stats ? stats.consultationsInProgress : '—' },
    ...(currentUser?.role === 'STAFF' ? [] : [{ icon: '₹', label: t('admin_kpi_revenue'), value: stats ? `₹${(stats.revenue ?? 0).toLocaleString()}` : '—' }]),
    { icon: '▤', label: t('admin_kpi_reports_generated'), value: stats ? stats.reportsGenerated : '—' },
    { icon: '▢', label: t('admin_kpi_store_orders'), value: stats ? stats.storeOrders : '—' },
  ];

  const ALL_QUICK_ACTIONS: { icon: string; labelKey: string; section: AdminSection }[] = [
    { icon: '✦', labelKey: 'admin_qa_review_applications', section: 'applications' },
    { icon: '◆', labelKey: 'admin_sidebar_staff', section: 'staff' },
    { icon: '◐', labelKey: 'admin_qa_view_consultations', section: 'consultations' },
    { icon: '▤', labelKey: 'admin_qa_manage_reports', section: 'reports' },
    { icon: '▢', labelKey: 'admin_qa_manage_store', section: 'orders' },
    { icon: '♃', labelKey: 'admin_qa_send_announcement', section: 'notifications' },
  ];
  const QUICK_ACTIONS = allowedSections ? ALL_QUICK_ACTIONS.filter(a => allowedSections.includes(a.section)) : ALL_QUICK_ACTIONS;

  // Merged from 3 different sources (consultations, report purchases,
  // delivered orders) — sorted by a real timestamp so "recent activity" is
  // genuinely chronological across all of them, not just grouped by source
  // and truncated.
  const dated: (TimelineItem & { ts: number })[] = [];
  stats?.recentConsultations.forEach(c =>
    dated.push({ id: `consult-${c.id}`, icon: '◐', text: formatMsg(t('admin_activity_consultation_booked'), { user: c.userName, astrologer: c.astrologerName }), at: formatDateTime(c.createdAt), ts: Number(c.createdAt) })
  );
  stats?.recentPurchases.forEach(r =>
    dated.push({ id: `report-${r.id}`, icon: '▤', text: formatMsg(t('admin_activity_report_purchased'), { user: r.userName, report: r.reportTitle }), at: formatDateTime(r.purchasedAt), ts: Number(r.purchasedAt) })
  );
  stats?.recentDeliveredOrders.forEach(o =>
    dated.push({ id: `order-${o.id}`, icon: '▢', text: formatMsg(t('admin_activity_order_completed'), { id: o.id }), at: formatDateTime(o.createdAt), ts: Number(o.createdAt) })
  );
  const activity: TimelineItem[] = dated.sort((a, b) => b.ts - a.ts);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t(currentUser?.role === 'STAFF' ? 'admin_console_caption_staff' : 'admin_console_caption')}</div>
        <div className={styles.pageSub}>{currentUser?.name}</div>
      </div>

      <div className={styles.kpiGrid}>
        {kpis.map(k => <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} />)}
      </div>

      {QUICK_ACTIONS.length > 0 && (
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('admin_quick_actions')}</div>
        <div className={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.section} className={styles.quickActionCard} onClick={() => onNavigate(a.section)}>
              <span className={styles.quickActionIcon}>{a.icon}</span>
              <span className={styles.quickActionLabel}>{t(a.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('admin_recent_activity')}</div>
        <ActivityTimeline items={activity.slice(0, 10)} />
      </div>

      {/* Every visit — logged-in AND anonymous (see GET /admin/traffic) —
          with its fingerprint, so staff/admin can see where traffic is
          actually coming from, not just what registered accounts do. */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Recent Traffic</div>
        {traffic === null && <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)' }}>Loading…</p>}
        {traffic && traffic.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)' }}>No visits recorded yet.</p>}
        {traffic && traffic.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {traffic.map((v, i) => (
              <li key={i} style={{ fontSize: '0.82rem', paddingBottom: 8, borderBottom: '1px solid var(--adm-border, #e5e0d8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontWeight: 600 }}>{v.path}</span>
                  <span style={{ color: 'var(--adm-charcoal-soft)', whiteSpace: 'nowrap' }}>{formatDateTime(v.at)}</span>
                </div>
                <div style={{ color: 'var(--adm-charcoal-soft)', fontSize: '0.74rem', marginTop: 2 }}>
                  {v.userName ? `${v.userName} (${v.userEmail})` : 'Anonymous visitor'} · {visitFingerprint(v)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
