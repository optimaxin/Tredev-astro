import { useEffect, useState } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useAppContext } from '../../context/AppContext';
import styles from './ActiveSessionBanner.module.css';

// A floating "return to your session" button, mounted once at the app root
// (outside PageRenderer's page switch) so it survives navigation. Call and
// chat both only ever render inside the 'consultation-waiting' page — if
// either party clicks away while a session is live, this is the only way
// back without losing track that it's still running.
export default function ActiveSessionBanner() {
  const { astrologerSync, userSync } = useRealtime();
  const { page, setPage } = useAppContext();
  const [, forceTick] = useState(0);

  const consultation = astrologerSync?.activeConsultation || userSync?.consultation || null;
  const isLive = !!consultation && (consultation.status === 'ACTIVE' || consultation.status === 'ACCEPTED');

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => forceTick(t => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  if (!isLive || page === 'consultation-waiting') return null;

  const elapsedSec = consultation!.startedAt ? Math.max(0, Math.floor((Date.now() - consultation!.startedAt) / 1000)) : 0;
  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  const label = consultation!.type === 'chat' ? 'Chat' : 'Call';

  return (
    <button className={styles.banner} onClick={() => setPage('consultation-waiting')} type="button">
      <span className={styles.dot} />
      {label} in progress — {mm}:{ss} — tap to return
    </button>
  );
}
