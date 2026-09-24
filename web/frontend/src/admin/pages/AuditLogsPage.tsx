import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import DataTable from '../components/DataTable';
import { StatusBadge, SearchInput, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

export default function AuditLogsPage() {
  const { t, auditLog } = useAppContext();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditLog;
    return auditLog.filter(e =>
      e.actor.toLowerCase().includes(q) || e.target.toLowerCase().includes(q) || e.action.toLowerCase().includes(q)
    );
  }, [auditLog, search]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_audit_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_name_email')} />
      </div>

      <DataTable
        columns={[
          { key: 'timestamp', label: t('admin_audit_col_timestamp'), render: e => formatDateTime(e.at) },
          { key: 'admin', label: t('admin_audit_col_admin'), render: e => e.actor },
          { key: 'action', label: t('admin_audit_col_action'), render: e => e.action.replace(/_/g, ' ') },
          { key: 'target', label: t('admin_audit_col_target'), render: e => e.target },
          { key: 'ip', label: t('admin_audit_col_ip'), render: () => '—' },
          { key: 'status', label: t('admin_audit_col_status'), render: () => <StatusBadge status="COMPLETED" label={t('admin_status_completed')} /> },
        ]}
        rows={filtered}
        keyField="id"
        emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
      />
    </div>
  );
}
