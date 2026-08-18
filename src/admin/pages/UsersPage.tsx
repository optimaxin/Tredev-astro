import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AuthUser } from '../../context/AppContext';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, SearchInput, EmptyState, AdminButton } from '../components/SharedControls';
import { SAMPLE_CONSULTATIONS, SAMPLE_PURCHASED_REPORTS, SAMPLE_ORDERS } from '../adminMockData';
import { accountStatus, formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

const PAGE_SIZE = 8;

function joinedDate(id: string): string {
  const match = /^u-(\d+)$/.exec(id);
  return match ? formatDate(new Date(Number(match[1])).toISOString()) : '—';
}

function countsFor(name: string) {
  return {
    reports: SAMPLE_PURCHASED_REPORTS.filter(r => r.userName === name).length,
    consultations: SAMPLE_CONSULTATIONS.filter(c => c.userName === name).length,
    orders: SAMPLE_ORDERS.filter(o => o.customer === name).length,
  };
}

export default function UsersPage() {
  const { t, accounts, suspendAccount, restoreAccount } = useAppContext();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuthUser | null>(null);

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter(a => a.role === 'USER')
      .filter(a => filter === 'ALL' || accountStatus(a.status) === filter)
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [accounts, filter, search]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageRows = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_users_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'ALL', label: t('admin_status_all') },
            { key: 'ACTIVE', label: t('admin_status_active') },
            { key: 'SUSPENDED', label: t('admin_status_suspended') },
          ]}
          active={filter}
          onChange={k => { setFilter(k as any); setPage(1); }}
        />
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder={t('admin_search_name_email')} />
      </div>

      <DataTable
        columns={[
          { key: 'user', label: t('admin_users_col_user'), render: u => (<div><div style={{ fontWeight: 700 }}>{u.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{u.email}</div></div>) },
          { key: 'joined', label: t('admin_users_col_joined'), render: u => joinedDate(u.id) },
          { key: 'reports', label: t('admin_users_col_reports'), render: u => countsFor(u.name).reports },
          { key: 'consultations', label: t('admin_users_col_consultations'), render: u => countsFor(u.name).consultations },
          { key: 'orders', label: t('admin_users_col_orders'), render: u => countsFor(u.name).orders },
          { key: 'status', label: t('admin_users_col_status'), render: u => { const s = accountStatus(u.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; } },
        ]}
        rows={pageRows}
        keyField="email"
        onRowClick={setSelected}
        emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
      />

      {users.length > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <AdminButton variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</AdminButton>
          <span style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', alignSelf: 'center' }}>{page} / {totalPages}</span>
          <AdminButton variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</AdminButton>
        </div>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        footer={selected ? (
          accountStatus(selected.status) === 'ACTIVE'
            ? <AdminButton variant="danger" onClick={() => { suspendAccount(selected.email); setSelected(null); }}>{t('admin_action_suspend')}</AdminButton>
            : <AdminButton variant="gold" onClick={() => { restoreAccount(selected.email); setSelected(null); }}>{t('admin_action_restore')}</AdminButton>
        ) : undefined}
      >
        {selected && (
          <>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.email}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_joined')}</span><span className={styles.drawerFieldValue}>{joinedDate(selected.id)}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_reports')}</span><span className={styles.drawerFieldValue}>{countsFor(selected.name).reports}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_consultations')}</span><span className={styles.drawerFieldValue}>{countsFor(selected.name).consultations}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_orders')}</span><span className={styles.drawerFieldValue}>{countsFor(selected.name).orders}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_status')}</span><span className={styles.drawerFieldValue}>{(() => { const s = accountStatus(selected.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; })()}</span></div>
          </>
        )}
      </Drawer>
    </div>
  );
}
