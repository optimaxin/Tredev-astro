import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiBroadcast, BroadcastAudience } from '../../services/adminService';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

const AUDIENCE_OPTIONS: { value: BroadcastAudience; label: string }[] = [
  { value: 'USER', label: 'Users' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'ASTROLOGIST', label: 'Astrologers' },
];

export default function NotificationsPage() {
  const { t, logAdminAction } = useAppContext();
  const [broadcasts, setBroadcasts] = useState<ApiBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [audiences, setAudiences] = useState<BroadcastAudience[]>(['USER']);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const toggleAudience = (value: BroadcastAudience) => {
    setAudiences(prev => prev.includes(value) ? prev.filter(a => a !== value) : [...prev, value]);
  };

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
    if (audiences.length === 0) return setError('Pick at least one audience.');
    setSending(true);
    setError('');
    try {
      await adminService.createBroadcast(message.trim(), audiences);
      logAdminAction('SEND_BROADCAST', `${message.trim().slice(0, 80)} -> ${audiences.join(',')}`);
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
        <div className={styles.pageSub}>Shows as a banner immediately to whichever audience(s) you pick below.</div>
      </div>

      <div className={styles.section}>
        <form onSubmit={handleSend}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_message')}</label>
            <textarea className={styles.formTextarea} required maxLength={500} value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Send to</label>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {AUDIENCE_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={audiences.includes(opt.value)} onChange={() => toggleAudience(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
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
              <span className={styles.drawerFieldLabel}>
                {b.message}
                <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.65, marginTop: 2 }}>
                  {b.audiences.filter(a => a !== 'ADMIN').join(', ') || 'Admins only'}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={styles.drawerFieldValue}>{formatDateTime(b.createdAt)}</span>
                <AdminButton variant="danger" onClick={() => handleRemove(b)}>Remove</AdminButton>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
