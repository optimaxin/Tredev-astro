import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AI_SUGGESTIONS, AI_DEMO_RESPONSES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import styles from './AIAstrology.module.css';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function AIAstrology() {
  const { birthProfile } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello! I am your Vedic Margdarshan guide. I can answer questions based on ${birthProfile.name}'s Janam Kundli placements: Surya in Vrischika (Scorpio), Chandra in Vrishabha (Taurus), and Simha Lagna (Leo Rising). What would you like to explore?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const response =
        AI_DEMO_RESPONSES[text] ||
        `Based on your chart with Surya in Vrischika (4th Bhava), Chandra in Vrishabha (10th Bhava), and Simha Lagna, traditional Vedic astrology offers the following perspective on "${text}":

Your current planetary period (Venus–Mercury Mahadasha) suggests a time of intellectual and communicative growth. The transit of Jupiter through your 9th house indicates a period of expansion and opportunity.

*This interpretation is based on classical Vedic principles and chart analysis. It represents one astrological perspective, not a guaranteed prediction.*`;
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      setLoading(false);
    }, 1400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section className={styles.section} id="ai">
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Left: Header + Chart Context */}
          <motion.div
            className={styles.sidebar}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="section-eyebrow">Margdarshan AI</span>
            <h2 className={styles.title}>Ask TredevAstro</h2>
            <p className={styles.subtitle}>
              Get chart-based insights grounded in Vedic astrology principles.
            </p>

            <div className={styles.chartContext}>
              <div className={styles.chartContextLabel}>Janam Kundli Context</div>
              {[
                { label: 'Surya (Sun)', value: 'Vrischika · 4th Bhava', symbol: '☉' },
                { label: 'Chandra (Moon)', value: 'Vrishabha · 10th Bhava', symbol: '☽' },
                { label: 'Lagna (Ascendant)', value: 'Simha Lagna', symbol: '↑' },
                { label: 'Mahadasha', value: 'Venus–Mercury', symbol: '◎' },
              ].map(item => (
                <div key={item.label} className={styles.chartItem}>
                  <span className={styles.chartSymbol}>{item.symbol}</span>
                  <div>
                    <span className={styles.chartLabel}>{item.label}</span>
                    <span className={styles.chartValue}>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.disclaimer}>
              <span className={styles.disclaimerIcon}>ℹ</span>
              <p>Responses are based on traditional Vedic astrological interpretation. Not a substitute for professional advice.</p>
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
            {/* Messages */}
            <div className={styles.messages}>
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

            {/* Input */}
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 9l14-7-7 14V9H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
