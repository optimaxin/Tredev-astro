import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { MY_SKY_DATA } from '../../data/mockData';
import styles from './MySky.module.css';

const PLACEMENTS = [
  { label: 'Surya (Sun)', value: 'Vrischika (Scorpio)', house: '4th Bhava', symbol: '☉', color: 'var(--color-gold)' },
  { label: 'Chandra (Moon)', value: 'Vrishabha (Taurus)', house: '10th Bhava', symbol: '☽', color: 'var(--color-gold-light)' },
  { label: 'Lagna (Ascendant)', value: 'Simha (Leo)', house: '1st Bhava (Rising)', symbol: '↑', color: 'var(--color-gold-dark)' },
  { label: 'Janma Nakshatra', value: 'Rohini', house: 'Lunar Mansion', symbol: '✦', color: 'var(--color-terracotta)' },
];

const DAILY_CARDS = [
  {
    label: "Gochara (Daily Energy)",
    value: MY_SKY_DATA.todayEnergy,
    desc: MY_SKY_DATA.energyDesc,
    icon: '✦',
  },
  {
    label: 'Planetary Transits',
    value: MY_SKY_DATA.currentTransit,
    desc: MY_SKY_DATA.transitDesc,
    icon: '❂',
  },
  {
    label: 'Vimshottari Dasha',
    value: MY_SKY_DATA.mahadasha,
    desc: MY_SKY_DATA.mahadashaDesc,
    icon: '⌛',
  },
  {
    label: 'Chandra Position',
    value: MY_SKY_DATA.moonPosition,
    desc: MY_SKY_DATA.moonDesc,
    icon: '☽',
  },
];

export default function MySky() {
  const { birthProfile } = useAppContext();

  return (
    <section className={styles.section} id="mysky">
      {/* Background stars */}
      <div className={styles.bgStars} aria-hidden="true">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className={styles.star}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${Math.random() * 3 + 2}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Personalized Jyotish</span>
          <h2 className={styles.title}>Meri Jyotish</h2>
          <p className={styles.subtitle}>
            {birthProfile.name}&apos;s birth chart profile and active dashas.
          </p>
        </motion.div>

        {/* Birth Profile Banner */}
        <motion.div
          className={styles.profileBanner}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          {PLACEMENTS.map((p) => (
            <div key={p.label} className={styles.placement}>
              <span className={styles.placementSymbol} style={{ color: p.color }}>{p.symbol}</span>
              <div className={styles.placementInfo}>
                <span className={styles.placementLabel}>{p.label}</span>
                <span className={styles.placementValue}>{p.value}</span>
                <span className={styles.placementHouse}>{p.house}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Daily Cards */}
        <motion.div
          className={styles.dailyGrid}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {DAILY_CARDS.map((card) => (
            <div key={card.label} className={styles.dailyCard}>
              <div className={styles.dailyIcon}>{card.icon}</div>
              <div className={styles.dailyMeta}>
                <span className={styles.dailyLabel}>{card.label}</span>
                <span className={styles.dailyValue}>{card.value}</span>
                <span className={styles.dailyDesc}>{card.desc}</span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Ecosystem Banner */}
        <motion.div
          className={styles.ecosystem}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.7 }}
        >
          <div className={styles.ecosystemLabel}>
            <span className={styles.ecosystemBadge}>ONE BIRTH PROFILE</span>
            <span className={styles.ecosystemArrow}>→</span>
            <span className={styles.ecosystemText}>Powers your entire TredevAstro experience</span>
          </div>
          <div className={styles.ecosystemItems}>
            {['Kundli', 'Panchang', 'Margdarshan AI', 'Reports', 'Acharyas', 'Jyotish Upay', 'Ved Gurukul'].map(item => (
              <span key={item} className={styles.ecosystemItem}>{item}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
