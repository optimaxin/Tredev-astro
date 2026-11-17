import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiApplication } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, EmptyState, AdminButton, ConfirmDialog } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

// The actual "add an astrologer" path — a user applies from the public site
// (POST /api/astrologers/applications), and this is where Staff/Admin
// approves or rejects that application. Approving hands them a real
// Astrologist account + catalog row (backend/app/api/admin.routes.ts's
// POST /applications/:id/decide); there is no direct "add astrologer" form
// anywhere, by design (see the Astrologers page's own comment).
export default function ApplicationsPage() {
  const { t } = useAppContext();
  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [selected, setSelected] = useState<ApiApplication | null>(null);
  const [profileTab, setProfileTab] = useState('profile');
  const [confirm, setConfirm] = useState<{ app: ApiApplication; decision: 'APPROVED' | 'REJECTED' } | null>(null);
  const [deciding, setDeciding] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listApplications()
      .then(setApps)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load applications.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const rows = useMemo(() => apps.filter(a => filter === 'ALL' || a.status === filter), [apps, filter]);

  const decide = async () => {
    if (!confirm) return;
    setDeciding(true);
    setError('');
    try {
      await adminService.decideApplication(confirm.app.id, confirm.decision);
      setApps(prev => prev.map(a => a.id === confirm.app.id ? { ...a, status: confirm.decision, decidedAt: Date.now() } : a));
      setConfirm(null);
      setSelected(null);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not update this application.');
    } finally {
      setDeciding(false);
    }
  };

  const TABS = [
    { key: 'profile', labelKey: 'admin_apps_drawer_profile' },
    { key: 'professional', labelKey: 'admin_apps_drawer_professional' },
    { key: 'documents', labelKey: 'admin_apps_drawer_documents' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_apps_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'PENDING', label: t('admin_status_pending') },
            { key: 'ALL', label: t('admin_status_all') },
            { key: 'APPROVED', label: t('admin_status_approved') },
            { key: 'REJECTED', label: t('admin_status_rejected') },
          ]}
          active={filter}
          onChange={k => setFilter(k as typeof filter)}
        />
      </div>

      {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.85rem', marginBottom: 16 }}>{error}</p>}

      <DataTable
        columns={[
          {
            key: 'applicant', label: t('admin_apps_col_applicant'), render: (a: ApiApplication) => (
              <div><div style={{ fontWeight: 700 }}>{a.userName}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{a.userEmail}</div></div>
            ),
          },
          { key: 'expertise', label: t('admin_apps_col_expertise'), render: (a: ApiApplication) => a.expertise },
          { key: 'experience', label: t('admin_apps_col_experience'), render: (a: ApiApplication) => a.experience },
          { key: 'submitted', label: t('admin_apps_col_submitted'), render: (a: ApiApplication) => formatDate(new Date(a.submittedAt).toISOString()) },
          { key: 'status', label: t('admin_apps_col_status'), render: (a: ApiApplication) => <StatusBadge status={a.status} label={t(`admin_status_${a.status.toLowerCase()}`)} /> },
          {
            key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: (a: ApiApplication) => (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <AdminButton onClick={() => { setSelected(a); setProfileTab('profile'); }}>{t('admin_action_view')}</AdminButton>
                {a.status === 'PENDING' && <AdminButton variant="gold" onClick={() => setConfirm({ app: a, decision: 'APPROVED' })}>{t('admin_action_approve')}</AdminButton>}
                {a.status === 'PENDING' && <AdminButton variant="danger" onClick={() => setConfirm({ app: a, decision: 'REJECTED' })}>{t('admin_action_reject')}</AdminButton>}
              </div>
            ),
          },
        ]}
        rows={loading ? [] : rows}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={loading ? 'Loading…' : t('admin_empty_desc')} />}
      />

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.userName || ''} wide>
        {selected && (
          <>
            <div className={styles.tabsRow}>
              {TABS.map(tab => (
                <button key={tab.key} className={`${styles.tabBtn} ${profileTab === tab.key ? styles.tabBtnActive : ''}`} onClick={() => setProfileTab(tab.key)}>
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>

            {profileTab === 'profile' && (
              <>
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.userEmail}</span></div>
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_submitted')}</span><span className={styles.drawerFieldValue}>{formatDate(new Date(selected.submittedAt).toISOString())}</span></div>
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_status')}</span><span className={styles.drawerFieldValue}><StatusBadge status={selected.status} label={t(`admin_status_${selected.status.toLowerCase()}`)} /></span></div>
              </>
            )}
            {profileTab === 'professional' && (
              <>
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_expertise')}</span><span className={styles.drawerFieldValue}>{selected.expertise}</span></div>
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_experience')}</span><span className={styles.drawerFieldValue}>{selected.experience}</span></div>
              </>
            )}
            {profileTab === 'documents' && <EmptyState title={t('admin_apps_no_docs')} />}

            {selected.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
                <AdminButton variant="gold" onClick={() => setConfirm({ app: selected, decision: 'APPROVED' })}>{t('admin_action_approve')}</AdminButton>
                <AdminButton variant="danger" onClick={() => setConfirm({ app: selected, decision: 'REJECTED' })}>{t('admin_action_reject')}</AdminButton>
              </div>
            )}
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirm}
        title={t(confirm?.decision === 'APPROVED' ? 'admin_apps_confirm_approve_title' : 'admin_apps_confirm_reject_title')}
        description={t(confirm?.decision === 'APPROVED' ? 'admin_apps_confirm_approve_desc' : 'admin_apps_confirm_reject_desc')}
        confirmLabel={deciding ? '…' : t(confirm?.decision === 'APPROVED' ? 'admin_action_approve' : 'admin_action_reject')}
        cancelLabel={t('admin_action_cancel')}
        variant={confirm?.decision === 'REJECTED' ? 'danger' : 'default'}
        onConfirm={decide}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
