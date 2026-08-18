import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AstrologerApplication } from '../../context/AppContext';
import { ASTROLOGERS } from '../../data/mockData';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, SearchInput, EmptyState, ConfirmDialog, AdminButton } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

type FilterKey = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function ApplicationsPage() {
  const { t, applications, approveApplication, rejectApplication, logAdminAction } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AstrologerApplication | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  const languagesFor = (app: AstrologerApplication) => {
    const match = ASTROLOGERS.find(a => a.name === app.userName);
    return match ? match.languages.join(', ') : '—';
  };

  const filtered = useMemo(() => {
    return applications.filter(a => {
      if (filter !== 'ALL' && a.status !== filter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return a.userName.toLowerCase().includes(q) || a.userEmail.toLowerCase().includes(q);
    });
  }, [applications, filter, search]);

  const closeDrawer = () => { setSelected(null); setConfirmAction(null); };

  const handleConfirm = () => {
    if (!selected || !confirmAction) return;
    if (confirmAction === 'approve') approveApplication(selected.id);
    else rejectApplication(selected.id);
    setConfirmAction(null);
    closeDrawer();
  };

  const handleRequestInfo = () => {
    if (!selected) return;
    logAdminAction('REQUEST_APPLICATION_INFO', selected.userEmail);
    closeDrawer();
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_apps_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'PENDING', label: t('admin_status_pending') },
            { key: 'APPROVED', label: t('admin_status_approved') },
            { key: 'REJECTED', label: t('admin_status_rejected') },
            { key: 'ALL', label: t('admin_status_all') },
          ]}
          active={filter}
          onChange={k => setFilter(k as FilterKey)}
        />
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_name_email')} />
      </div>

      <DataTable
        columns={[
          { key: 'applicant', label: t('admin_apps_col_applicant'), render: a => (<div><div style={{ fontWeight: 700 }}>{a.userName}</div><div style={{ fontSize: '0.72rem', color: 'var(--adm-muted)' }}>{a.userEmail}</div></div>) },
          { key: 'experience', label: t('admin_apps_col_experience'), render: a => a.experience },
          { key: 'languages', label: t('admin_apps_col_languages'), render: languagesFor },
          { key: 'expertise', label: t('admin_apps_col_expertise'), render: a => a.expertise },
          { key: 'submitted', label: t('admin_apps_col_submitted'), render: a => formatDate(a.submittedAt) },
          { key: 'status', label: t('admin_apps_col_status'), render: a => <StatusBadge status={a.status} label={t(`admin_status_${a.status.toLowerCase()}`)} /> },
          { key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: a => <AdminButton onClick={() => setSelected(a)}>{t('admin_action_view')}</AdminButton> },
        ]}
        rows={filtered}
        keyField="id"
        onRowClick={setSelected}
        emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
      />

      <Drawer
        open={!!selected}
        onClose={closeDrawer}
        title={t('admin_apps_title')}
        footer={selected?.status === 'PENDING' ? (
          <>
            <AdminButton variant="danger" onClick={() => setConfirmAction('reject')}>{t('admin_action_reject')}</AdminButton>
            <AdminButton variant="outline" onClick={handleRequestInfo}>{t('admin_action_request_info')}</AdminButton>
            <AdminButton variant="gold" onClick={() => setConfirmAction('approve')}>{t('admin_action_approve')}</AdminButton>
          </>
        ) : undefined}
      >
        {selected && (
          <>
            <div className={styles.drawerSectionTitle}>{t('admin_apps_drawer_profile')}</div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Name</span><span className={styles.drawerFieldValue}>{selected.userName}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.userEmail}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Phone</span><span className={styles.drawerFieldValue}>—</span></div>

            <div className={styles.drawerSectionTitle}>{t('admin_apps_drawer_professional')}</div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_experience')}</span><span className={styles.drawerFieldValue}>{selected.experience}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_expertise')}</span><span className={styles.drawerFieldValue}>{selected.expertise}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_apps_col_languages')}</span><span className={styles.drawerFieldValue}>{languagesFor(selected)}</span></div>

            <div className={styles.drawerSectionTitle}>{t('admin_apps_drawer_documents')}</div>
            <EmptyState title={t('admin_apps_no_docs')} />
          </>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'approve' ? t('admin_apps_confirm_approve_title') : t('admin_apps_confirm_reject_title')}
        description={confirmAction === 'approve' ? t('admin_apps_confirm_approve_desc') : t('admin_apps_confirm_reject_desc')}
        confirmLabel={confirmAction === 'approve' ? t('admin_action_approve') : t('admin_action_reject')}
        cancelLabel={t('admin_action_cancel')}
        variant={confirmAction === 'reject' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
