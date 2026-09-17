import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import PlanetIcon from '../../components/PlanetIcon/PlanetIcon';
import { PLANET_META } from '../../data/planetMeta';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { DailyHoroscopeResult } from '../../services/calculatorService';
import styles from './Horoscope.module.css';

const RASHIS = [
  { name: 'Mesha', eng: 'Aries' },
  { name: 'Vrishabha', eng: 'Taurus' },
  { name: 'Mithuna', eng: 'Gemini' },
  { name: 'Karka', eng: 'Cancer' },
  { name: 'Simha', eng: 'Leo' },
  { name: 'Kanya', eng: 'Virgo' },
  { name: 'Tula', eng: 'Libra' },
  { name: 'Vrischika', eng: 'Scorpio' },
  { name: 'Dhanu', eng: 'Sagittarius' },
  { name: 'Makara', eng: 'Capricorn' },
  { name: 'Kumbha', eng: 'Aquarius' },
  { name: 'Meena', eng: 'Pisces' },
];

// Homepage teaser for the full Horoscope page (see
// pages/calculators/CalculatorPages.tsx's HoroscopePage) — a compact rashi
// picker plus the same "Today's Focus" line (1st-house transit) that page
// already computes, not a re-implementation of its full zodiac wheel.
export default function Horoscope() {
  const { setPage, t } = useAppContext();
  const [active, setActive] = useState(0);
  const [data, setData] = useState<DailyHoroscopeResult | null>(null);
  const [error, setError] = useState('');

  const current = RASHIS[active];

  useEffect(() => {
    setError('');
    setData(null);
    calculatorService.dailyHoroscope(current.eng)
      .then(setData)
      .catch(err => setError(err instanceof CalculatorApiError ? err.message : "Could not load today's horoscope."));
  }, [current.eng]);

  const focusPlanet = data?.transits.find(tr => tr.house === 1);

  const explore = () => { setPage('horoscope'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <section className={styles.section} id="horoscope">
      <CelestialBackdrop variant="rashi" intensity="subtle" />
      <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('section_horoscope_title')}</h2>
            <p className="section-desc-sans">{t('section_horoscope_desc')}</p>
          </div>
          <button className="section-explore-link" onClick={explore}>
            {t('cta_explore')} Horoscopes →
          </button>
        </div>

        <div className={styles.card}>
          {/* Wrapper carries the fade-out edge hint (a plain overflow-x:auto
              row gave no visual sign there were more signs to scroll to on
              mobile — it just looked cut off mid-button) — the scroll
              container itself stays plain so scroll-snap on its children
              isn't affected by the mask. */}
          <div className={styles.rashiRowWrap}>
            <div className={styles.rashiRow}>
              {RASHIS.map((r, i) => (
                <button
                  key={r.eng}
                  type="button"
                  className={`${styles.rashiBtn} ${i === active ? styles.rashiBtnActive : ''}`}
                  onClick={() => setActive(i)}
                  title={r.eng}
                >
                  <img src={`/images/zodiac/${r.eng}.png`} alt="" width={26} height={26} />
                  <span>{r.eng}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.preview} onClick={explore} role="button" tabIndex={0}>
            {error && <p className={styles.error}>{error}</p>}
            {!error && !data && <p className={styles.loading}>Reading today's transits for {current.eng}...</p>}
            {data && focusPlanet && (
              <p className={styles.focusLine}>
                <PlanetIcon id={focusPlanet.id} size={24} />
                <span>
                  <strong className={styles.focusRashi}>{current.name} ({current.eng}):</strong>{' '}
                  {PLANET_META[focusPlanet.id]?.name} is transiting your 1st house (Self) in {focusPlanet.rashi}
                  {focusPlanet.retrograde ? ' — Retrograde' : ''} — {PLANET_META[focusPlanet.id]?.quality}.
                </span>
              </p>
            )}
            {data && !focusPlanet && (
              <p className={styles.focusLine}>
                <span>See the full planetary transit breakdown for {current.eng} →</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
