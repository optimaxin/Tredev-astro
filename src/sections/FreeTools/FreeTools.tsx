import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_TOOLS_CATEGORIES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import { RashiChakraIcon, MarriageIcon, ConstellationIcon, WealthIcon, AcharyaIcon, CareerIcon } from '../../components/Icons/Icons';
import styles from './FreeTools.module.css';

interface FreeToolsProps {
  featured?: boolean;
}

export default function FreeTools({ featured = false }: FreeToolsProps) {
  const { setPage, kundliGenerated, isLoggedIn, setShowLoginModal, setPendingAction } = useAppContext();
  const [activeCategory, setActiveCategory] = useState(FREE_TOOLS_CATEGORIES[0].id);

  const active = FREE_TOOLS_CATEGORIES.find(c => c.id === activeCategory)!;

  const handleToolClick = (toolName: string) => {
    if (!isLoggedIn) {
      setPendingAction('calculator');
      setShowLoginModal(true);
      return;
    }

    if (toolName === 'Free Kundli' || toolName === 'Lagna / Ascendant' || toolName === 'Moon Sign Calculator' || toolName === 'Nakshatra Finder' || toolName === 'Nakshatra') {
      if (kundliGenerated) {
        setPage('kundli-result');
      } else {
        setPage('free-kundli');
      }
    } else if (toolName === 'Kundli Milan' || toolName === 'Kundli Matching' || toolName === 'Love Compatibility' || toolName === 'Numerology Match') {
      setPage('kundli-matching');
    } else if (toolName === 'Daily Horoscope') {
      setPage('horoscope');
    } else if (toolName === 'Today\'s Panchang' || toolName === 'Muhurat Finder' || toolName === 'Choghadiya' || toolName === 'Abhijit Muhurat') {
      setPage('panchang');
    } else {
      setPage('free-kundli');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (featured) {
    return (
      <section className={styles.section} id="tools">
        <div className="section-container">
          <div className="section-header-split">
            <div className="header-left">
              <span className="section-eyebrow-gold">Free Resources</span>
              <h2 className="section-title-serif">Free Astrology Tools</h2>
              <p className="section-desc-sans">
                Trusted Vedic astrology tools — free, accurate, and always available.
              </p>
            </div>
            <button 
              className="section-explore-link" 
              onClick={() => { setPage('astrology-tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore All Free Tools →
            </button>
          </div>

          {/* Asymmetrical Curated Editorial Grid */}
          <div className={styles.featuredGrid}>
            {/* LARGE: Free Kundli */}
            <div 
              className={`${styles.featuredCard} ${styles.cardLarge}`}
              onClick={() => handleToolClick('Free Kundli')}
            >
              <div className={styles.cardHeader}>
                <RashiChakraIcon className={styles.cardIconLarge} />
                <div>
                  <h3 className={styles.cardTitle}>Free Kundli</h3>
                  <p className={styles.cardDesc}>
                    Generate your complete Vedic horoscope, planetary placements, and divisional charts.
                  </p>
                </div>
              </div>
              <span className={styles.arrowLink}>Generate Chart →</span>
            </div>

            {/* MEDIUM: Kundli Milan */}
            <div 
              className={`${styles.featuredCard} ${styles.cardMedium}`}
              onClick={() => handleToolClick('Kundli Milan')}
            >
              <div className={styles.cardHeader}>
                <MarriageIcon className={styles.cardIconMedium} />
                <div>
                  <h3 className={styles.cardTitle}>Kundli Milan</h3>
                  <p className={styles.cardDesc}>Vedic relationship compatibility matching.</p>
                </div>
              </div>
              <span className={styles.arrowLink}>Check Match →</span>
            </div>

            {/* MEDIUM: Nakshatra Finder */}
            <div 
              className={`${styles.featuredCard} ${styles.cardMedium}`}
              onClick={() => handleToolClick('Nakshatra')}
            >
              <div className={styles.cardHeader}>
                <ConstellationIcon className={styles.cardIconMedium} />
                <div>
                  <h3 className={styles.cardTitle}>Nakshatra Finder</h3>
                  <p className={styles.cardDesc}>Identify your birth star and planetary lord.</p>
                </div>
              </div>
              <span className={styles.arrowLink}>Find Star →</span>
            </div>

            {/* SMALL: Mangal Dosha */}
            <div 
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Mangal Dosha')}
            >
              <WealthIcon className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Mangal Dosha</h3>
              <p className={styles.cardDescSmall}>Martian affliction calculator.</p>
            </div>

            {/* SMALL: Sade Sati */}
            <div 
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Sade Sati')}
            >
              <AcharyaIcon className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Sade Sati</h3>
              <p className={styles.cardDescSmall}>Saturn transit calculator.</p>
            </div>

            {/* SMALL: Numerology */}
            <div 
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Numerology')}
            >
              <CareerIcon className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Numerology</h3>
              <p className={styles.cardDescSmall}>Life path number forecast.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Normal, complete page view
  return (
    <section className={styles.section} id="tools">
      <div className="section-container">
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
      </div>
    </section>
  );
}
