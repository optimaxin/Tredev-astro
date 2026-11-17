import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AuthUser } from '../../context/AppContext';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, SearchInput, EmptyState, AdminButton, ChatAuditPanel } from '../components/SharedControls';
import { adminService } from '../../services/adminService';
import type { ApiUserActivity } from '../../services/adminService';
import { accountStatus, formatDate, formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

const PAGE_SIZE = 8;

function joinedDate(id: string): string {
  const match = /^u-(\d+)$/.exec(id);
  return match ? formatDate(new Date(Number(match[1])).toISOString()) : '—';
}

function dobDisplay(u: AuthUser): string {
  return u.birthDate ? formatDate(new Date(u.birthDate).toISOString()) : '—';
}

type RoleFilter = 'ALL' | 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';

export default function UsersPage() {
  const { t, accounts, suspendAccount, restoreAccount, updateAccountRole, currentUser, refreshAdminData } = useAppContext();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  // Was hardcoded to role==='USER' only — an admin couldn't find or block a
  // Staff/Astrologer/Admin account here at all, only plain Users. This is
  // now the "block ANY account" surface; role is just another filter.
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [activity, setActivity] = useState<ApiUserActivity | null>(null);
  const [activityError, setActivityError] = useState('');
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [grantMinutes, setGrantMinutes] = useState('5');
  const [grantBusy, setGrantBusy] = useState(false);
  const [grantError, setGrantError] = useState('');
  const [grantDone, setGrantDone] = useState(false);

  // Fetched fresh per user when the drawer opens (was 3 name-matched counts
  // against SAMPLE_* mock arrays) — kept out of the main table since that
  // would mean a fetch per visible row instead of one per drawer open.
  useEffect(() => {
    if (!selected) { setActivity(null); return; }
    setActivity(null);
    setActivityError('');
    setGrantError('');
    setGrantDone(false);
    adminService.getUserActivity(selected.id)
      .then(setActivity)
      .catch(() => setActivityError('Could not load this user\'s activity.'));
  }, [selected]);

  // Dispute resolution for the "Ask TredevaAstro" free AI chat session — a
  // real, server-tracked balance (see userRepository.ts's
  // setFreeAiChatSeconds), not just the old client-side 5-minute countdown.
  const grantFreeAiChat = async () => {
    if (!selected) return;
    const minutes = Number(grantMinutes);
    if (!Number.isFinite(minutes) || minutes < 0) { setGrantError('Enter a valid number of minutes (0 or more).'); return; }
    setGrantBusy(true);
    setGrantError('');
    setGrantDone(false);
    try {
      const seconds = Math.round(minutes * 60);
      await adminService.setFreeAiChatSeconds(selected.id, seconds);
      setSelected({ ...selected, freeAiChatSeconds: seconds });
      setGrantDone(true);
      refreshAdminData();
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Could not update this account\'s free chat time.');
    } finally {
      setGrantBusy(false);
    }
  };
  // Only an ADMIN can grant Staff or Admin — STAFF only ever sees the
  // "Make Astrologer" action. Mirrors the server-side check in
  // admin.routes.ts's PATCH /users/:id/role handler.
  const isAdmin = currentUser?.role === 'ADMIN';

  const assignRole = async (role: 'STAFF' | 'ADMIN') => {
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
      .filter(a => roleFilter === 'ALL' || a.role === roleFilter)
      .filter(a => filter === 'ALL' || accountStatus(a.status) === filter)
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phoneNumber?.toLowerCase().includes(q));
  }, [accounts, filter, roleFilter, search]);

  // A Staff viewer can only touch (suspend/restore) plain User/Astrologer
  // accounts — mirrors admin.routes.ts's own restriction on PATCH
  // /users/:id/status, so this button never shows only to 403 when clicked.
  const canModerate = (u: AuthUser) => isAdmin || (u.role !== 'ADMIN' && u.role !== 'STAFF');

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
            { key: 'USER', label: t('admin_sidebar_users') },
            { key: 'ASTROLOGIST', label: t('admin_kpi_astrologers') },
            { key: 'STAFF', label: t('admin_staff_role_staff') },
            { key: 'ADMIN', label: t('admin_staff_role_admin') },
          ]}
          active={roleFilter}
          onChange={k => { setRoleFilter(k as RoleFilter); setPage(1); }}
        />
        <FilterBar
          filters={[
            { key: 'ALL', label: t('admin_status_all') },
            { key: 'ACTIVE', label: t('admin_status_active') },
            { key: 'SUSPENDED', label: t('admin_status_suspended') },
          ]}
          active={filter}
          onChange={k => { setFilter(k as any); setPage(1); }}
        />
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, email, or phone" />
      </div>

      <DataTable
        columns={[
          { key: 'user', label: t('admin_users_col_user'), render: u => (<div><div style={{ fontWeight: 700 }}>{u.name}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{u.email}</div></div>) },
          { key: 'role', label: t('admin_staff_col_role'), render: u => u.role },
          { key: 'dob', label: 'Date of Birth', render: u => dobDisplay(u) },
          { key: 'joined', label: t('admin_users_col_joined'), render: u => joinedDate(u.id) },
          { key: 'wallet', label: 'Wallet', render: u => `₹${(u.walletBalance ?? 0).toLocaleString('en-IN')}` },
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
        wide
        footer={selected ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* Promoting to Staff/Admin only makes sense starting from a plain
                User — Staff/Admin accounts already have a dedicated page
                (Staff). Astrologist accounts are no longer created or removed
                from here — this console is view-only for astrologers (see
                AstrologersPage's activity/audit tab). */}
            {selected.role === 'USER' && isAdmin && <AdminButton variant="outline" disabled={roleBusy} onClick={() => assignRole('STAFF')}>Make Staff</AdminButton>}
            {selected.role === 'USER' && isAdmin && <AdminButton variant="outline" disabled={roleBusy} onClick={() => assignRole('ADMIN')}>Make Admin</AdminButton>}
            {canModerate(selected) && (accountStatus(selected.status) === 'ACTIVE'
              ? <AdminButton variant="danger" onClick={() => { suspendAccount(selected.email); setSelected(null); }}>{t('admin_action_suspend')}</AdminButton>
              : <AdminButton variant="gold" onClick={() => { restoreAccount(selected.email); setSelected(null); }}>{t('admin_action_restore')}</AdminButton>)}
          </div>
        ) : undefined}
      >
        {selected && (
          <>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.email}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Date of Birth</span><span className={styles.drawerFieldValue}>{dobDisplay(selected)}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_joined')}</span><span className={styles.drawerFieldValue}>{joinedDate(selected.id)}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Wallet Balance</span><span className={styles.drawerFieldValue}>₹{(selected.walletBalance ?? 0).toLocaleString('en-IN')}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_reports')}</span><span className={styles.drawerFieldValue}>{activity ? activity.reports : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_consultations')}</span><span className={styles.drawerFieldValue}>{activity ? activity.consultations : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_orders')}</span><span className={styles.drawerFieldValue}>{activity ? activity.orders : activityError ? '—' : '…'}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_users_col_status')}</span><span className={styles.drawerFieldValue}>{(() => { const s = accountStatus(selected.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; })()}</span></div>
            {activityError && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 8 }}>{activityError}</p>}
            {roleError && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 8 }}>{roleError}</p>}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Free AI Chat (Ask TredevaAstro)</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', marginBottom: 10 }}>
                Currently available: <strong>{Math.round((selected.freeAiChatSeconds ?? 0) / 60)} min</strong>. Set a new amount below — e.g. to resolve a dispute by granting another free session.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number" min={0} step={1} value={grantMinutes} onChange={e => setGrantMinutes(e.target.value)}
                  style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--adm-border, #e5e0d8)', fontFamily: 'inherit', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)' }}>minutes</span>
                <AdminButton variant="gold" disabled={grantBusy} onClick={grantFreeAiChat}>{grantBusy ? 'Saving…' : 'Set Free Chat Time'}</AdminButton>
              </div>
              {grantError && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: 8 }}>{grantError}</p>}
              {grantDone && <p style={{ color: 'var(--adm-success, #2e7d32)', fontSize: '0.8rem', marginTop: 8 }}>Updated.</p>}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Recent Activity</div>
              {activity && activity.recentPageViews.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)' }}>No page visits recorded yet.</p>}
              {activity && activity.recentPageViews.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activity.recentPageViews.map((v, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', gap: 10 }}>
                      <span style={{ fontWeight: 600 }}>{v.path}</span>
                      <span style={{ color: 'var(--adm-charcoal-soft)', whiteSpace: 'nowrap' }}>{formatDateTime(v.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
              <ChatAuditPanel
                recentChats={activity ? activity.recentChats : activityError ? [] : null}
                lastAction={activity?.lastAction ?? null}
                loadError={activityError}
                onRaiseWarning={note => adminService.logNote('audit.warning', `${selected.name} (${selected.email}): ${note}`).then(() => {})}
              />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
