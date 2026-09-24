import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatDateShort, EmptyState, SectionHeader } from './shared';
import styles from './sections.module.css';

const CATEGORIES: { key: string; label: string; kinds: string[] }[] = [
  { key: 'all', label: 'All', kinds: [] },
  { key: 'bookings', label: 'Bookings', kinds: ['request'] },
  { key: 'payments', label: 'Payments', kinds: ['payment'] },
  { key: 'reviews', label: 'Reviews', kinds: ['review'] },
  { key: 'platform', label: 'Platform', kinds: ['system'] },
  { key: 'profile', label: 'Profile', kinds: ['profile'] },
];

export default function Notifications() {
  const { astrologerNotifications, markNotificationRead, markAllNotificationsRead } = useAppContext();
  const [category, setCategory] = useState('all');

  const active = CATEGORIES.find(c => c.key === category)!;
  const filtered = astrologerNotifications
    .filter(n => active.kinds.length === 0 || active.kinds.includes(n.kind || ''))
    .sort((a, b) => b.at.localeCompare(a.at));
  const unread = astrologerNotifications.filter(n => !n.read).length;

  return (
    <div>
      <SectionHeader title="Notifications" subtitle="Booking, payment, review, and platform updates." actions={unread > 0 ? <button className={styles.iconBtn} onClick={markAllNotificationsRead}>Mark All as Read</button> : undefined} />

      <div className={styles.tabs}>
        {CATEGORIES.map(c => (
          <button key={c.key} className={`${styles.tab} ${category === c.key ? styles.tabActive : ''}`} onClick={() => setCategory(c.key)}>{c.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="♃" title="No notifications" desc="You're all caught up." />
      ) : (
        <div className={styles.panel}>
          {filtered.map(n => (
            <div key={n.id} className={`${styles.notifRow} ${n.read ? '' : styles.notifRowUnread}`} onClick={() => markNotificationRead(n.id)}>
              <span className={styles.notifDot} />
              <div>
                <div className={styles.notifText}>{n.message}</div>
                <div className={styles.notifTime}>{formatDateShort(n.at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
