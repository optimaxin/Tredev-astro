import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiLead } from '../../services/adminService';
import DataTable from '../components/DataTable';
import { EmptyState } from '../components/SharedControls';
import { formatDateTime, visitFingerprint } from '../adminUtils';
import styles from './AdminPages.module.css';

// One row per distinct visitor — registered or anonymous — instead of one
// row per page view (that's the Overview page's "Recent Traffic" panel). An
// anonymous visitor is recognized across repeat visits by a sticky device id
// (see trackingService.ts), so "this device used the Flames calculator,
// came back, used Nakshatra" shows up as growing activity on ONE lead
// instead of a fresh anonymous stranger each time.
export default function LeadsPage() {
  const { t } = useAppContext();
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getLeads()
      .then(setLeads)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load leads.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_sidebar_leads')}</div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)', marginBottom: 16 }}>
        Every visitor, logged in or anonymous. An anonymous visitor is tracked by device, so a return visit
        adds to the same lead instead of showing up as someone new.
      </p>

      {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      {!loading && leads.length === 0 && (
        <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
      )}

      {leads.length > 0 && (
        <DataTable
          columns={[
            {
              key: 'who', label: 'Visitor', render: r => r.userEmail ? `${r.userName || r.userEmail} (${r.userEmail})` : (
                <span>Anonymous <span style={{ opacity: 0.6, fontSize: '0.75em' }}>#{r.id.slice(0, 8)}</span></span>
              ),
            },
            { key: 'phone', label: 'Phone', render: r => r.leadPhone || '—' },
            { key: 'fingerprint', label: 'Fingerprint', render: r => visitFingerprint(r) },
            { key: 'lastPath', label: 'Last Used', render: r => r.lastPath },
            { key: 'visits', label: 'Visits', render: r => r.visitCount },
            { key: 'firstSeen', label: 'First Seen', render: r => formatDateTime(r.firstSeen) },
            { key: 'lastSeen', label: 'Last Seen', render: r => formatDateTime(r.lastSeen) },
          ]}
          rows={leads}
          keyField="id"
        />
      )}
    </div>
  );
}
