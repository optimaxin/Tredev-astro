import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './MeetAcharya.module.css';

export default function MeetAcharya() {
  const { setPage } = useAppContext();

  return (
    <section className={styles.section} id="meet-Astrologist">
      {/* Background ornament — partial mandala, top-right */}
      <CelestialOrnament
        type="mandala"
        className={styles.bgOrnament}
        animate
      />

      <div className={styles.inner}>

        {/* Left — Portrait */}
        <motion.div
          className={styles.portraitCol}
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={styles.portraitFrame}>
            {/* Subtle rashi ornament partially behind portrait */}
            <CelestialOrnament type="rashi" className={styles.portraitOrnament} />
            <div className={styles.portraitGlow} />
            <img
              src="/Astrologist/Astrologist-composed.jpeg"
              alt="Astrologist TredevAstro — Jyotish Pandit"
              className={styles.portraitImg}
              draggable={false}
            />
          </div>
          {/* Small credential pill below portrait */}
          <div className={styles.credentialPill}>
            <span className={styles.credDot}>✦</span>
            <span>Parashari Jyotish · Vedic Tradition</span>
          </div>
        </motion.div>

        {/* Right — Content */}
        <motion.div
          className={styles.contentCol}
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <span className={styles.eyebrow}>Meet Your Astrologist</span>

          <h2 className={styles.name}>Pandit TredevAstro</h2>
          <p className={styles.tradition}>Jyotish Astrologist · Kerala Tradition</p>

          <div className={styles.divider} />

          <p className={styles.bio}>
            Rooted in the classical Parashari tradition and initiated in the ancient
            Jyotish lineages of Kerala, our Astrologist brings together the precision of
            Vedic mathematics and the depth of dharmic understanding into every
            consultation.
          </p>
          <p className={styles.bio}>
            With expertise spanning natal chart interpretation, Dasha-Bhukti timing,
            Muhurta, and remedial Jyotish — every reading is grounded in the sacred
            texts of Brihat Parashara Hora Shastra. The sky is not a mystery to be
            feared, but a map to be read with clarity and reverence.
          </p>

          <div className={styles.pillGrid}>
            <span className={styles.pill}>Natal Chart Analysis</span>
            <span className={styles.pill}>Prashna Jyotish</span>
            <span className={styles.pill}>Muhurta Timing</span>
            <span className={styles.pill}>Remedial Astrology</span>
            <span className={styles.pill}>Kundli Milan</span>
            <span className={styles.pill}>Dasha Interpretation</span>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btnGold}
              onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Consult the Astrologist
            </button>
            <button
              className={styles.btnOutline}
              onClick={() => { setPage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Know the Astrologist
            </button>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
