import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Announcement } from '../adminTypes';
import { AdminButton, EmptyState } from '../components/SharedControls';
import { formatDateTime } from '../adminUtils';
import styles from './AdminPages.module.css';

const STORAGE_KEY = 'admin_announcements';

function loadAnnouncements(): Announcement[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export default function NotificationsPage() {
  const { t, logAdminAction } = useAppContext();
  const [history, setHistory] = useState<Announcement[]>(loadAnnouncements);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<Announcement['audience']>('ALL_USERS');
  const [targetEmail, setTargetEmail] = useState('');
  const [schedule, setSchedule] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: Announcement = {
      id: `ann-${history.length + 1}`,
      title,
      message,
      audience,
      targetEmail: audience === 'SPECIFIC_USER' ? targetEmail : undefined,
      scheduledAt: schedule === 'later' && scheduledAt ? scheduledAt : null,
      sentAt: new Date().toISOString(),
    };
    const next = [entry, ...history];
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    logAdminAction('SEND_ANNOUNCEMENT', audience === 'SPECIFIC_USER' ? targetEmail : audience);
    setTitle(''); setMessage(''); setTargetEmail(''); setScheduledAt('');
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const audienceLabel = (a: Announcement['audience']) =>
    a === 'ALL_USERS' ? t('admin_notif_target_all_users') : a === 'ALL_ASTROLOGERS' ? t('admin_notif_target_all_astrologers') : t('admin_notif_target_specific_user');

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_notif_title')}</div>
      </div>

      <div className={styles.section}>
        <form onSubmit={handleSend}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_title')}</label>
            <input className={styles.formInput} required value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_message')}</label>
            <textarea className={styles.formTextarea} required value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_audience')}</label>
            <select className={styles.formSelect} value={audience} onChange={e => setAudience(e.target.value as Announcement['audience'])}>
              <option value="ALL_USERS">{t('admin_notif_target_all_users')}</option>
              <option value="ALL_ASTROLOGERS">{t('admin_notif_target_all_astrologers')}</option>
              <option value="SPECIFIC_USER">{t('admin_notif_target_specific_user')}</option>
            </select>
          </div>
          {audience === 'SPECIFIC_USER' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_notif_field_user_email')}</label>
              <input type="email" className={styles.formInput} required value={targetEmail} onChange={e => setTargetEmail(e.target.value)} />
            </div>
          )}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_notif_field_schedule')}</label>
            <label className={styles.radioRow}>
              <input type="radio" checked={schedule === 'now'} onChange={() => setSchedule('now')} /> {t('admin_notif_schedule_now')}
            </label>
            <label className={styles.radioRow}>
              <input type="radio" checked={schedule === 'later'} onChange={() => setSchedule('later')} /> {t('admin_notif_schedule_later')}
            </label>
            {schedule === 'later' && (
              <input type="datetime-local" className={styles.formInput} required value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            )}
          </div>
          {sent && <p style={{ color: 'var(--adm-success)', fontSize: '0.82rem', marginBottom: 10 }}>{t('admin_notif_sent')}</p>}
          <AdminButton variant="gold" type="submit">{t('admin_action_send')}</AdminButton>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('admin_notif_history')}</div>
        {history.length === 0
          ? <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
          : history.map(a => (
            <div key={a.id} className={styles.drawerField}>
              <span className={styles.drawerFieldLabel}>{a.title} — {audienceLabel(a.audience)}{a.targetEmail ? ` (${a.targetEmail})` : ''}</span>
              <span className={styles.drawerFieldValue}>{formatDateTime(a.sentAt)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
