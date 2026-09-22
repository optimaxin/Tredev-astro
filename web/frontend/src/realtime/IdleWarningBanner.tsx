import React from 'react';
import { useRealtime } from './RealtimeContext';
import styles from './realtime.module.css';

// The server independently and authoritatively flips status to AWAY after
// awayTimeoutMinutes of no heartbeat — this banner is purely the client-side
// warning shown in the grace window before that happens (spec section 22).
export default function IdleWarningBanner() {
  const { idleWarning, stayOnline } = useRealtime();
  if (!idleWarning) return null;

  return (
    <div className={styles.idleBanner}>
      <span>You appear inactive. You'll stop receiving new consultation requests soon.</span>
      <button className="btn btn-gold btn-sm" onClick={stayOnline}>Stay Online</button>
    </div>
  );
}
