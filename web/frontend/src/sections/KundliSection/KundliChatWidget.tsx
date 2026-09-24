import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiCoreService, AiCoreApiError } from '../../services/aiCoreService';
import type { AiCoreBirthDetails } from '../../services/aiCoreService';
import styles from './KundliChatWidget.module.css';

interface Props {
  birth: AiCoreBirthDetails;
  // Changes whenever a different chart is generated. Drives both the
  // conversation id and the one-time auto-open, so generating a second kundli
  // starts a fresh conversation rather than continuing the previous one.
  chartKey: string;
  displayName?: string;
}

interface Bubble {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  // A degraded reply is the service saying it could not reach the model. It
  // is styled as a notice, never as a reading.
  degraded?: boolean;
}

// Assistant replies arrive as several short messages at once. They are
// revealed one at a time so the panel reads like a conversation rather than
// dumping a wall of text — this is presentation only, the content is already
// complete by the time the first bubble appears.
const BUBBLE_STAGGER_MS = 550;

const SUGGESTIONS = [
  'What does my chart say about my career?',
  'When is a good period for marriage?',
  'What is my current dasha about?',
];

let bubbleSeq = 0;
const nextId = () => `b${++bubbleSeq}`;

export default function KundliChatWidget({ birth, chartKey, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [queue, setQueue] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoOpenedFor = useRef<string | null>(null);

  const sessionId = `kundli-${chartKey}`;

  // Auto-open once per generated chart. Tracked in a ref rather than state so
  // that closing the panel does not immediately re-trigger the effect.
  useEffect(() => {
    if (autoOpenedFor.current === chartKey) return;
    autoOpenedFor.current = chartKey;
    setBubbles([]);
    setQueue([]);
    setError('');
    const greeting = displayName
      ? `Namaste ${displayName.split(' ')[0]}! Your kundli is ready.`
      : 'Namaste! Your kundli is ready.';
    // A short delay lets the chart finish rendering first, so the panel
    // sliding in does not compete with the page settling.
    const timer = window.setTimeout(() => {
      setOpen(true);
      setBubbles([
        { id: nextId(), role: 'assistant', text: greeting },
        { id: nextId(), role: 'assistant', text: 'Ask me anything about it — I read only your chart, in plain language.' },
      ]);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [chartKey, displayName]);

  // Drain queued assistant bubbles one at a time.
  useEffect(() => {
    if (queue.length === 0) return;
    const timer = window.setTimeout(() => {
      setBubbles(prev => [...prev, queue[0]]);
      setQueue(prev => prev.slice(1));
    }, BUBBLE_STAGGER_MS);
    return () => window.clearTimeout(timer);
  }, [queue]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, thinking]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text || thinking) return;

      setDraft('');
      setError('');
      setBubbles(prev => [...prev, { id: nextId(), role: 'user', text }]);
      setThinking(true);

      aiCoreService
        .ask({ question: text, birth, sessionId })
        .then(res => {
          // `messages` is the server's own split; `answer` is the fallback if
          // a future response ever arrives without it.
          const parts = res.messages.length > 0 ? res.messages : [res.answer].filter(Boolean);
          const incoming: Bubble[] = parts.map(part => ({
            id: nextId(),
            role: 'assistant',
            text: part,
            degraded: res.degraded,
          }));
          // First bubble immediately so the reply feels responsive; the rest
          // stagger in behind it.
          setBubbles(prev => (incoming.length ? [...prev, incoming[0]] : prev));
          setQueue(incoming.slice(1));
        })
        .catch(err => {
          setError(err instanceof AiCoreApiError ? err.message : 'Something went wrong. Please try again.');
        })
        .finally(() => setThinking(false));
    },
    [birth, sessionId, thinking],
  );

  const showSuggestions = !thinking && queue.length === 0 && !bubbles.some(b => b.role === 'user');

  return (
    <>
      <button
        className={styles.launcher}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close the astrology assistant' : 'Ask the astrology assistant'}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <aside className={styles.panel} role="dialog" aria-label="Astrology assistant">
          <header className={styles.header}>
            <div>
              <div className={styles.headerTitle}>Ask about your Kundli</div>
              <div className={styles.headerSub}>AI assistant · reads only your chart</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </header>

          <div className={styles.messages} ref={listRef}>
            {bubbles.map(b => (
              <div
                key={b.id}
                className={[
                  styles.bubble,
                  b.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  b.degraded ? styles.bubbleNotice : '',
                ].join(' ')}
              >
                {b.text}
              </div>
            ))}

            {(thinking || queue.length > 0) && (
              <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}>
                <span />
                <span />
                <span />
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            {showSuggestions && (
              <div className={styles.suggestions}>
                {SUGGESTIONS.map(s => (
                  <button key={s} className={styles.suggestion} onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              placeholder="Ask about career, marriage, dasha…"
              disabled={thinking}
              maxLength={500}
            />
            <button
              className={styles.sendButton}
              onClick={() => ask(draft)}
              disabled={thinking || !draft.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
