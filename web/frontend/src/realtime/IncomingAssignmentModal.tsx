import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ASTROLOGERS } from '../data/mockData';
import { useRealtime } from './RealtimeContext';
import styles from './realtime.module.css';

// Section 6: a prominent, dashboard-refresh-free notification the moment a
// consultation is assigned. Shown globally (not tied to any one dashboard
// section) so it appears no matter where the astrologer currently is.
export default function IncomingAssignmentModal() {
  const { currentUser } = useAppContext();
  const { astrologerSync, acceptAssignment } = useRealtime();
  const [busy, setBusy] = useState(false);
  const profile = ASTROLOGERS.find(a => a.name === currentUser?.name) || ASTROLOGERS[0];

  const next = astrologerSync?.pendingAssignments[0];
  if (!next) return null;

  const handleAccept = async () => {
    setBusy(true);
    try { await acceptAssignment(next.id); } finally { setBusy(false); }
  };

  return (
    <div className={styles.assignBackdrop}>
      <div className={styles.assignCard}>
        <div className={styles.assignEyebrow}>New Chat Request</div>
        <div className={styles.assignName}>{next.userName}</div>
        <div className={styles.assignMeta}>wants to start a consultation.</div>
        <div className={styles.assignRow}><span>Category</span><span>{next.category}</span></div>
        <div className={styles.assignRow}><span>Type</span><span style={{ textTransform: 'capitalize' }}>{next.type}</span></div>
        <div className={styles.assignRow}><span>Rate</span><span>₹{profile.price}/min</span></div>
        <div className={styles.assignActions}>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy} onClick={handleAccept}>Accept</button>
        </div>
        {astrologerSync && astrologerSync.pendingAssignments.length > 1 && (
          <div className={styles.assignMeta} style={{ marginTop: 10, textAlign: 'center' }}>+{astrologerSync.pendingAssignments.length - 1} more waiting</div>
        )}
      </div>
    </div>
  );
}
