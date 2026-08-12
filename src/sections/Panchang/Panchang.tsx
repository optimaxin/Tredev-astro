import React from 'react';
import { motion } from 'framer-motion';
import { PANCHANG } from '../../data/mockData';
import styles from './Panchang.module.css';

const FIELDS = [
  { label: 'Tithi', value: PANCHANG.tithi, icon: '☽' },
  { label: 'Nakshatra', value: PANCHANG.nakshatra, icon: '✦' },
  { label: 'Yoga', value: PANCHANG.yoga, icon: '◎' },
  { label: 'Karana', value: PANCHANG.karana, icon: '◈' },
  { label: 'Sunrise', value: PANCHANG.sunrise, icon: '☀' },
  { label: 'Sunset', value: PANCHANG.sunset, icon: '◑' },
  { label: 'Rahu Kaal', value: PANCHANG.rahuKaal, icon: '△' },
  { label: 'Abhijit Muhurat', value: PANCHANG.abhijit, icon: '⭐' },
  { label: 'Moon Sign', value: PANCHANG.moonSign, icon: '♃' },
];

export default function Panchang() {
  return (
    <section className={styles.section} id="panchang">
      <div className={styles.container}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Left: Header */}
          <div className={styles.left}>
            {/* Sun Arc */}
            <div className={styles.arcWrap}>
              <svg viewBox="0 0 200 120" className={styles.arc}>
                <defs>
                  <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c8a96b" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#c8a96b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#b97862" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Ground line */}
                <line x1="10" y1="110" x2="190" y2="110" stroke="rgba(200,169,107,0.2)" strokeWidth="1" />
                {/* Arc path */}
                <path d="M 20 110 Q 100 10 180 110" fill="none" stroke="url(#sunArcGrad)" strokeWidth="1.5" strokeDasharray="4 3" />
                {/* Sun position (70% through) */}
                <circle cx="148" cy="42" r="8" fill="rgba(200,169,107,0.15)" stroke="var(--color-gold)" strokeWidth="1" />
                <circle cx="148" cy="42" r="4" fill="var(--color-gold)" />
                {/* Sunrise label */}
                <text x="20" y="106" fontSize="8" fill="rgba(245,241,232,0.4)" fontFamily="DM Sans, sans-serif">Rise</text>
                <text x="172" y="106" fontSize="8" fill="rgba(245,241,232,0.4)" fontFamily="DM Sans, sans-serif">Set</text>
              </svg>
            </div>

            <span className="section-eyebrow" style={{ textAlign: 'center', display: 'block' }}>Today&apos;s Panchang</span>
            <h2 className={styles.title}>Celestial<br /><em className={styles.titleItalic}>Almanac</em></h2>
            <p className={styles.date}>{PANCHANG.date}</p>
            <p className={styles.location}>
              <span className={styles.locationPin}>◈</span> {PANCHANG.location}
            </p>
          </div>

          {/* Right: Fields */}
          <div className={styles.right}>
            <div className={styles.fieldsGrid}>
              {FIELDS.map(f => (
                <div key={f.label} className={styles.field}>
                  <span className={styles.fieldIcon}>{f.icon}</span>
                  <div className={styles.fieldContent}>
                    <span className={styles.fieldLabel}>{f.label}</span>
                    <span className={styles.fieldValue}>{f.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
