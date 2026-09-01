import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_TOOLS_CATEGORIES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import { RashiChakraIcon, MarriageIcon, ConstellationIcon, WealthIcon, AcharyaIcon, CareerIcon, SunIcon, MoonIcon, DoshaShieldIcon, NumerologyGridIcon } from '../../components/Icons/Icons';
import type { IconProps } from '../../components/Icons/Icons';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './FreeTools.module.css';

interface FreeToolsProps {
  featured?: boolean;
}

// Each listed tool routes to its own distinct calculator page — no two
// entries should share a destination unless they're genuinely the same
// calculation under a different label (e.g. Kundli Milan / Love Compatibility).
const TOOL_ROUTES: Record<string, string> = {
  'Free Kundli': 'free-kundli',
  'Moon Sign Calculator': 'moon-sign',
  'Nakshatra Finder': 'nakshatra-finder',
  'Nakshatra': 'nakshatra-finder',
  'Kundli Matching': 'kundli-matching',
  'Kundli Milan': 'kundli-matching',
  'Love Compatibility': 'kundli-matching',
  'Numerology Match': 'numerology-match',
  'FLAMES': 'flames',
  'Lucky Color & Date': 'lucky',
  'Mangal Dosha': 'mangal-dosha',
  'Kaal Sarp Dosha': 'kaal-sarp-dosha',
  'Sade Sati': 'sade-sati',
  'Rahu Ketu Transit': 'rahu-ketu-transit',
  'Numerology': 'numerology',
  'Numerology Report': 'numerology',
  'Life Path Number': 'life-path-number',
  'Name Numerology': 'name-numerology',
  'Daily Horoscope': 'horoscope',
  'Weekly Horoscope': 'horoscope',
  'Monthly Horoscope': 'horoscope',
  'Weekly Love Horoscope': 'horoscope',
  'Half-Yearly Horoscope': 'horoscope',
  'Yearly Horoscope': 'horoscope',
  'Chinese Zodiac': 'chinese-zodiac',
  'Numerology Horoscope': 'numerology-horoscope',
  "Today's Panchang": 'panchang',
  'Muhurat Finder': 'muhurat-finder',
  'Choghadiya': 'choghadiya',
  'Abhijit Muhurat': 'abhijit-muhurat',
};

// Real vector icons per category, replacing the plain Unicode glyphs
// (☀ ☽ ♾ ◎ ∞) that used to render here — those vary in optical size/weight
// across symbols even at the same font-size, which is what made the
// category header row look inconsistent/"cheap" and misaligned between
// sections. Same 24x24-viewBox icon set already used by the featured grid.
const CATEGORY_ICONS: Record<string, React.ComponentType<IconProps>> = {
  daily: SunIcon,
  birth: MoonIcon,
  compatibility: MarriageIcon,
  doshas: DoshaShieldIcon,
  numerology: NumerologyGridIcon,
};

export default function FreeTools({ featured = false }: FreeToolsProps) {
  const { setPage, t, tOr } = useAppContext();

  // These are the FREE tools — no login required to use any of them. Only
  // genuinely "severe" actions inside a tool (like downloading a Kundli PDF,
  // see KundliSection.tsx's own gate) prompt for login, not opening the
  // tool itself.
  const handleToolClick = (toolName: string) => {
    setPage(TOOL_ROUTES[toolName] || 'astrology-tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (featured) {
    return (
      <section className={styles.section} id="tools">
        <CelestialBackdrop variant="orbit" intensity="low" />
        <div className="section-container">
          <motion.div
            className="section-header-split"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="header-left">
              <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
              <h2 className="section-title-serif">{t('section_tools_title')}</h2>
              <p className="section-desc-sans">
                {t('section_tools_desc')}
              </p>
            </div>
            <button
              className="section-explore-link"
              onClick={() => { setPage('astrology-tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {t('cta_explore')} Tools →
            </button>
          </motion.div>

          {/* Asymmetrical Curated Editorial Grid */}
          <div className={styles.featuredGrid}>
            {/* LARGE: Free Kundli */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardLarge}`}
              onClick={() => handleToolClick('Free Kundli')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
            >
              <CelestialOrnament type="rashi" className={styles.cardOrnament} />
              <div className={styles.cardHeader}>
                <RashiChakraIcon size={60} className={styles.cardIconLarge} />
                <div>
                  <h3 className={styles.cardTitle}>{t('nav_free_kundli')}</h3>
                  <p className={styles.cardDesc}>
                    {t('hero_subhead')}
                  </p>
                </div>
              </div>
              <span className={styles.arrowLink}>{t('cta_generate')} →</span>
            </motion.div>

            {/* MEDIUM: Kundli Milan */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardMedium}`}
              onClick={() => handleToolClick('Kundli Milan')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08, duration: 0.55 }}
            >
              <CelestialOrnament type="kundli" className={styles.cardOrnament} />
              <div className={styles.cardHeader}>
                <MarriageIcon size={48} className={styles.cardIconMedium} />
                <div>
                  <h3 className={styles.cardTitle}>{t('seek_card_marriage_title')}</h3>
                  <p className={styles.cardDesc}>{t('seek_card_marriage_desc')}</p>
                </div>
              </div>
              <span className={styles.arrowLink}>{tOr('tools_kundli_milan_cta', 'seek_card_cta')}</span>
            </motion.div>

            {/* MEDIUM: Nakshatra Finder */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardMedium}`}
              onClick={() => handleToolClick('Nakshatra')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.16, duration: 0.55 }}
            >
              <CelestialOrnament type="nakshatra" className={styles.cardOrnament} />
              <div className={styles.cardHeader}>
                <ConstellationIcon size={48} className={styles.cardIconMedium} />
                <div>
                  <h3 className={styles.cardTitle}>Nakshatra Finder</h3>
                  <p className={styles.cardDesc}>Discover your birth star and its ruling planet.</p>
                </div>
              </div>
              <span className={styles.arrowLink}>{tOr('tools_nakshatra_cta', 'seek_card_cta')}</span>
            </motion.div>

            {/* SMALL: Mangal Dosha */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Mangal Dosha')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.24, duration: 0.55 }}
            >
              <CelestialOrnament type="yantra" className={styles.cardOrnamentSmall} />
              <WealthIcon size={38} className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Mangal Dosha</h3>
              <p className={styles.cardDescSmall}>{t('seek_card_marriage_desc')}</p>
            </motion.div>

            {/* SMALL: Sade Sati */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Sade Sati')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.32, duration: 0.55 }}
            >
              <CelestialOrnament type="chandra" className={styles.cardOrnamentSmall} />
              <AcharyaIcon size={38} className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Sade Sati</h3>
              <p className={styles.cardDescSmall}>{t('seek_card_spirituality_desc')}</p>
            </motion.div>

            {/* SMALL: Numerology */}
            <motion.div
              className={`${styles.featuredCard} ${styles.cardSmall}`}
              onClick={() => handleToolClick('Numerology')}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.55 }}
            >
              <CelestialOrnament type="mandala" className={styles.cardOrnamentSmall} />
              <CareerIcon size={38} className={styles.cardIconSmall} />
              <h3 className={styles.cardTitleSmall}>Numerology</h3>
              <p className={styles.cardDescSmall}>Life path number forecast.</p>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section} id="tools">
      <CelestialBackdrop variant="yantra" intensity="subtle" />
      <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
          <h2 className="section-title-serif">{t('section_tools_title')}</h2>
          <p className="section-desc-sans">
            {t('section_tools_desc')}
          </p>
        </motion.div>

        {/* Grouped Layout Showing All Calculators and Tools without tabs */}
        <div className={styles.allToolsContainer}>
          {FREE_TOOLS_CATEGORIES.map((category, ci) => {
            const CategoryIcon = CATEGORY_ICONS[category.id];
            return (
            <motion.div
              key={category.id}
              className={styles.categorySection}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.06, duration: 0.5 }}
            >
              <h3 className={styles.categoryHeader} style={{ '--accent': category.color } as React.CSSProperties}>
                <span className={styles.categoryHeaderIcon}>
                  <CategoryIcon size={20} />
                </span>
                <span className={styles.categoryHeaderLabel}>{category.label}</span>
              </h3>
              <div className={styles.toolsGrid}>
                {category.tools.map(tool => (
                  <div
                    key={tool}
                    className={styles.toolCard}
                    style={{ '--accent': category.color } as React.CSSProperties}
                    onClick={() => handleToolClick(tool)}
                  >
                    <span className={styles.toolIconBadge}>
                      <CategoryIcon size={18} />
                    </span>
                    <span className={styles.toolName}>{tool}</span>
                    <span className={styles.toolArrow}>→</span>
                  </div>
                ))}
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
