import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_TOOLS_CATEGORIES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import styles from './FreeTools.module.css';

export default function FreeTools() {
  const { setPage, kundliGenerated } = useAppContext();
  const [activeCategory, setActiveCategory] = useState(FREE_TOOLS_CATEGORIES[0].id);

  const active = FREE_TOOLS_CATEGORIES.find(c => c.id === activeCategory)!;

  const handleToolClick = (toolName: string) => {
    if (toolName === 'Free Kundli' || toolName === 'Lagna / Ascendant' || toolName === 'Moon Sign Calculator' || toolName === 'Nakshatra Finder') {
      if (kundliGenerated) {
        setPage('kundli-result');
      } else {
        setPage('free-kundli');
      }
    } else if (toolName === 'Kundli Matching' || toolName === 'Love Compatibility' || toolName === 'Numerology Match') {
      setPage('kundli-matching');
    } else if (toolName === 'Daily Horoscope') {
      setPage('horoscope');
    } else if (toolName === 'Today\'s Panchang' || toolName === 'Muhurat Finder' || toolName === 'Choghadiya' || toolName === 'Abhijit Muhurat') {
      setPage('panchang');
    } else {
      setPage('free-kundli');
    }
  };

  return (
    <section className={styles.section} id="tools">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Free Resources</span>
          <h2 className={styles.title}>Free Astrology Tools</h2>
          <p className={styles.subtitle}>
            Trusted Vedic astrology tools — free, accurate, and always available.
          </p>
        </motion.div>

        {/* Category Tabs */}
        <div className={styles.tabs}>
          {FREE_TOOLS_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              id={`tool-cat-${cat.id}`}
            >
              <span className={styles.tabIcon} style={{ color: cat.color }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            className={styles.toolsGrid}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {active.tools.map((tool, i) => (
              <button
                key={tool}
                className={styles.toolCard}
                onClick={() => handleToolClick(tool)}
                id={`tool-${tool.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <span className={styles.toolIcon} style={{ color: active.color }}>{active.icon}</span>
                <span className={styles.toolName}>{tool}</span>
                <span className={styles.toolArrow}>→</span>
              </button>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <div className={styles.ctaRow}>
          <button className="btn btn-outline-gold btn-lg" id="tools-explore-all" onClick={() => setPage('astrology-tools')}>
            Explore All Free Tools
          </button>
        </div>
      </div>
    </section>
  );
}
