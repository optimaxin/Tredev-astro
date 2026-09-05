import React, { useState } from 'react';
import { useRealtime } from '../../../realtime/RealtimeContext';
import ChatWindow from '../../../components/ChatWindow/ChatWindow';
import { EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// A dedicated inbox for chat-type requests specifically (voice/video calls
// still surface on Overview) — every incoming chat notification lands here
// with an Accept button, and accepting opens the live ChatWindow right in
// this same tab instead of sending you elsewhere. The looping request alarm
// (RealtimeContext's startPendingRequestAlarm, keyed off pendingAssignments)
// already keeps ringing until one of these gets accepted — nothing extra
// needed here for that.
export default function ChatInbox() {
  const { astrologerSync, acceptAssignment, endActiveConsultation } = useRealtime();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const pendingChats = (astrologerSync?.pendingAssignments || []).filter(p => p.type === 'chat');
  const active = astrologerSync?.activeConsultation;
  const activeChat = active?.type === 'chat' ? active : null;

  const handleAccept = async (id: string) => {
    setBusyId(id);
    try { await acceptAssignment(id); } finally { setBusyId(null); }
  };

  const handleEnd = async () => {
    setEnding(true);
    try { await endActiveConsultation(); } finally { setEnding(false); }
  };

  return (
    <div>
      <SectionHeader title="Chat" subtitle="Incoming chat requests and your live chat, all in one place." />

      {activeChat && (
        <Panel title={`Chatting with ${activeChat.userName}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className={styles.tableMuted}>{activeChat.category}</span>
            <button className={styles.iconBtn} disabled={ending} onClick={handleEnd}>End Consultation</button>
          </div>
          <ChatWindow consultationId={activeChat.id} otherPartyName={activeChat.userName} />
        </Panel>
      )}

      <Panel title="Incoming Chat Requests">
        {pendingChats.length === 0 ? (
          <EmptyState icon="💬" title="No chat requests right now" desc="New chat requests will appear here the moment a user reaches out." />
        ) : (
          pendingChats.map(req => (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.requestTop}>
                <span className={styles.requestAvatar}>{req.userName.charAt(0)}</span>
                <div>
                  <div className={styles.requestName}>{req.userName}</div>
                  <div className={styles.requestMeta}>{req.category} · {timeAgo(req.createdAt)}</div>
                </div>
              </div>
              <div className={styles.requestActions}>
                <button className={`${styles.btnSm} ${styles.btnGold}`} disabled={busyId === req.id || !!activeChat} onClick={() => handleAccept(req.id)}>
                  Accept
                </button>
              </div>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
