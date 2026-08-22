import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import type { ApiReportPurchase } from '../../services/adminService';
import DataTable from '../components/DataTable';
import { StatCard, EmptyState } from '../components/SharedControls';
import styles from './AdminPages.module.css';

const BUNDLE_LABEL: Record<string, string> = {
  'report-only': 'Report Only',
  'report-qa': 'Report + Expert Q&A',
  'report-consult': 'Report + Consultation',
};

export default function ReportsPage() {
  const { t } = useAppContext();
  const [purchases, setPurchases] = useState<ApiReportPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.listReportPurchases().then(setPurchases).catch(() => setPurchases([])).finally(() => setLoading(false));
  }, []);

  const revenue = purchases.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_reports_title')}</div>
      </div>

      <div className={styles.kpiGrid}>
        <StatCard icon="▤" label={t('admin_reports_kpi_total')} value={purchases.length} />
        <StatCard icon="₹" label={t('admin_reports_kpi_revenue')} value={`₹${revenue.toLocaleString()}`} />
      </div>

      {!loading && (
        <DataTable
          columns={[
            { key: 'user', label: t('admin_reports_col_user'), render: r => r.userName },
            { key: 'report', label: t('admin_reports_col_report'), render: r => r.reportTitle },
            { key: 'bundle', label: 'Bundle', render: r => BUNDLE_LABEL[r.bundle] || r.bundle },
            { key: 'price', label: t('admin_reports_col_price'), render: r => `₹${r.amount}` },
            { key: 'date', label: t('admin_reports_col_date'), render: r => new Date(r.purchasedAt).toLocaleDateString() },
          ]}
          rows={purchases}
          keyField="id"
          emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
        />
      )}
    </div>
  );
}
