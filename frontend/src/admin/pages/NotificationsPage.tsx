import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiBroadcast } from '../../services/adminService';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

export default function NotificationsPage() {
  const { t, logAdminAction } = useAppContext();
  const [broadcasts, setBroadcasts] = useState<ApiBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listBroadcasts()
      .then(rows => setBroadcasts(rows.filter(b => b.active)))
      .catch(() => setBroadcasts([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await adminService.createBroadcast(message.trim());
      logAdminAction('SEND_BROADCAST', message.trim().slice(0, 80));
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      load();
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not send this broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (b: ApiBroadcast) => {
    await adminService.deleteBroadcast(b.id);
    logAdminAction('REMOVE_BROADCAST', b.message.slice(0, 80));
    setBroadcasts(prev => prev.filter(x => x.id !== b.id));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_notif_title')}</div>
        <div className={styles.pageSub}>Broadcasts here show as a site-wide banner to every visitor, immediately.</div>
      </div>

      <div className={styles.section}>
        <form onSubmit={handleSend}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_message')}</label>
            <textarea className={styles.formTextarea} required maxLength={500} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {sent && <p style={{ color: 'var(--adm-success)', fontSize: '0.82rem', marginBottom: 10 }}>{t('admin_notif_sent')}</p>}
          {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>}
          <AdminButton variant="gold" type="submit" disabled={sending || !message.trim()}>
            {sending ? 'Sending...' : t('admin_action_send')}
          </AdminButton>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Active Broadcasts</div>
        {!loading && broadcasts.length === 0
          ? <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
          : broadcasts.map(b => (
            <div key={b.id} className={styles.drawerField}>
              <span className={styles.drawerFieldLabel}>{b.message}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={styles.drawerFieldValue}>{formatDateTime(new Date(b.createdAt).toISOString())}</span>
                <AdminButton variant="danger" onClick={() => handleRemove(b)}>Remove</AdminButton>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
