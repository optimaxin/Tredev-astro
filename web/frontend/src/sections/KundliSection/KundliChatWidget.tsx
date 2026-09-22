import React, { useEffect, useRef, useState } from 'react';
import { kundaliChatService, KundaliChatApiError } from '../../services/kundaliChatService';
import type { ChatMessage } from '../../services/kundaliChatService';
import styles from './KundliChatWidget.module.css';

interface Props {
  name: string;
  dob: string; // YYYY-MM-DD
  tob: string; // HH:MM
  latitude: number;
  longitude: number;
  place: string;
  timezoneOffsetMinutes: number;
}

const POLL_MS = 2000;

// Floating "Ask the Astrologer" chat, backed by the kundali-chat Python
// microservice (Extra/kundali-chat-master). Lazily creates a session on
// first open (reusing the same birth details already computed on this page),
// then polls for replies rather than a websocket — matches the service's
// own fire-and-poll design (see its README).
export default function KundliChatWidget({ name, dob, tob, latitude, longitude, place, timezoneOffsetMinutes }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastIdRef = useRef<string | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || sessionId || loading) return;
    setLoading(true);
    setError('');
    kundaliChatService
      .createSession({ name, dob, tob, latitude, longitude, place, timezone_offset_minutes: timezoneOffsetMinutes })
      .then(res => setSessionId(res.session_id))
      .catch(err => setError(err instanceof KundaliChatApiError ? err.message : 'Could not start the chat.'))
      .finally(() => setLoading(false));
  }, [open, sessionId, loading, name, dob, tob, latitude, longitude, place, timezoneOffsetMinutes]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const tick = () => {
      kundaliChatService
        .pollMessages(sessionId, lastIdRef.current)
        .then(res => {
          if (cancelled || res.messages.length === 0) return;
          lastIdRef.current = res.messages[res.messages.length - 1].id;
          setMessages(prev => [...prev, ...res.messages]);
        })
        .catch(() => {});
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sessionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = () => {
    const content = draft.trim();
    if (!content || !sessionId) return;
    setDraft('');
    setMessages(prev => [...prev, { id: `local-${Date.now()}`, role: 'user', content, status: 'complete', created_at: new Date().toISOString() }]);
    kundaliChatService.sendMessage(sessionId, content).catch(err => {
      setError(err instanceof KundaliChatApiError ? err.message : 'Could not send that message.');
    });
  };

  return (
    <>
      <button className={styles.launcher} onClick={() => setOpen(o => !o)} aria-label="Ask the astrologer">
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>Ask the Astrologer</div>
          <div className={styles.messages} ref={listRef}>
            {loading && messages.length === 0 && <p className={styles.hint}>Reading your chart…</p>}
            {error && <p className={styles.error}>{error}</p>}
            {messages.map(m => (
              <div key={m.id} className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}>
                {m.content || (m.status === 'pending' ? '…' : '')}
              </div>
            ))}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder="Ask about marriage, career, dasha..."
              disabled={!sessionId}
            />
            <button className={styles.sendButton} onClick={send} disabled={!sessionId || !draft.trim()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
