import { useEffect, useState } from 'react';
import { contentService } from '../../services/contentService';
import type { Broadcast } from '../../services/contentService';
import styles from './BroadcastBanner.module.css';

const DISMISSED_KEY = 'dismissed_broadcast_ids';

function loadDismissed(): number[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

export default function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [dismissed, setDismissed] = useState<number[]>(loadDismissed);

  useEffect(() => {
    contentService.listActiveBroadcasts().then(setBroadcasts).catch(() => setBroadcasts([]));
  }, []);

  const visible = broadcasts.filter(b => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  return (
    <div className={styles.stack}>
      {visible.map(b => (
        <div key={b.id} className={styles.banner}>
          <span className={styles.icon}>✦</span>
          <span className={styles.message}>{b.message}</span>
          <button className={styles.close} onClick={() => dismiss(b.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
