import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatWhen, StatusBadge, EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

export default function Requests() {
  const { consultationRequests, acceptConsultationRequest, declineConsultationRequest } = useAppContext();
  const pending = consultationRequests.filter(r => r.status === 'PENDING').sort((a, b) => a.requestedFor.localeCompare(b.requestedFor));
  const decided = consultationRequests.filter(r => r.status !== 'PENDING').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div>
      <SectionHeader title="Requests" subtitle="New consultation requests waiting for your response." />

      {pending.length === 0 ? (
        <EmptyState icon="◎" title="You're all caught up" desc="New consultation requests from clients will show up here." />
      ) : (
        <Panel>
          {pending.map(req => (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.requestTop}>
                <span className={styles.requestAvatar}>{req.clientName.charAt(0)}</span>
                <div>
                  <div className={styles.requestName}>{req.clientName}</div>
                  <div className={styles.requestMeta}>{req.service} · {formatWhen(req.requestedFor)} · {req.duration} min</div>
                </div>
                <span className={styles.requestAmount}>₹{req.price}</span>
              </div>
              <div className={styles.requestActions}>
                <button className={`${styles.btnSm} ${styles.btnGold}`} onClick={() => acceptConsultationRequest(req.id)}>Accept</button>
                <button className={styles.btnSm} onClick={() => declineConsultationRequest(req.id)}>Decline</button>
              </div>
            </div>
          ))}
        </Panel>
      )}

      {decided.length > 0 && (
        <Panel title="Recently Decided">
          {decided.slice(0, 8).map(req => (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.requestTop}>
                <span className={styles.requestAvatar}>{req.clientName.charAt(0)}</span>
                <div>
                  <div className={styles.requestName}>{req.clientName}</div>
                  <div className={styles.requestMeta}>{req.service} · {formatWhen(req.requestedFor)}</div>
                </div>
                <span className={styles.requestAmount}>₹{req.price}</span>
                <StatusBadge status={req.status} />
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
