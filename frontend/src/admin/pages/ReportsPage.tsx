import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { SAMPLE_PURCHASED_REPORTS } from '../adminMockData';
import DataTable from '../components/DataTable';
import { StatCard, StatusBadge, FilterBar, EmptyState } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

type FilterKey = 'ALL' | 'PENDING' | 'COMPLETED';

export default function ReportsPage() {
  const { t } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const revenue = SAMPLE_PURCHASED_REPORTS.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + r.price, 0);
  const pending = SAMPLE_PURCHASED_REPORTS.filter(r => r.status === 'PENDING').length;
  const completed = SAMPLE_PURCHASED_REPORTS.filter(r => r.status === 'COMPLETED').length;

  const filtered = useMemo(() => SAMPLE_PURCHASED_REPORTS.filter(r => filter === 'ALL' || r.status === filter), [filter]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_reports_title')}</div>
      </div>

      <div className={styles.kpiGrid}>
        <StatCard icon="▤" label={t('admin_reports_kpi_total')} value={SAMPLE_PURCHASED_REPORTS.length} />
        <StatCard icon="◎" label={t('admin_reports_kpi_pending')} value={pending} />
        <StatCard icon="✓" label={t('admin_reports_kpi_completed')} value={completed} />
        <StatCard icon="₹" label={t('admin_reports_kpi_revenue')} value={`₹${revenue.toLocaleString()}`} />
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'PENDING', label: t('admin_status_pending') },
            { key: 'COMPLETED', label: t('admin_status_completed') },
            { key: 'ALL', label: t('admin_status_all') },
          ]}
          active={filter}
          onChange={k => setFilter(k as FilterKey)}
        />
      </div>

      <DataTable
        columns={[
          { key: 'user', label: t('admin_reports_col_user'), render: r => r.userName },
          { key: 'report', label: t('admin_reports_col_report'), render: r => r.reportTitle },
          { key: 'price', label: t('admin_reports_col_price'), render: r => `₹${r.price}` },
          { key: 'status', label: t('admin_reports_col_status'), render: r => <StatusBadge status={r.status} label={t(`admin_status_${r.status.toLowerCase()}`)} /> },
          { key: 'date', label: t('admin_reports_col_date'), render: r => formatDate(r.date) },
        ]}
        rows={filtered}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
      />
    </div>
  );
}
