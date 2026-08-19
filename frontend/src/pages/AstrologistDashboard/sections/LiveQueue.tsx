import React from 'react';
import { useRealtime } from '../../../realtime/RealtimeContext';
import { EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

function waitingFor(joinedAt: number) {
  const mins = Math.max(0, Math.round((Date.now() - joinedAt) / 60000));
  return mins < 1 ? 'just now' : `${mins} min`;
}

export default function LiveQueue() {
  const { astrologerSync, connected } = useRealtime();
  const queue = astrologerSync?.queue || [];

  return (
    <div>
      <SectionHeader title="Waiting Queue" subtitle="Live, server-managed — position and ETA update automatically as clients are served." />

      {!connected && <Panel><span className={styles.tableMuted}>Realtime service unreachable — queue data may be stale.</span></Panel>}

      {queue.length === 0 ? (
        <EmptyState icon="⏣" title="No one waiting" desc="Clients who book you while you're at capacity will appear here in real time." />
      ) : (
        <Panel>
          {queue.map(({ entry, position, eta }) => (
            <div key={entry.id} className={styles.requestCard}>
              <div className={styles.requestTop}>
                <span className={styles.requestAvatar}>#{position}</span>
                <div>
                  <div className={styles.requestName}>{entry.userName}</div>
                  <div className={styles.requestMeta}>{entry.category} · waiting {waitingFor(entry.joinedAt)} · ETA {eta.minMinutes}-{eta.maxMinutes} min</div>
                </div>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
