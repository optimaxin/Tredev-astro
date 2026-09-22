import React, { useState } from 'react';
import { useRealtime } from '../../../realtime/RealtimeContext';
import { EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Requests() {
  const { astrologerSync, acceptAssignment } = useRealtime();
  const [busyId, setBusyId] = useState<string | null>(null);
  const pending = astrologerSync?.pendingAssignments || [];

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try { await acceptAssignment(id); } finally { setBusyId(null); }
  };

  return (
    <div>
      <SectionHeader title="Requests" subtitle="New consultation requests waiting for your response." />

      {pending.length === 0 ? (
        <EmptyState icon="◎" title="You're all caught up" desc="New consultation requests from clients will show up here in real time." />
      ) : (
        <Panel>
          {pending.map(req => (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.requestTop}>
                <span className={styles.requestAvatar}>{req.userName.charAt(0)}</span>
                <div>
                  <div className={styles.requestName}>{req.userName}</div>
                  <div className={styles.requestMeta}>{req.category} · {req.type} · {timeAgo(req.createdAt)}</div>
                </div>
              </div>
              <div className={styles.requestActions}>
                <button className={`${styles.btnSm} ${styles.btnGold}`} disabled={busyId === req.id} onClick={() => handleAccept(req.id)}>Accept</button>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
