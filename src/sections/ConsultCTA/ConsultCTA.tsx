import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './ConsultCTA.module.css';

export default function ConsultCTA() {
  const { setPage } = useAppContext();

  return (
    <section className={styles.section} id="consult-cta">
      {/* Background celestial ornaments */}
      <CelestialOrnament type="nakshatra" className={styles.ornamentLeft} animate />
      <CelestialOrnament type="orbit" className={styles.ornamentRight} />

      {/* Deep atmospheric overlay */}
      <div className={styles.atmosphericOverlay} />

      <div className={styles.inner}>

        {/* Welcoming Acharya Portrait */}
        <motion.div
          className={styles.portraitWrap}
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={styles.portraitGlow} />
          <img
            src="/acharya/acharya-welcome.jpeg"
            alt="Acharya welcoming you to TredevAstro"
            className={styles.portraitImg}
            draggable={false}
          />
        </motion.div>

        {/* Editorial content */}
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className={styles.eyebrow}>✦ Jyotish Margdarshan</span>

          <h2 className={styles.headline}>
            When you need clarity,<br />
            <em className={styles.goldItalic}>speak with someone who knows the sky.</em>
          </h2>

          <p className={styles.desc}>
            Personal Jyotish guidance from an Acharya rooted in the classical Vedic tradition.
            Your natal chart holds answers — let them be read with precision and reverence.
          </p>

          <div className={styles.actions}>
            <button
              className={styles.btnGold}
              onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Consult an Acharya
            </button>
            <button
              className={styles.btnOutline}
              onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Generate Your Kundli
            </button>
          </div>

          {/* Trust micro-line */}
          <p className={styles.trustLine}>
            <span className={styles.trustDot} />
            Verified Jyotish tradition · Authentic Vedic practice · Secure consultations
          </p>
        </motion.div>

      </div>
    </section>
  );
}
