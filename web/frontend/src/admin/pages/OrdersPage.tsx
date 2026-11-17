import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiOrder } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, EmptyState, AdminButton } from '../components/SharedControls';
import styles from './AdminPages.module.css';

type FilterKey = 'ALL' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
type DeliveryStatus = ApiOrder['deliveryStatus'];
const DELIVERY_STATUSES: DeliveryStatus[] = ['PROCESSING', 'SHIPPED', 'DELIVERED'];

export default function OrdersPage() {
  const { t } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ApiOrder | null>(null);
  const [updating, setUpdating] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listOrders()
      .then(setOrders)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load orders.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => orders.filter(o => filter === 'ALL' || o.deliveryStatus === filter), [orders, filter]);

  const setStatus = async (status: DeliveryStatus) => {
    if (!selected) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateOrderDeliveryStatus(selected.id, status);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelected(updated);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not update this order.');
    } finally {
      setUpdating(false);
    }
  };

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

      {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      <DataTable
        columns={[
          { key: 'id', label: t('admin_orders_col_id'), render: o => o.id },
          { key: 'customer', label: t('admin_orders_col_customer'), render: o => (<div><div style={{ fontWeight: 700 }}>{o.customerName}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{o.customerEmail}</div></div>) },
          { key: 'product', label: t('admin_orders_col_product'), render: o => o.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') },
          { key: 'amount', label: t('admin_orders_col_amount'), render: o => `₹${o.amount}` },
          { key: 'delivery', label: t('admin_orders_col_delivery'), render: o => <StatusBadge status={o.deliveryStatus} label={t(`admin_status_${o.deliveryStatus.toLowerCase()}`)} /> },
        ]}
        rows={loading ? [] : filtered}
        keyField="id"
        onRowClick={setSelected}
        emptyState={<EmptyState title={t('admin_empty_title')} description={loading ? 'Loading…' : t('admin_empty_desc')} />}
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id || ''}
        footer={selected ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DELIVERY_STATUSES.filter(s => s !== selected.deliveryStatus).map(s => (
              <AdminButton key={s} variant={s === 'DELIVERED' ? 'gold' : 'outline'} disabled={updating} onClick={() => setStatus(s)}>
                Mark {t(`admin_status_${s.toLowerCase()}`)}
              </AdminButton>
            ))}
          </div>
        ) : undefined}
      >
        {selected && (
          <>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_orders_col_customer')}</span><span className={styles.drawerFieldValue}>{selected.customerName} ({selected.customerEmail})</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_orders_col_product')}</span><span className={styles.drawerFieldValue}>{selected.items.map(i => `${i.name} ×${i.quantity} — ₹${i.price}`).join(', ')}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_orders_col_amount')}</span><span className={styles.drawerFieldValue}>₹{selected.amount}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Shipping</span><span className={styles.drawerFieldValue}>{selected.shipping.name}, {selected.shipping.address}, {selected.shipping.city} {selected.shipping.zip}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_orders_col_delivery')}</span><span className={styles.drawerFieldValue}><StatusBadge status={selected.deliveryStatus} label={t(`admin_status_${selected.deliveryStatus.toLowerCase()}`)} /></span></div>
          </>
        )}
      </Drawer>
    </div>
  );
}
