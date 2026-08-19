import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './Panchang.module.css';

// Mock Panchang data for different cities
const CITY_DATA: Record<string, typeof DELHI_DATA> = {
  default: {
    tithi: 'Panchami (5th)',
    nakshatra: 'Rohini',
    yoga: 'Shubha',
    karana: 'Balava',
    sunrise: '06:12 AM',
    sunset: '06:48 PM',
    rahuKaal: '04:30 – 06:00 PM',
    abhijit: '11:54 AM – 12:42 PM',
    moonSign: 'Vrishabha (Taurus)',
    choghadiya: ['Udveg', 'Char', 'Labh', 'Amrit'],
    moonPhase: 0.3,
    date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  },
};

const DELHI_DATA = {
  tithi: 'Panchami (5th)',
  nakshatra: 'Rohini',
  yoga: 'Shubha',
  karana: 'Balava',
  sunrise: '06:12 AM',
  sunset: '06:48 PM',
  rahuKaal: '04:30 – 06:00 PM',
  abhijit: '11:54 AM – 12:42 PM',
  moonSign: 'Vrishabha (Taurus)',
  choghadiya: ['Udveg', 'Char', 'Labh', 'Amrit'],
  moonPhase: 0.3,
  date: new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
};

const MOCK_CITIES: Record<string, typeof DELHI_DATA> = {
  'new delhi': { ...DELHI_DATA, sunrise: '06:12 AM', sunset: '06:48 PM', rahuKaal: '04:30 – 06:00 PM', abhijit: '11:54 AM – 12:42 PM', nakshatra: 'Rohini', moonSign: 'Vrishabha', moonPhase: 0.3 },
  'mumbai': { ...DELHI_DATA, sunrise: '06:30 AM', sunset: '07:02 PM', rahuKaal: '03:45 – 05:15 PM', abhijit: '12:10 PM – 12:58 PM', nakshatra: 'Mrigashira', moonSign: 'Mithuna', moonPhase: 0.35, tithi: 'Shashthi (6th)' },
  'bangalore': { ...DELHI_DATA, sunrise: '06:24 AM', sunset: '06:56 PM', rahuKaal: '04:00 – 05:30 PM', abhijit: '12:02 PM – 12:50 PM', nakshatra: 'Ardra', moonSign: 'Mithuna', moonPhase: 0.4, tithi: 'Saptami (7th)' },
  'chennai': { ...DELHI_DATA, sunrise: '06:08 AM', sunset: '06:22 PM', rahuKaal: '03:30 – 05:00 PM', abhijit: '11:48 AM – 12:36 PM', nakshatra: 'Punarvasu', moonSign: 'Karka', moonPhase: 0.45, tithi: 'Ashtami (8th)' },
  'kolkata': { ...DELHI_DATA, sunrise: '05:38 AM', sunset: '06:18 PM', rahuKaal: '03:00 – 04:30 PM', abhijit: '11:32 AM – 12:20 PM', nakshatra: 'Pushya', moonSign: 'Karka', moonPhase: 0.5, tithi: 'Navami (9th)' },
  'jaipur': { ...DELHI_DATA, sunrise: '06:18 AM', sunset: '06:54 PM', rahuKaal: '04:45 – 06:15 PM', abhijit: '12:00 PM – 12:48 PM', nakshatra: 'Ashlesha', moonSign: 'Karka', moonPhase: 0.28, tithi: 'Chaturthi (4th)' },
  'varanasi': { ...DELHI_DATA, sunrise: '05:52 AM', sunset: '06:30 PM', rahuKaal: '03:15 – 04:45 PM', abhijit: '11:40 AM – 12:28 PM', nakshatra: 'Magha', moonSign: 'Simha', moonPhase: 0.6, tithi: 'Dashami (10th)' },
};

// Sun position arc — animated based on current time
function SunArc({ sunrise, sunset, moonPhase }: { sunrise: string; sunset: string; moonPhase: number }) {
  // Parse sunrise hour for approximate position
  const sunriseHour = parseInt(sunrise.split(':')[0]);
  const currentHour = new Date().getHours();
  const sunsetHour = parseInt(sunset.split(':')[0]) + 12;
  const daylightHours = sunsetHour - sunriseHour;
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

const FIELDS = [
  { key: 'tithi', label: 'Tithi', icon: '☽' },
  { key: 'nakshatra', label: 'Nakshatra', icon: '✦' },
  { key: 'yoga', label: 'Yoga', icon: '◎' },
  { key: 'karana', label: 'Karana', icon: '◈' },
  { key: 'sunrise', label: 'Sunrise', icon: '☀' },
  { key: 'sunset', label: 'Sunset', icon: '◑' },
  { key: 'rahuKaal', label: 'Rahu Kaal', icon: '△' },
  { key: 'abhijit', label: 'Abhijit Muhurat', icon: '⭐' },
  { key: 'moonSign', label: 'Moon Sign', icon: '♃' },
] as const;

export default function Panchang() {
  const { isLoggedIn, setShowLoginModal, setPendingAction, pendingAction, t } = useAppContext();
  const [location, setLocation] = useState('New Delhi');
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [data, setData] = useState(DELHI_DATA);
  const [changing, setChanging] = useState(false);

  React.useEffect(() => {
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
    const key = inputValue.toLowerCase().trim();
    const found = MOCK_CITIES[key];
    setChanging(true);
    setTimeout(() => {
      if (found) {
        setData(found);
        setLocation(inputValue.charAt(0).toUpperCase() + inputValue.slice(1));
      }
      setShowInput(false);
      setInputValue('');
      setChanging(false);
    }, 600);
  }, [inputValue, isLoggedIn, setPendingAction, setShowLoginModal]);

  const handleChangeLocation = () => {
    if (!isLoggedIn) {
      setPendingAction('panchang-location');
      setShowLoginModal(true);
      return;
    }
    setShowInput(true);
  };

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
              <SunArc sunrise={data.sunrise} sunset={data.sunset} moonPhase={data.moonPhase} />
            </div>

            <p className={styles.date}>{data.date}</p>


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
                    Try: Mumbai · Bangalore · Chennai · Kolkata · Varanasi
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

            {/* Choghadiya quick view */}
            <div className={styles.choghadiya}>
              <span className={styles.choghadiyaLabel}>Today's Choghadiya</span>
              <div className={styles.choghadiyaPills}>
                {data.choghadiya.map((c, i) => (
                  <span key={i} className={styles.choghadiyaPill}>{c}</span>
                ))}
              </div>
            </div>
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
                      <span className={styles.fieldValue}>{(data as any)[f.key]}</span>
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
