import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { HOUSE_MEANINGS } from '../../data/mockData';
import { resolveBirthDetailsInput } from '../../utils/birthChart';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { MySkyResult } from '../../services/calculatorService';
import styles from './MySky.module.css';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function MySky() {
  const { birthProfile, currentUser } = useAppContext();
  const [sky, setSky] = useState<MySkyResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const birth = await resolveBirthDetailsInput(birthProfile, currentUser);
        const result = await calculatorService.mySky(birth);
        if (!cancelled) setSky(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof CalculatorApiError ? err.message : 'Could not load your sky right now.');
      }
    })();
    return () => { cancelled = true; };
  }, [birthProfile, currentUser]);

  const placements = sky
    ? [
        { label: 'Surya (Sun)', value: sky.sunRashi, house: '', symbol: '☉', color: 'var(--color-gold)' },
        { label: 'Chandra (Moon)', value: sky.moonRashi, house: '', symbol: '☽', color: 'var(--color-gold-light)' },
        { label: 'Lagna (Ascendant)', value: sky.ascendantRashi, house: '1st Bhava (Rising)', symbol: '↑', color: 'var(--color-gold-dark)' },
        { label: 'Janma Nakshatra', value: sky.moonNakshatra.name, house: `Pada ${sky.moonNakshatra.pada}`, symbol: '✦', color: 'var(--color-terracotta)' },
      ]
    : [];

  const dailyCards = sky
    ? [
        { label: 'Gochara (Daily Energy)', value: `${sky.todayMoonNakshatra} Moon`, desc: `Today's Moon transit is in ${sky.todayMoonNakshatra} Nakshatra.`, icon: '✦' },
        { label: 'Planetary Transits', value: `Jupiter in ${ordinal(sky.jupiterHouseFromMoon)} House`, desc: HOUSE_MEANINGS[sky.jupiterHouseFromMoon] || '', icon: '❂' },
        { label: 'Vimshottari Dasha', value: `${cap(sky.mahadasha.lord)} Mahadasha`, desc: `Active ${sky.mahadasha.startsAt} to ${sky.mahadasha.endsAt}.`, icon: '⌛' },
        { label: 'Chandra Position', value: `${sky.moonRashi} · ${sky.moonNakshatra.name}`, desc: `Pada ${sky.moonNakshatra.pada}.`, icon: '☽' },
      ]
    : [];

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

        {error && <p className={styles.subtitle} style={{ color: '#d64545' }}>{error}</p>}

        {/* Birth Profile Banner */}
        <motion.div
          className={styles.profileBanner}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          {placements.map((p) => (
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
          {dailyCards.map((card) => (
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
