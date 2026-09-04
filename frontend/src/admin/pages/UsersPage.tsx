import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AuthUser } from '../../context/AppContext';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, SearchInput, EmptyState, AdminButton } from '../components/SharedControls';
import { adminService } from '../../services/adminService';
import type { ApiUserActivity } from '../../services/adminService';
import { accountStatus, formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

const PAGE_SIZE = 8;

function joinedDate(id: string): string {
  const match = /^u-(\d+)$/.exec(id);
  return match ? formatDate(new Date(Number(match[1])).toISOString()) : '—';
}

export default function UsersPage() {
  const { t, accounts, suspendAccount, restoreAccount, updateAccountRole, currentUser } = useAppContext();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [activity, setActivity] = useState<ApiUserActivity | null>(null);
  const [activityError, setActivityError] = useState('');
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState('');

  // Fetched fresh per user when the drawer opens (was 3 name-matched counts
  // against SAMPLE_* mock arrays) — kept out of the main table since that
  // would mean a fetch per visible row instead of one per drawer open.
  useEffect(() => {
    if (!selected) { setActivity(null); return; }
    setActivity(null);
    setActivityError('');
    adminService.getUserActivity(selected.id)
      .then(setActivity)
      .catch(() => setActivityError('Could not load this user\'s activity.'));
  }, [selected]);
  // Only an ADMIN can grant Staff or Admin — STAFF only ever sees the
  // "Make Astrologer" action. Mirrors the server-side check in
  // admin.routes.ts's PATCH /users/:id/role handler.
  const isAdmin = currentUser?.role === 'ADMIN';

  const assignRole = async (role: 'ASTROLOGIST' | 'STAFF' | 'ADMIN') => {
    if (!selected) return;
    setRoleError('');
    setRoleBusy(true);
    try {
      await updateAccountRole(selected.email, role);
      setSelected(null);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Could not update this account\'s role.');
    } finally {
      setRoleBusy(false);
    }
  };

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <AdminButton variant="gold" disabled={roleBusy} onClick={() => assignRole('ASTROLOGIST')}>Make Astrologer</AdminButton>
            {isAdmin && <AdminButton variant="outline" disabled={roleBusy} onClick={() => assignRole('STAFF')}>Make Staff</AdminButton>}
            {isAdmin && <AdminButton variant="outline" disabled={roleBusy} onClick={() => assignRole('ADMIN')}>Make Admin</AdminButton>}
            {accountStatus(selected.status) === 'ACTIVE'
              ? <AdminButton variant="danger" onClick={() => { suspendAccount(selected.email); setSelected(null); }}>{t('admin_action_suspend')}</AdminButton>
              : <AdminButton variant="gold" onClick={() => { restoreAccount(selected.email); setSelected(null); }}>{t('admin_action_restore')}</AdminButton>}
          </div>
        ) : undefined}
      >
        {selected && (
          <>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.email}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_joined')}</span><span className={styles.drawerFieldValue}>{joinedDate(selected.id)}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_reports')}</span><span className={styles.drawerFieldValue}>{activity ? activity.reports : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_consultations')}</span><span className={styles.drawerFieldValue}>{activity ? activity.consultations : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_orders')}</span><span className={styles.drawerFieldValue}>{activity ? activity.orders : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_status')}</span><span className={styles.drawerFieldValue}>{(() => { const s = accountStatus(selected.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; })()}</span></div>
            {activityError && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 8 }}>{activityError}</p>}
            {roleError && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 8 }}>{roleError}</p>}
          </>
        )}
      </Drawer>
    </div>
  );
}
