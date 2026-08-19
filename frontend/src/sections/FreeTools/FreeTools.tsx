import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FREE_TOOLS_CATEGORIES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import { RashiChakraIcon, MarriageIcon, ConstellationIcon, WealthIcon, AcharyaIcon, CareerIcon } from '../../components/Icons/Icons';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './FreeTools.module.css';

interface FreeToolsProps {
  featured?: boolean;
}

export default function FreeTools({ featured = false }: FreeToolsProps) {
  const { setPage, kundliGenerated, isLoggedIn, setShowLoginModal, setPendingAction, t, tOr } = useAppContext();

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
    } else if (toolName === "Today's Panchang" || toolName === 'Muhurat Finder' || toolName === 'Choghadiya' || toolName === 'Abhijit Muhurat') {
      setPage('panchang');
    } else {
      setPage('free-kundli');
    }
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
                  <h3 className={styles.cardTitle}>{t('seek_card_growth_title')}</h3>
                  <p className={styles.cardDesc}>{t('seek_card_growth_desc')}</p>
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
          {FREE_TOOLS_CATEGORIES.map((category, ci) => (
            <motion.div
              key={category.id}
              className={styles.categorySection}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.06, duration: 0.5 }}
            >
              <h3 className={styles.categoryHeader}>
                <span className={styles.categoryHeaderIcon} style={{ color: category.color }}>
                  {category.icon}
                </span>
                <span className={styles.categoryHeaderLabel}>{category.label}</span>
              </h3>
              <div className={styles.toolsGrid}>
                {category.tools.map(tool => (
                  <div
                    key={tool}
                    className={styles.toolCard}
                    onClick={() => handleToolClick(tool)}
                  >
                    <div className={styles.toolIcon}>✦</div>
                    <span className={styles.toolName}>{tool}</span>
                    <span className={styles.toolArrow}>→</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
