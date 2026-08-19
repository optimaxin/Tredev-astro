import { useAppContext } from '../../context/AppContext';
import { StatCard, ActivityTimeline } from '../components/SharedControls';
import type { TimelineItem } from '../components/SharedControls';
import type { AdminSection } from '../adminTypes';
import { SAMPLE_CONSULTATIONS, SAMPLE_PURCHASED_REPORTS, SAMPLE_ORDERS } from '../adminMockData';
import { formatMsg, formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

interface Props {
  onNavigate: (section: AdminSection) => void;
}

export default function OverviewPage({ onNavigate }: Props) {
  const { t, currentUser, accounts, applications } = useAppContext();

  const totalUsers = accounts.filter(a => a.role === 'USER').length;
  const activeUsers = accounts.filter(a => a.role === 'USER' && (a.status ?? 'ACTIVE') === 'ACTIVE').length;
  const totalAstrologers = accounts.filter(a => a.role === 'ASTROLOGIST').length;
  const pendingApps = applications.filter(a => a.status === 'PENDING').length;
  const todaysConsultations = SAMPLE_CONSULTATIONS.filter(c => c.status === 'UPCOMING' || c.status === 'LIVE').length;
  const revenue = SAMPLE_PURCHASED_REPORTS.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + r.price, 0)
    + SAMPLE_ORDERS.filter(o => o.payment === 'PAID').reduce((sum, o) => sum + o.amount, 0);

  const kpis = [
    { icon: '☰', label: t('admin_kpi_total_users'), value: totalUsers },
    { icon: '✓', label: t('admin_kpi_active_users'), value: activeUsers },
    { icon: '☉', label: t('admin_kpi_astrologers'), value: totalAstrologers },
    { icon: '◎', label: t('admin_kpi_pending_applications'), value: pendingApps },
    { icon: '◐', label: t('admin_kpi_todays_consultations'), value: todaysConsultations },
    { icon: '₹', label: t('admin_kpi_revenue'), value: `₹${revenue.toLocaleString()}` },
    { icon: '▤', label: t('admin_kpi_reports_generated'), value: SAMPLE_PURCHASED_REPORTS.length },
    { icon: '▢', label: t('admin_kpi_store_orders'), value: SAMPLE_ORDERS.length },
  ];

  const QUICK_ACTIONS: { icon: string; labelKey: string; section: AdminSection }[] = [
    { icon: '◎', labelKey: 'admin_qa_review_applications', section: 'applications' },
    { icon: '☉', labelKey: 'admin_qa_add_astrologer', section: 'astrologers' },
    { icon: '◐', labelKey: 'admin_qa_view_consultations', section: 'consultations' },
    { icon: '▤', labelKey: 'admin_qa_manage_reports', section: 'reports' },
    { icon: '▢', labelKey: 'admin_qa_manage_store', section: 'orders' },
    { icon: '♃', labelKey: 'admin_qa_send_announcement', section: 'notifications' },
  ];

  const activity: TimelineItem[] = [];
  [...applications]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .forEach(a => {
      if (a.status === 'APPROVED') {
        activity.push({ id: `app-appr-${a.id}`, icon: '✓', text: formatMsg(t('admin_activity_application_approved'), { name: a.userName }), at: formatDateTime(a.submittedAt) });
      } else if (a.status === 'REJECTED') {
        activity.push({ id: `app-rej-${a.id}`, icon: '✕', text: formatMsg(t('admin_activity_application_rejected'), { name: a.userName }), at: formatDateTime(a.submittedAt) });
      } else {
        activity.push({ id: `app-sub-${a.id}`, icon: '◎', text: formatMsg(t('admin_activity_astrologer_applied'), { name: a.userName }), at: formatDateTime(a.submittedAt) });
      }
    });
  SAMPLE_CONSULTATIONS.slice(0, 2).forEach(c =>
    activity.push({ id: `consult-${c.id}`, icon: '◐', text: formatMsg(t('admin_activity_consultation_booked'), { user: c.userName, astrologer: c.astrologerName }), at: `${c.date} · ${c.time}` })
  );
  SAMPLE_PURCHASED_REPORTS.slice(0, 2).forEach(r =>
    activity.push({ id: `report-${r.id}`, icon: '▤', text: formatMsg(t('admin_activity_report_purchased'), { user: r.userName, report: r.reportTitle }), at: r.date })
  );
  SAMPLE_ORDERS.filter(o => o.delivery === 'DELIVERED').slice(0, 2).forEach(o =>
    activity.push({ id: `order-${o.id}`, icon: '▢', text: formatMsg(t('admin_activity_order_completed'), { id: o.id }), at: '—' })
  );

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
