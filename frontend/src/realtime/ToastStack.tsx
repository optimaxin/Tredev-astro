import React from 'react';
import { useRealtime } from './RealtimeContext';
import styles from './realtime.module.css';

export default function ToastStack() {
  const { toasts, dismissToast } = useRealtime();
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastStack} role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles['toast_' + t.tone]}`} onClick={() => dismissToast(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
