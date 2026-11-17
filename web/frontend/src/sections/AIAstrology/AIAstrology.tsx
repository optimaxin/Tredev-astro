import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_SUGGESTIONS } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import { calculatorService } from '../../services/calculatorService';
import { CalculatorApiError } from '../../services/calculatorService';
import type { BirthDetailsInput, KundliResult } from '../../services/calculatorService';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { NorthIndianChart, toChartPlanets } from '../KundliSection/KundliCharts';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './AIAstrology.module.css';

const FREE_MINUTES = 5;
const FREE_SECONDS = FREE_MINUTES * 60;

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

type AIPhase = 'intro' | 'form' | 'active';

function TimerDisplay({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const isWarning = secondsLeft <= 60;
  const isCritical = secondsLeft <= 10;

  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`${styles.timer} ${isWarning ? styles.timerWarning : ''} ${isCritical ? styles.timerCritical : ''}`}>
      <div className={styles.timerCircle}>
        <svg width="52" height="52" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(181,138,59,0.12)" strokeWidth="2.5" />
          <circle
            cx="26" cy="26" r="20"
            fill="none"
            stroke={isCritical ? '#E05315' : isWarning ? '#D0B06A' : 'var(--gold-primary)'}
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 26 26)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>
        <span className={styles.timerDigits}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className={styles.timerLabel}>
        {isCritical ? 'Session ending...' : isWarning ? '1 minute remaining' : 'Free session'}
      </div>
    </div>
  );
}

export default function AIAstrology() {
  const { isLoggedIn, setShowLoginModal, setPendingAction, pendingAction, t } = useAppContext();
  const [phase, setPhase] = useState<AIPhase>('intro');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(FREE_SECONDS);
  const [sessionTotalSeconds, setSessionTotalSeconds] = useState(FREE_SECONDS);
  const [locked, setLocked] = useState(false);
  const [kundliResult, setKundliResult] = useState<KundliResult | null>(null);
  const timerRef = useRef<number | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const birthInputRef = useRef<BirthDetailsInput | null>(null);

  // Auto-scroll messages — scroll only the message list itself, never the
  // page (scrollIntoView() on a sentinel can drag the whole document's
  // scroll position along with it).
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-resume after login
  useEffect(() => {
    if (isLoggedIn && pendingAction === 'ai-chat') {
      setPhase('form');
      setPendingAction(null);
    }
  }, [isLoggedIn, pendingAction, setPendingAction]);

  // Timer countdown — only runs once the birth-details form is submitted and
  // the real, server-tracked free session has actually started.
  useEffect(() => {
    if (phase !== 'active' || locked) return;
    timerRef.current = window.setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, locked]);

  const handleStartSession = () => {
    if (!isLoggedIn) {
      setPendingAction('ai-chat');
      setShowLoginModal(true);
      return;
    }
    setPhase('form');
  };

  // Same birth-details form used across the Kundli calculators — asks for
  // name/gender/DOB/TOB/place with real date/time pickers and a location
  // autocomplete, instead of a one-question-at-a-time chat interrogation.
  const handleBirthDetailsSubmit = async (value: BirthDetailsSubmitValue) => {
    const birthInput: BirthDetailsInput = {
      date: value.date,
      time: value.time,
      timezoneOffsetMinutes: value.timezoneOffsetMinutes,
      latitude: value.latitude,
      longitude: value.longitude,
    };
    const kundli = await calculatorService.kundli(birthInput);
    birthInputRef.current = birthInput;
    setKundliResult(kundli);

    const accessToken = localStorage.getItem('auth_access_token');
    let granted = FREE_SECONDS;
    if (accessToken) {
      try {
        granted = (await calculatorService.startFreeAiChatSession(accessToken)).grantedSeconds;
      } catch { /* network hiccup — keep the default free allowance */ }
    }

    const name = value.name || 'there';
    const moon = kundli.planets.find(p => p.id === 'moon');
    if (granted <= 0) {
      setLocked(true);
      setMessages([{ role: 'assistant', text: `Thanks, ${name}. Your chart is ready on the left, but your free chat has already been used.` }]);
    } else {
      setLocked(false);
      setSessionTotalSeconds(granted);
      setSecondsLeft(granted);
      setMessages([{
        role: 'assistant',
        text: `Namaste, ${name}. I've built your birth chart — Lagna in ${kundli.ascendant.rashi}${moon ? `, Moon in ${moon.rashi}` : ''}. Ask me anything about your chart, relationships, career, or timing.`,
      }]);
    }
    setPhase('active');
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || locked || !birthInputRef.current) return;
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { answer } = await calculatorService.aiAsk(birthInputRef.current, text);
      setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
    } catch (err) {
      const message = err instanceof CalculatorApiError ? err.message : 'Could not reach the astrology engine right now. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', text: message }]);
    } finally {
      setLoading(false);
    }
  }, [loading, locked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const moon = kundliResult?.planets.find(p => p.id === 'moon');
  const sun = kundliResult?.planets.find(p => p.id === 'sun');

  return (
    <section className={styles.section} id="ai" aria-label="Ask TredevaAstro AI">
      <CelestialBackdrop variant="surya_chandra" intensity="subtle" />
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Left: Header */}
          <motion.div
            className={styles.sidebar}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 className={styles.title}>{t('section_ai_title')}</h2>
            <p className={styles.subtitle}>
              {t('section_ai_desc')}
            </p>

            <div className={styles.chartContext}>
              <div className={styles.chartContextLabel}>Your Kundli Context</div>
              {kundliResult ? (
                <>
                  <div className={styles.chartPreview}>
                    <NorthIndianChart
                      planets={toChartPlanets(kundliResult)}
                      ascendantRashi={kundliResult.ascendant.rashi}
                      onPlanetHover={() => {}}
                      onPlanetLeave={() => {}}
                      onHouseHover={() => {}}
                      onHouseLeave={() => {}}
                    />
                  </div>
                  {[
                    { label: 'Lagna', value: kundliResult.ascendant.rashi, symbol: '↑' },
                    { label: 'Chandra (Moon)', value: moon ? `${moon.rashi} · ${moon.house}${moon.house === 1 ? 'st' : moon.house === 2 ? 'nd' : moon.house === 3 ? 'rd' : 'th'} Bhava` : '—', symbol: '☽' },
                    { label: 'Surya (Sun)', value: sun ? `${sun.rashi} · ${sun.house}${sun.house === 1 ? 'st' : sun.house === 2 ? 'nd' : sun.house === 3 ? 'rd' : 'th'} Bhava` : '—', symbol: '☉' },
                    { label: 'Nakshatra', value: `${kundliResult.moonNakshatra.name} · Pada ${kundliResult.moonNakshatra.pada}`, symbol: '✦' },
                  ].map(item => (
                    <div key={item.label} className={styles.chartItem}>
                      <span className={styles.chartSymbol}>{item.symbol}</span>
                      <div>
                        <span className={styles.chartLabel}>{item.label}</span>
                        <span className={styles.chartValue}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className={styles.chartContextEmpty}>
                  Fill in your birth details to start your free chat — your D1 chart will appear here.
                </p>
              )}
            </div>

            <div className={styles.freeBadge}>
              <span className={styles.freeBadgeIcon}>✦</span>
              First free chat
            </div>

            <div className={styles.disclaimer}>
              <span className={styles.disclaimerIcon}>ℹ</span>
              <p>Based on traditional Vedic principles. Not professional advice.</p>
            </div>
          </motion.div>

          {/* Right: Chat Interface */}
          <motion.div
            className={styles.chatPanel}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <AnimatePresence mode="wait">
              {/* INTRO PHASE */}
              {phase === 'intro' && (
                <motion.div
                  key="intro"
                  className={styles.introPanel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.introCelestial}>
                    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                      <circle cx="36" cy="36" r="34" stroke="rgba(181,138,59,0.25)" strokeWidth="1" />
                      <circle cx="36" cy="36" r="24" stroke="rgba(181,138,59,0.35)" strokeWidth="0.75" />
                      <circle cx="36" cy="36" r="3" fill="rgba(181,138,59,0.7)" />
                      {Array.from({ length: 8 }, (_, i) => {
                        const angle = (i / 8) * Math.PI * 2;
                        const x = 36 + Math.cos(angle) * 34;
                        const y = 36 + Math.sin(angle) * 34;
                        return <circle key={i} cx={x} cy={y} r="2" fill="rgba(181,138,59,0.5)" />;
                      })}
                    </svg>
                  </div>
                  <h3 className={styles.introTitle}>{t('ai_intro_title')}</h3>
                  <p className={styles.introDesc}>
                    {t('ai_intro_desc')}
                  </p>
                  <div className={styles.introExamples}>
                    <span className={styles.introExamplesLabel}>Example questions:</span>
                    {[
                      'What does my Mahadasha mean?',
                      'When is a good time for marriage?',
                      'What does Rahu in my 7th house indicate?',
                    ].map(q => (
                      <button
                        key={q}
                        className={styles.introExample}
                        onClick={() => {
                          handleStartSession();
                        }}
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                  <button
                    className={styles.startBtn}
                    onClick={handleStartSession}
                    id="ai-start-session"
                  >
                    {t('ai_start_btn')}
                    {!isLoggedIn && <span className={styles.startBtnLock}>🔒</span>}
                  </button>
                </motion.div>
              )}

              {/* FORM PHASE — same birth-details form the Kundli calculators use */}
              {phase === 'form' && (
                <motion.div
                  key="form"
                  className={styles.formPanel}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className={styles.introTitle}>Tell us your birth details</h3>
                  <p className={styles.introDesc}>
                    This builds your real D1 chart — your free chat's answers are grounded in it, not a generic reading.
                  </p>
                  <BirthDetailsForm
                    idPrefix="ai-chat"
                    submitLabel="Start My Free Chat"
                    showNameField
                    showGenderField
                    allowUnknownTime
                    onSubmit={handleBirthDetailsSubmit}
                  />
                </motion.div>
              )}

              {/* ACTIVE PHASE */}
              {phase === 'active' && (
                <motion.div
                  key="active"
                  className={styles.chatActive}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Timer header */}
                  <div className={styles.chatHeader}>
                    <TimerDisplay secondsLeft={secondsLeft} totalSeconds={sessionTotalSeconds} />
                  </div>

                  {/* Messages */}
                  <div className={styles.messages} ref={messagesRef}>
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`${styles.message} ${msg.role === 'user' ? styles.userMsg : styles.assistantMsg}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className={styles.msgAvatar}>✦</div>
                        )}
                        <div className={styles.msgBubble}>
                          {msg.text.split('\n').map((line, j) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                              return <p key={j} className={styles.msgBold}>{line.replace(/\*\*/g, '')}</p>;
                            }
                            if (line.startsWith('*') && line.endsWith('*')) {
                              return <p key={j} className={styles.msgItalic}>{line.replace(/\*/g, '')}</p>;
                            }
                            if (line.startsWith('- ')) {
                              return <li key={j} className={styles.msgLi}>{line.substring(2)}</li>;
                            }
                            return line ? <p key={j}>{line}</p> : <br key={j} />;
                          })}
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className={`${styles.message} ${styles.assistantMsg}`}>
                        <div className={styles.msgAvatar}>✦</div>
                        <div className={styles.msgBubble}>
                          <div className={styles.typing}>
                            <span /><span /><span />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggestions */}
                  {!locked && (
                    <div className={styles.suggestions}>
                      {AI_SUGGESTIONS.slice(0, 3).map(s => (
                        <button
                          key={s}
                          className={styles.suggestion}
                          onClick={() => sendMessage(s)}
                          disabled={loading}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Locked banner — free session ended, chat history stays visible */}
                  {locked && (
                    <div className={styles.lockedBanner}>
                      <p className={styles.expiredDesc}>Your free chat is over.</p>
                      <button className={styles.expiredCta}>Continue Chat — ₹49/session</button>
                    </div>
                  )}

                  {/* Input */}
                  {!locked && (
                    <form className={styles.inputRow} onSubmit={handleSubmit}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Ask about your chart..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={loading}
                        id="ai-input"
                      />
                      <button
                        type="submit"
                        className={styles.sendBtn}
                        disabled={loading || !input.trim()}
                        id="ai-send-btn"
                      >
                        <SendIcon />
                      </button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SendIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
      <path d="M2 9l14-7-7 14V9H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
