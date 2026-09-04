import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { StatCard, ActivityTimeline } from '../components/SharedControls';
import type { TimelineItem } from '../components/SharedControls';
import type { AdminSection } from '../adminTypes';
import { adminService } from '../../services/adminService';
import type { ApiDashboardStats } from '../../services/adminService';
import { formatMsg, formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

interface Props {
  onNavigate: (section: AdminSection) => void;
}

export default function OverviewPage({ onNavigate }: Props) {
  const { t, currentUser, accounts, applications } = useAppContext();
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);

  useEffect(() => {
    adminService.getDashboardStats().then(setStats).catch(() => setStats(null));
  }, []);

  const totalUsers = accounts.filter(a => a.role === 'USER').length;
  const activeUsers = accounts.filter(a => a.role === 'USER' && (a.status ?? 'ACTIVE') === 'ACTIVE').length;
  const totalAstrologers = accounts.filter(a => a.role === 'ASTROLOGIST').length;
  const pendingApps = applications.filter(a => a.status === 'PENDING').length;

  const kpis = [
    { icon: '☰', label: t('admin_kpi_total_users'), value: totalUsers },
    { icon: '✓', label: t('admin_kpi_active_users'), value: activeUsers },
    { icon: '☉', label: t('admin_kpi_astrologers'), value: totalAstrologers },
    { icon: '◎', label: t('admin_kpi_pending_applications'), value: pendingApps },
    { icon: '◐', label: t('admin_kpi_todays_consultations'), value: stats ? stats.consultationsInProgress : '—' },
    { icon: '₹', label: t('admin_kpi_revenue'), value: stats ? `₹${stats.revenue.toLocaleString()}` : '—' },
    { icon: '▤', label: t('admin_kpi_reports_generated'), value: stats ? stats.reportsGenerated : '—' },
    { icon: '▢', label: t('admin_kpi_store_orders'), value: stats ? stats.storeOrders : '—' },
  ];

  const QUICK_ACTIONS: { icon: string; labelKey: string; section: AdminSection }[] = [
    { icon: '◎', labelKey: 'admin_qa_review_applications', section: 'applications' },
    { icon: '☉', labelKey: 'admin_qa_add_astrologer', section: 'astrologers' },
    { icon: '◐', labelKey: 'admin_qa_view_consultations', section: 'consultations' },
    { icon: '▤', labelKey: 'admin_qa_manage_reports', section: 'reports' },
    { icon: '▢', labelKey: 'admin_qa_manage_store', section: 'orders' },
    { icon: '♃', labelKey: 'admin_qa_send_announcement', section: 'notifications' },
  ];

  // Merged from 4 different sources (applications, consultations, report
  // purchases, delivered orders) — sorted by a real timestamp so "recent
  // activity" is genuinely chronological across all of them, not just
  // grouped by source and truncated.
  const dated: (TimelineItem & { ts: number })[] = [];
  applications.forEach(a => {
    const ts = new Date(a.submittedAt).getTime();
    if (a.status === 'APPROVED') dated.push({ id: `app-appr-${a.id}`, icon: '✓', text: formatMsg(t('admin_activity_application_approved'), { name: a.userName }), at: formatDateTime(a.submittedAt), ts });
    else if (a.status === 'REJECTED') dated.push({ id: `app-rej-${a.id}`, icon: '✕', text: formatMsg(t('admin_activity_application_rejected'), { name: a.userName }), at: formatDateTime(a.submittedAt), ts });
    else dated.push({ id: `app-sub-${a.id}`, icon: '◎', text: formatMsg(t('admin_activity_astrologer_applied'), { name: a.userName }), at: formatDateTime(a.submittedAt), ts });
  });
  stats?.recentConsultations.forEach(c =>
    dated.push({ id: `consult-${c.id}`, icon: '◐', text: formatMsg(t('admin_activity_consultation_booked'), { user: c.userName, astrologer: c.astrologerName }), at: formatDateTime(new Date(c.createdAt).toISOString()), ts: c.createdAt })
  );
  stats?.recentPurchases.forEach(r =>
    dated.push({ id: `report-${r.id}`, icon: '▤', text: formatMsg(t('admin_activity_report_purchased'), { user: r.userName, report: r.reportTitle }), at: formatDateTime(new Date(r.purchasedAt).toISOString()), ts: r.purchasedAt })
  );
  stats?.recentDeliveredOrders.forEach(o =>
    dated.push({ id: `order-${o.id}`, icon: '▢', text: formatMsg(t('admin_activity_order_completed'), { id: o.id }), at: formatDateTime(new Date(o.createdAt).toISOString()), ts: o.createdAt })
  );
  const activity: TimelineItem[] = dated.sort((a, b) => b.ts - a.ts);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_console_caption')}</div>
        <div className={styles.pageSub}>{currentUser?.name}</div>
      </div>

      <div className={styles.kpiGrid}>
        {kpis.map(k => <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} />)}
      </div>

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

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('admin_recent_activity')}</div>
        <ActivityTimeline items={activity.slice(0, 10)} />
      </div>
    </div>
  );
}
