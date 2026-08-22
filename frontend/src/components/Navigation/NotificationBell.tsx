import { useEffect, useRef, useState } from 'react';
import { contentService } from '../../services/contentService';
import type { Broadcast } from '../../services/contentService';
import { BellIcon } from '../Icons/Icons';
import { playNotificationChime } from '../../realtime/sound';
import styles from './Navigation.module.css';

const POLL_MS = 30_000;

const DISMISSED_KEY = 'dismissed_broadcast_ids';

function loadDismissed(): number[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(loadDismissed);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // null = "haven't seen a first batch yet" — that first batch must not beep
  // (every reload would otherwise chime for old, already-known broadcasts).
  const knownIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    const poll = () => {
      contentService.listActiveBroadcasts().then(rows => {
        if (knownIdsRef.current && rows.some(b => !knownIdsRef.current!.has(b.id))) {
          playNotificationChime();
        }
        knownIdsRef.current = new Set(rows.map(b => b.id));
        setBroadcasts(rows);
      }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (open && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unread = broadcasts.filter(b => !dismissed.includes(b.id));

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  return (
    <div className={styles.notifWrapper} ref={wrapRef}>
      <button className={styles.cartBtn} onClick={() => setOpen(v => !v)} aria-label="Notifications">
        <BellIcon size={26} />
        {unread.length > 0 && <span className={styles.cartBadge}>{unread.length}</span>}
      </button>
      {open && (
        <div className={styles.notifDropdown}>
          {broadcasts.length === 0 ? (
            <div className={styles.notifEmpty}>No notifications right now.</div>
          ) : (
            broadcasts.map(b => (
              <div key={b.id} className={`${styles.notifItem} ${dismissed.includes(b.id) ? styles.notifItemRead : ''}`}>
                <span className={styles.notifItemText}>{b.message}</span>
                <div className={styles.notifItemFooter}>
                  <span className={styles.notifItemTime}>{timeAgo(b.createdAt)}</span>
                  {!dismissed.includes(b.id) && (
                    <button className={styles.notifItemDismiss} onClick={() => dismiss(b.id)}>Mark read</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
