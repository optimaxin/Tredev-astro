import React from 'react';
import { useRealtime } from './RealtimeContext';
import styles from './realtime.module.css';

// Shown once on first dashboard visit (spec section 8). Browsers don't allow
// arbitrary autoplay audio or silent Notification permission requests — both
// have to follow an explicit user gesture, so this is that gesture. If the
// astrologer skips it, chat assignments still work fully; they just won't
// get a sound/OS notification, only the in-dashboard toast + badge.
export default function NotificationPermissionOnboarding() {
  const { notifPrefs, completeOnboarding } = useRealtime();
  if (notifPrefs.onboarded) return null;

  return (
    <div className={styles.onboardBanner}>
      <div>
        <strong>Enable chat notifications?</strong>
        <p className={styles.onboardText}>Get a sound and browser alert the moment a client is assigned to you. You can change this anytime in Settings.</p>
      </div>
      <div className={styles.onboardActions}>
        <button className="btn btn-gold btn-sm" onClick={() => completeOnboarding(true, true)}>Enable Sound &amp; Browser Alerts</button>
        <button className="btn btn-outline-light btn-sm" onClick={() => completeOnboarding(false, false)}>Visual Only</button>
      </div>
    </div>
  );
}
