import React, { useCallback, useEffect, useRef, useState } from 'react';
import { aiCoreService, AiCoreApiError } from '../../services/aiCoreService';
import { NEGATIVE_REASONS } from '../../services/aiCoreService';
import type { AiCoreBirthDetails, AiCoreStreamStage, FeedbackType } from '../../services/aiCoreService';
import styles from './KundliChatWidget.module.css';

interface Props {
  birth: AiCoreBirthDetails;
  // Changes whenever a different chart is generated. Drives both the
  // conversation id and the one-time auto-open, so generating a second kundli
  // starts a fresh conversation rather than continuing the previous one.
  chartKey: string;
  displayName?: string;
  // Kundli page: true (greets and slides the panel open the moment a chart
  // is ready). Everywhere else on the site this widget is mounted, it should
  // stay closed and only nudge the visitor with the teaser bubble below —
  // popping open uninvited on every page load the moment someone logs in is
  // what this flag exists to stop.
  autoOpen?: boolean;
}

const TEASER_MESSAGES = [
  'Koi sandeh? Mujhse poochiye ✨',
  'Any doubt? Just ask me 🙏',
  'Apni Kundli ya rashi ke baare mein jaanna hai?',
];

interface Bubble {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  // A degraded reply is the service saying it could not reach the model. It
  // is styled as a notice, never as a reading.
  degraded?: boolean;
  // The turn this bubble belongs to. A reply is 1-4 bubbles (the model's own
  // topic segments); feedback is per REPLY, so only the last bubble of a turn
  // shows the thumbs.
  requestId?: string;
  turnId?: string;
  segmentId?: string;
  isLastOfReply?: boolean;
  // True while the reply is still arriving; the thumbs appear once it is done.
  streaming?: boolean;
}

// The opening message — always casual Hinglish (like the teaser bubbles
// above), not the site's selected language, and randomized per chart so it
// doesn't read like a canned bot line every time. Line 1 greets by name,
// line 2 is a varied nudge about what it can help with; `.bubble`'s
// `white-space: pre-wrap` renders the '\n' as a real line break.
const GREETING_OPENERS = (name: string) => [
  `Radhe Radhe, ${name}!`,
  `Namaste, ${name}!`,
  `Jai Shree Krishna, ${name}!`,
  `Pranaam, ${name}!`,
  `Hello ${name} ji!`,
];
const GREETING_HELPERS = [
  'Aapki Kundli taiyaar hai — mein aapki kaise madad kar sakta hoon?',
  'Batayein, apni Kundli ko leke kya jaanna chahenge aap?',
  'Career, shaadi, ya current dasha — kuch bhi poochiye apni Kundli se juda.',
  'Main aapki Kundli padh chuka hoon, poochiye jo bhi jaanna hai.',
];

const greetingFor = (name: string): string => {
  const openers = GREETING_OPENERS(name || 'aap');
  const opener = openers[Math.floor(Math.random() * openers.length)];
  const helper = GREETING_HELPERS[Math.floor(Math.random() * GREETING_HELPERS.length)];
  return `${opener}\n${helper}`;
};

// Shown inside the (empty) reply bubble while the server works.
const STAGE_LABEL: Record<AiCoreStreamStage, string> = {
  reading_chart: 'Reading your chart…',
  understanding: 'Understanding your question…',
  consulting_knowledge: 'Checking the classical texts…',
  writing: 'Writing your answer…',
  checking: 'Checking it against your chart…',
};

const SUGGESTIONS = [
  'What does my chart say about my career?',
  'When is a good period for marriage?',
  'What is my current dasha about?',
];

let bubbleSeq = 0;
const nextId = () => `b${++bubbleSeq}`;

export default function KundliChatWidget({ birth, chartKey, displayName, autoOpen = true }: Props) {
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [stage, setStage] = useState<AiCoreStreamStage | null>(null);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const [teaser, setTeaser] = useState<string | null>(null);
  // request_id -> the vote this user gave it. Local so the thumb stays lit
  // after a reload-free change of mind; the server holds the real record.
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({});
  // Which reply is currently showing its "why?" reasons, if any.
  const [reasonFor, setReasonFor] = useState<string | null>(null);
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
    setError('');
    const greeting = greetingFor(displayName || '');
    // A short delay lets the chart finish rendering first, so the panel
    // sliding in does not compete with the page settling.
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (autoOpen) setOpen(true);
      setBubbles([{ id: nextId(), role: 'assistant', text: greeting }]);
      // Restore this chart's earlier conversation (after a reload) with the
      // SAME bubbles it was shown in — the server re-segments the stored
      // reply with the same function the live path uses.
      aiCoreService.history(`kundli-${chartKey}`).then(turns => {
        if (cancelled || !turns.length) return;
        const restored: Bubble[] = [];
        for (const turn of turns) {
          if (turn.role === 'user' && turn.text) {
            restored.push({ id: nextId(), role: 'user', text: turn.text });
          } else if (turn.role === 'assistant') {
            const parts = turn.messages || [];
            parts.forEach((text, index) => restored.push({
              id: nextId(), role: 'assistant', text, isLastOfReply: index === parts.length - 1,
            }));
          }
        }
        setBubbles(prev => [...prev, ...restored]);
      }).catch(() => { /* no history is fine */ });
    }, 900);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // The greeting is chosen once per chart; a later language switch does not
    // rewrite a conversation that has already started.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartKey, autoOpen]);

  // When this isn't the self-opening Kundli-page widget, nudge the visitor
  // every so often with a small teaser bubble instead of popping the whole
  // panel open uninvited. Clicking it is what actually opens the chat.
  useEffect(() => {
    if (autoOpen || open) { setTeaser(null); return; }
    let hideTimer: number;
    let msgIndex = 0;
    const show = () => {
      setTeaser(TEASER_MESSAGES[msgIndex % TEASER_MESSAGES.length]);
      msgIndex += 1;
      hideTimer = window.setTimeout(() => setTeaser(null), 8000);
    };
    const firstTimer = window.setTimeout(show, 15000);
    const interval = window.setInterval(show, 60000);
    return () => { window.clearTimeout(firstTimer); window.clearInterval(interval); window.clearTimeout(hideTimer); };
  }, [autoOpen, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles, thinking, stage]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text || thinking) return;

      setDraft('');
      setError('');
      setStage(null);
      // ONE assistant bubble per reply, created now and filled in place as
      // the stream arrives — never a new bubble per chunk or sentence.
      // One placeholder bubble (typing dots) until the first segment arrives.
      // Each semantic segment then gets its OWN bubble, filled in place —
      // never one bubble per chunk or sentence, never one oversized bubble.
      const turnId = nextId();
      setBubbles(prev => [
        ...prev,
        { id: nextId(), role: 'user', text },
        { id: `${turnId}-pending`, role: 'assistant', text: '', turnId, streaming: true },
      ]);
      setThinking(true);

      aiCoreService
        .askStream({ question: text, birth, sessionId }, {
          onStatus: s => setStage(s),
          onSegmentStart: (segmentId) =>
            setBubbles(prev => {
              const pending = prev.findIndex(b => b.id === `${turnId}-pending`);
              const bubble: Bubble = { id: `${turnId}-${segmentId}`, role: 'assistant', text: '', turnId,
                                       segmentId, streaming: true };
              if (pending >= 0) return prev.map((b, i) => (i === pending ? bubble : b));
              return [...prev, bubble];
            }),
          onDelta: (segmentId, chunk) =>
            setBubbles(prev => prev.map(b => (b.turnId === turnId && b.segmentId === segmentId
              ? { ...b, text: b.text + chunk } : b))),
          onSegmentEnd: (segmentId, _index, full) =>
            setBubbles(prev => prev.map(b => (b.turnId === turnId && b.segmentId === segmentId
              ? { ...b, text: full } : b))),
        })
        .then(res => {
          // `done.messages` is authoritative: the turn's bubbles are rebuilt
          // from it, in order, so they always match what the server saved.
          const parts = res.messages?.length ? res.messages : [res.answer].filter(Boolean);
          const finalBubbles: Bubble[] = parts.map((part, index) => ({
            id: `${turnId}-final-${index}`,
            role: 'assistant',
            text: part,
            turnId,
            degraded: res.degraded,
            requestId: res.request_id,
            isLastOfReply: index === parts.length - 1,
            streaming: false,
          }));
          setBubbles(prev => {
            const first = prev.findIndex(b => b.turnId === turnId);
            const rest = prev.filter(b => b.turnId !== turnId);
            const at = first >= 0 ? first : rest.length;
            return [...rest.slice(0, at), ...finalBubbles, ...rest.slice(at)];
          });
        })
        .catch(err => {
          // Drop empty bubbles of this turn; the error line below explains.
          setBubbles(prev => prev
            .filter(b => !(b.turnId === turnId && !b.text))
            .map(b => (b.turnId === turnId ? { ...b, streaming: false } : b)));
          setError(err instanceof AiCoreApiError ? err.message : 'Something went wrong. Please try again.');
        })
        .finally(() => {
          setThinking(false);
          setStage(null);
        });
    },
    [birth, sessionId, thinking],
  );

  const sendFeedback = useCallback(
    (requestId: string, type: FeedbackType, reason?: string) => {
      // Optimistic: the thumb lights up immediately. Feedback is a nicety —
      // if the call fails the user should not see an error over it, and the
      // console note is enough for us.
      setFeedback(prev => ({ ...prev, [requestId]: type }));
      setReasonFor(type === 'not_helpful' && !reason ? requestId : null);
      aiCoreService
        .submitFeedback({ requestId, feedbackType: type, conversationId: sessionId, reason })
        .catch(() => { /* a lost vote must not interrupt the conversation */ });
    },
    [sessionId],
  );

  const showSuggestions = !thinking && !bubbles.some(b => b.role === 'user');

  return (
    <>
      {teaser && !open && (
        <button
          className={styles.teaserBubble}
          onClick={() => { setOpen(true); setTeaser(null); }}
        >
          {teaser}
          <span
            className={styles.teaserClose}
            role="button"
            aria-label="Dismiss"
            onClick={e => { e.stopPropagation(); setTeaser(null); }}
          >
            ✕
          </span>
        </button>
      )}

      <button
        className={`${styles.launcher} ${open ? styles.launcherOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close the astrology assistant' : 'Ask the astrology assistant'}
      >
        {/* The monk is the assistant's face. It used to be a separate
            site-wide notification FAB that sat in this same corner — two of
            them collided on the Kundli page, so the widget adopted it and
            the standalone one was removed from App.tsx. */}
        {open ? (
          <span className={styles.launcherClose} aria-hidden="true">✕</span>
        ) : (
          <img src="/images/monk.png" alt="" className={styles.launcherMonk} aria-hidden="true" />
        )}
      </button>

      {open && (
        <aside className={styles.panel} role="dialog" aria-label="Astrology assistant">
          <header className={styles.header}>
            <img src="/images/monk.png" alt="" className={styles.headerMonk} aria-hidden="true" />
            <div className={styles.headerText}>
              <div className={styles.headerTitle}>Ask about your Kundli</div>
              <div className={styles.headerSub}>AI assistant · reads only your chart</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </header>

          <div className={styles.messages} ref={listRef}>
            {bubbles.map(b => (
              <div key={b.id} className={styles.bubbleGroup}>
              {b.role === 'assistant' && b.streaming && !b.text ? (
                // The reply's own bubble, before its first text arrives.
                <div className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.typing}`}
                     aria-live="polite" aria-label={stage ? STAGE_LABEL[stage] : 'Thinking'}>
                  <span />
                  <span />
                  <span />
                  {stage && <em className={styles.stageLabel}>{STAGE_LABEL[stage]}</em>}
                </div>
              ) : (
              <div
                className={[
                  styles.bubble,
                  b.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  b.degraded ? styles.bubbleNotice : '',
                ].join(' ')}
              >
                {/* Paragraphs of ONE reply render inside ONE bubble. */}
                {b.text}
              </div>
              )}

              {/* Thumbs under the finished reply. Hidden on a degraded reply:
                  there is nothing to rate when the model could not be reached. */}
              {b.role === 'assistant' && !b.streaming && b.isLastOfReply && b.requestId && !b.degraded && (
                <div className={styles.feedbackRow}>
                  <button
                    className={`${styles.feedbackButton} ${feedback[b.requestId] === 'helpful' ? styles.feedbackActive : ''}`}
                    onClick={() => sendFeedback(b.requestId!, 'helpful')}
                    aria-label="This was helpful"
                    aria-pressed={feedback[b.requestId] === 'helpful'}
                    title="Helpful"
                  >
                    👍
                  </button>
                  <button
                    className={`${styles.feedbackButton} ${feedback[b.requestId] === 'not_helpful' ? styles.feedbackActive : ''}`}
                    onClick={() => sendFeedback(b.requestId!, 'not_helpful')}
                    aria-label="This was not helpful"
                    aria-pressed={feedback[b.requestId] === 'not_helpful'}
                    title="Not helpful"
                  >
                    👎
                  </button>
                  {feedback[b.requestId] && reasonFor !== b.requestId && (
                    <span className={styles.feedbackThanks}>Thanks!</span>
                  )}
                </div>
              )}

              {/* Optional reasons, shown only after 👎 and dismissible by
                  ignoring them. Never required — forcing a reason is how you
                  stop people giving feedback at all. */}
              {b.requestId && reasonFor === b.requestId && (
                <div className={styles.reasonBox}>
                  <div className={styles.reasonTitle}>What went wrong? (optional)</div>
                  <div className={styles.reasonList}>
                    {NEGATIVE_REASONS.map(r => (
                      <button
                        key={r.value}
                        className={styles.reasonChip}
                        onClick={() => sendFeedback(b.requestId!, 'not_helpful', r.value)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <button className={styles.reasonSkip} onClick={() => setReasonFor(null)}>
                    Skip
                  </button>
                </div>
              )}
              </div>
            ))}

            {error && <p className={styles.error}>{error}</p>}
          </div>

          {showSuggestions && (
            <div className={styles.suggestions}>
              {SUGGESTIONS.map(s => (
                <button key={s} className={styles.suggestion} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

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
