import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { SAMPLE_ORDERS } from '../adminMockData';
import DataTable from '../components/DataTable';
import { StatusBadge, FilterBar, EmptyState } from '../components/SharedControls';
import styles from './AdminPages.module.css';

type FilterKey = 'ALL' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';

export default function OrdersPage() {
  const { t } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const filtered = useMemo(() => SAMPLE_ORDERS.filter(o => filter === 'ALL' || o.delivery === filter), [filter]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_orders_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'PROCESSING', label: t('admin_status_processing') },
            { key: 'SHIPPED', label: t('admin_status_shipped') },
            { key: 'DELIVERED', label: t('admin_status_delivered') },
            { key: 'ALL', label: t('admin_status_all') },
          ]}
          active={filter}
          onChange={k => setFilter(k as FilterKey)}
        />
      </div>

      <DataTable
        columns={[
          { key: 'id', label: t('admin_orders_col_id'), render: o => o.id },
          { key: 'customer', label: t('admin_orders_col_customer'), render: o => o.customer },
          { key: 'product', label: t('admin_orders_col_product'), render: o => o.product },
          { key: 'amount', label: t('admin_orders_col_amount'), render: o => `₹${o.amount}` },
          { key: 'payment', label: t('admin_orders_col_payment'), render: o => <StatusBadge status={o.payment} label={t(`admin_status_${o.payment.toLowerCase()}`)} /> },
          { key: 'delivery', label: t('admin_orders_col_delivery'), render: o => <StatusBadge status={o.delivery} label={t(`admin_status_${o.delivery.toLowerCase()}`)} /> },
        ]}
        rows={filtered}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
      />
    </div>
  );
}
