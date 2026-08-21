import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import AncientDatePicker from '../../components/AncientDatePicker/AncientDatePicker';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { PanchangResult } from '../../services/calculatorService';
import { formatIst, istHourFraction } from '../../utils/istTime';
import styles from './Panchang.module.css';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Sun position arc — animated based on current time
function SunArc({ sunriseHour, sunsetHour, moonPhase }: { sunriseHour: number; sunsetHour: number; moonPhase: number }) {
  const currentHour = istHourFraction(new Date().toISOString());
  const daylightHours = Math.max(0.01, sunsetHour - sunriseHour);
  const elapsed = Math.max(0, Math.min(daylightHours, currentHour - sunriseHour));
  const sunProgress = Math.min(1, elapsed / daylightHours);

  // Sun position on arc
  const angle = Math.PI * sunProgress; // 0 to PI
  const cx = 20 + Math.cos(Math.PI - angle) * 80;
  const cy = 105 - Math.sin(angle) * 70;

  // Moon phase visualization
  const moonX = 170;
  const moonY = 30;

  return (
    <svg viewBox="0 0 200 120" className={styles.arc}>
      <defs>
        <linearGradient id="sunArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="var(--gold-primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--sacred-accent)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F1E9DC" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B9B3A8" stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--gold-primary)" stopOpacity="0.4" />
          <stop offset="100%" stopColor="var(--gold-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground line */}
      <line x1="10" y1="108" x2="190" y2="108" stroke="rgba(181,138,59,0.18)" strokeWidth="1" />

      {/* Sun arc */}
      <path
        d="M 20 108 Q 100 20 180 108"
        fill="none"
        stroke="url(#sunArcGrad)"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />

      {/* Sun glow */}
      <ellipse cx={cx} cy={cy} rx="12" ry="12" fill="url(#sunGlow)" />

      {/* Sun circle */}
      <circle cx={cx} cy={cy} r="5" fill="none" stroke="var(--gold-primary)" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--gold-primary)" opacity="0.85" />

      {/* Sunrise/Sunset labels */}
      <text x="18" y="119" fontSize="7" fill="rgba(181,138,59,0.5)" fontFamily="DM Sans, sans-serif">Rise</text>
      <text x="170" y="119" fontSize="7" fill="rgba(181,138,59,0.5)" fontFamily="DM Sans, sans-serif">Set</text>

      {/* Moon */}
      <circle cx={moonX} cy={moonY} r="10" fill="rgba(241, 233, 220, 0.08)" stroke="rgba(241,233,220,0.25)" strokeWidth="0.75" />
      {/* Moon phase crescent */}
      <path
        d={`M ${moonX} ${moonY - 10} A 10 10 0 0 1 ${moonX} ${moonY + 10} A ${10 * (0.5 - moonPhase) * 2} 10 0 0 0 ${moonX} ${moonY - 10}`}
        fill="rgba(241, 233, 220, 0.55)"
      />

      {/* Moon label */}
      <text x={moonX} y={moonY + 18} fontSize="7" fill="rgba(241,233,220,0.35)" fontFamily="DM Sans, sans-serif" textAnchor="middle">☽</text>
    </svg>
  );
}

export default function Panchang() {
  const { isLoggedIn, setShowLoginModal, setPendingAction, pendingAction, t } = useAppContext();
  const [location, setLocation] = useState('New Delhi, India');
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [data, setData] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);

  const loadFor = useCallback((place: string, date: string) => {
    setChanging(true);
    setError('');
    calculatorService.geocode(place)
      .then(geo => calculatorService.panchang(date, geo.latitude, geo.longitude).then(result => ({ geo, result })))
      .then(({ geo, result }) => {
        setData(result);
        setLocation(geo.displayName);
      })
      .catch(err => setError(err instanceof CalculatorApiError ? err.message : 'Could not load that Panchang. Please try again.'))
      .finally(() => setChanging(false));
  }, []);

  useEffect(() => { loadFor(location, selectedDate); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (val: string) => {
    setSelectedDate(val);
    loadFor(location, val);
  };

  useEffect(() => {
    if (isLoggedIn && pendingAction === 'panchang-location') {
      setShowInput(true);
      setPendingAction(null);
    }
  }, [isLoggedIn, pendingAction]);

  const applyLocation = useCallback(() => {
    if (!isLoggedIn) {
      setPendingAction('panchang-location');
      setShowLoginModal(true);
      setShowInput(false);
      return;
    }
    if (!inputValue.trim()) return;
    loadFor(inputValue.trim(), selectedDate);
    setShowInput(false);
    setInputValue('');
  }, [inputValue, isLoggedIn, setPendingAction, setShowLoginModal, loadFor, selectedDate]);

  const handleChangeLocation = () => {
    if (!isLoggedIn) {
      setPendingAction('panchang-location');
      setShowLoginModal(true);
      return;
    }
    setShowInput(true);
  };

  const fullTithiNumber = data ? (data.tithi.paksha === 'Shukla' ? data.tithi.number : data.tithi.number + 15) : 1;
  const moonPhase = ((fullTithiNumber - 0.5) * 12) / 360; // 0 = new moon, 0.5 = full moon — derived from the real tithi, not hardcoded

  const FIELDS = data ? [
    { label: 'Tithi', icon: '☽', value: `${data.tithi.name} (${data.tithi.paksha})` },
    { label: 'Nakshatra', icon: '✦', value: `${data.nakshatra.name} (Pada ${data.nakshatra.pada})` },
    { label: 'Yoga', icon: '◎', value: data.yoga },
    { label: 'Karana', icon: '◈', value: data.karana },
    { label: 'Sunrise', icon: '☀', value: `${formatIst(data.sunrise)} IST` },
    { label: 'Sunset', icon: '◑', value: `${formatIst(data.sunset)} IST` },
    { label: 'Rahu Kaal', icon: '△', value: data.rahuKaal ? `${formatIst(data.rahuKaal.start)} – ${formatIst(data.rahuKaal.end)} IST` : 'Unavailable' },
    { label: 'Abhijit Muhurat', icon: '⭐', value: data.abhijitMuhurat ? `${formatIst(data.abhijitMuhurat.start)} – ${formatIst(data.abhijitMuhurat.end)} IST` : 'Unavailable' },
    { label: 'Moon Sign', icon: '♃', value: data.moonRashi },
  ] : [];

  return (
    <section className={styles.section} id="panchang" aria-label="Today's Panchang">
      <CelestialBackdrop variant="surya_chandra" intensity="subtle" />
      <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">Panchangam</span>
            <h2 className="section-title-serif">{t('section_panchang_title')}</h2>
            <p className="section-desc-sans">{t('section_panchang_desc')}</p>
          </div>
        </div>

        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Left: Header + Sun/Moon Visual */}
          <div className={styles.left}>
            <div className={styles.arcWrap}>
              <SunArc
                sunriseHour={data?.sunrise ? istHourFraction(data.sunrise) : 6}
                sunsetHour={data?.sunset ? istHourFraction(data.sunset) : 18}
                moonPhase={moonPhase}
              />
            </div>

            <p className={styles.date}>{data ? `${data.vara}, ${new Date(data.date + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}` : 'Loading...'}</p>

            {/* Date picker — check any day's Panchang, not just today */}
            <div className={styles.locationWrap} style={{ marginTop: '4px' }}>
              <AncientDatePicker className={styles.cityInput} value={selectedDate} onChange={handleDateChange} placeholder="Select Date" />
              {selectedDate !== todayDateString() && (
                <button className={styles.cancelBtn} onClick={() => handleDateChange(todayDateString())} title="Back to today">Today</button>
              )}
            </div>

            {/* Location */}
            <div className={styles.locationWrap}>
              <span className={styles.locationPin}>◈</span>
              <span className={styles.locationName}>{location}</span>
            </div>

            {/* Change Location */}
            <AnimatePresence mode="wait">
              {showInput ? (
                <motion.div
                  className={styles.locationInput}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <input
                    type="text"
                    className={styles.cityInput}
                    placeholder="Enter city name..."
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && inputValue && applyLocation()}
                    autoFocus
                  />
                  <button
                    className={styles.applyBtn}
                    onClick={applyLocation}
                    disabled={!inputValue}
                  >
                    Apply
                  </button>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => { setShowInput(false); setInputValue(''); }}
                  >
                    ✕
                  </button>
                  <div className={styles.cityHints}>
                    Any city works now — e.g. Mumbai, Bangalore, Chennai, Kolkata, Varanasi
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  className={styles.changeLocationBtn}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={handleChangeLocation}
                >
                  Change Location
                  {!isLoggedIn && <span className={styles.lockIcon}>🔒</span>}
                </motion.button>
              )}
            </AnimatePresence>

            {error && <p style={{ color: '#d64545', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
          </div>

          {/* Right: Panchang Fields */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              className={styles.right}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: changing ? 0.3 : 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
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
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
