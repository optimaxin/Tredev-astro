import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import AncientDatePicker from '../../components/AncientDatePicker/AncientDatePicker';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { PanchangResult } from '../../services/calculatorService';
import { istHourFraction } from '../../utils/istTime';
import { HINDI_WEEKDAY, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_TITHI, HINDI_YOGA, HINDI_KARANA, hindiTime24, hindiOr } from '../../utils/panchangHindi';
import styles from './Panchang.module.css';

// Field labels for the dashboard card — this card (unlike the rest of the
// site's t()-driven copy) was always hardcoded in Hindi, so these live here
// rather than in AppContext's TRANSLATIONS table.
const PANCHANG_LABEL = {
  tithi: { hi: 'तिथि', en: 'Tithi' },
  nakshatra: { hi: 'नक्षत्र', en: 'Nakshatra' },
  moonRashi: { hi: 'चंद्र राशि', en: 'Moon Rashi' },
  vara: { hi: 'वार', en: 'Weekday' },
  yoga: { hi: 'योग', en: 'Yoga' },
  karana: { hi: 'करण', en: 'Karana' },
  sunrise: { hi: 'सूर्योदय', en: 'Sunrise' },
  sunset: { hi: 'सूर्यास्त', en: 'Sunset' },
  moonrise: { hi: 'चंद्रोदय', en: 'Moonrise' },
  moonset: { hi: 'चंद्रास्त', en: 'Moonset' },
  sunRashi: { hi: 'सूर्य राशि', en: 'Sun Rashi' },
  abhijit: { hi: 'अभिजीत मुहूर्त', en: 'Abhijit Muhurat' },
  vijaya: { hi: 'विजय मुहूर्त', en: 'Vijaya Muhurat' },
  amritKaal: { hi: 'अमृत काल', en: 'Amrit Kaal' },
  sarvarthaSiddhi: { hi: 'सर्वार्थ सिद्धि योग', en: 'Sarvartha Siddhi Yoga' },
  rahuKaal: { hi: 'राहु काल', en: 'Rahu Kaal' },
  yamagandaKaal: { hi: 'यमगंड काल', en: 'Yamaganda Kaal' },
};

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Sun/moon position arc spanning the FULL 24-hour day-night cycle (not just
// daylight) — during the day the Sun moves left-to-right along the arc,
// Rise-to-Set; after sunset the Moon takes over the SAME arc, moving
// Set-to-(next)Rise, so the marker always reflects the real current time
// instead of parking at one end all night. Also names the current Prahar —
// each of day and night classically divides into 4 equal Prahars.
function SunArc({ sunriseHour, sunsetHour, moonPhase, isHindi }: { sunriseHour: number; sunsetHour: number; moonPhase: number; isHindi: boolean }) {
  const currentHour = istHourFraction(new Date().toISOString());
  const dayLength = Math.max(0.01, sunsetHour - sunriseHour);
  const nightLength = Math.max(0.01, 24 - dayLength);
  const isDay = currentHour >= sunriseHour && currentHour < sunsetHour;

  const progress = isDay
    ? (currentHour - sunriseHour) / dayLength
    : (((currentHour >= sunsetHour ? currentHour - sunsetHour : currentHour + 24 - sunsetHour)) / nightLength);
  const praharNumber = Math.min(4, Math.floor(progress * 4) + 1);
  const praharLabel = isHindi
    ? (isDay ? `दिन का ${praharNumber} प्रहर` : `रात्रि का ${praharNumber} प्रहर`)
    : `${isDay ? 'Day' : 'Night'} Prahar ${praharNumber}`;

  const angle = Math.PI * Math.min(1, Math.max(0, progress));
  const cx = 20 + Math.cos(Math.PI - angle) * 80;
  const cy = 105 - Math.sin(angle) * 70;

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
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F1E9DC" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F1E9DC" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ground line */}
        <line x1="10" y1="108" x2="190" y2="108" stroke="rgba(181,138,59,0.18)" strokeWidth="1" />

        {/* Day/night arc — same path, walked by Sun by day and Moon by night */}
        <path
          d="M 20 108 Q 100 20 180 108"
          fill="none"
          stroke="url(#sunArcGrad)"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />

        {isDay ? (
          <>
            <ellipse cx={cx} cy={cy} rx="12" ry="12" fill="url(#sunGlow)" />
            <circle cx={cx} cy={cy} r="5" fill="none" stroke="var(--gold-primary)" strokeWidth="1.2" />
            <circle cx={cx} cy={cy} r="2.5" fill="var(--gold-primary)" opacity="0.85" />
          </>
        ) : (
          <>
            <ellipse cx={cx} cy={cy} rx="12" ry="12" fill="url(#moonGlow)" />
            <circle cx={cx} cy={cy} r="4.5" fill="#F1E9DC" opacity="0.9" />
          </>
        )}

        {/* Rise/Set labels */}
        <text x="18" y="119" fontSize="7" fill="rgba(181,138,59,0.5)" fontFamily="DM Sans, sans-serif">Rise</text>
        <text x="170" y="119" fontSize="7" fill="rgba(181,138,59,0.5)" fontFamily="DM Sans, sans-serif">Set</text>

        {/* Prahar label */}
        <text x="100" y="14" textAnchor="middle" fontSize="8" fill="var(--gold-primary)" fontFamily="DM Sans, sans-serif" fontWeight="600">{praharLabel}</text>

        {/* Tithi-based moon phase (independent of time of day/night) */}
        <circle cx={moonX} cy={moonY} r="10" fill="rgba(241, 233, 220, 0.08)" stroke="rgba(241,233,220,0.25)" strokeWidth="0.75" />
        <path
          d={`M ${moonX} ${moonY - 10} A 10 10 0 0 1 ${moonX} ${moonY + 10} A ${10 * (0.5 - moonPhase) * 2} 10 0 0 0 ${moonX} ${moonY - 10}`}
          fill="rgba(241, 233, 220, 0.55)"
        />
        <text x={moonX} y={moonY + 18} fontSize="7" fill="rgba(241,233,220,0.35)" fontFamily="DM Sans, sans-serif" textAnchor="middle">☽</text>
      </svg>
  );
}

export default function Panchang() {
  const { isLoggedIn, setShowLoginModal, setPendingAction, pendingAction, t, currentUser } = useAppContext();
  // Scoped to this card only — deliberately NOT the site-wide language
  // toggle (AppContext's language/setLanguage), so switching this doesn't
  // also change the rest of the site's language. Defaults to English (not
  // Hindi) to match the rest of the home page's default — a visitor who
  // hasn't touched any language toggle shouldn't see this one card start in
  // a different language than everything else.
  const [panchangLang, setPanchangLang] = useState<'en' | 'hi'>('en');
  const isHindi = panchangLang === 'hi';
  const language = panchangLang; // hindiOr()'s existing signature just wants a plain language string
  const [location, setLocation] = useState('New Delhi, India');
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [data, setData] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareCard = useCallback(async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      // Forces html2canvas's offscreen clone to lay out as if the window
      // were desktop-width, so the shared image always looks like the
      // laptop layout (3-column hero row etc.) regardless of what device —
      // phone, tablet, desktop — actually triggered the share.
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: null, windowWidth: 1280 });
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'panchang.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title?: string }) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: isHindi ? 'पावन पंचांग' : 'Sacred Panchang' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `panchang-${data?.date ?? todayDateString()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Could not create the shareable image. Please try again.');
    } finally {
      setSharing(false);
    }
  }, [data, isHindi]);

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

  const L = (key: keyof typeof PANCHANG_LABEL) => PANCHANG_LABEL[key][isHindi ? 'hi' : 'en'];
  const toRange = (start: string, end: string) => `${hindiTime24(start)} ${isHindi ? 'से' : 'to'} ${hindiTime24(end)}`;
  const paksha = data ? (isHindi ? (data.tithi.paksha === 'Shukla' ? 'शुक्ल' : 'कृष्ण') : data.tithi.paksha) : '';
  // The 3 fields people glance at first, called out as bigger hero chips
  // above the denser field grid instead of competing equally with everything else.
  const HERO_FIELDS = data ? [
    { icon: '☽', label: L('tithi'), value: `${hindiOr(language, HINDI_TITHI, data.tithi.name)} (${paksha})` },
    { icon: '✦', label: L('nakshatra'), value: hindiOr(language, HINDI_NAKSHATRA, data.nakshatra.name) },
    { icon: '☾', label: L('moonRashi'), value: hindiOr(language, HINDI_RASHI, data.moonRashi) },
  ] : [];
  const HINDI_FIELDS = data ? [
    { icon: '◈', label: L('vara'), value: hindiOr(language, HINDI_WEEKDAY, data.vara) },
    { icon: '◎', label: L('yoga'), value: hindiOr(language, HINDI_YOGA, data.yoga) },
    { icon: '✧', label: L('karana'), value: hindiOr(language, HINDI_KARANA, data.karana) },
    { icon: '☀', label: L('sunrise'), value: hindiTime24(data.sunrise) },
    { icon: '◑', label: L('sunset'), value: hindiTime24(data.sunset) },
    { icon: '☾', label: L('moonrise'), value: hindiTime24(data.moonrise) },
    { icon: '◐', label: L('moonset'), value: data.moonset ? hindiTime24(data.moonset) : (isHindi ? 'चंद्रास्त नहीं' : 'No moonset') },
    { icon: '☉', label: L('sunRashi'), value: hindiOr(language, HINDI_RASHI, data.sunRashi) },
  ] : [];
  const SHUBH_FIELDS = data ? [
    { label: L('abhijit'), value: data.abhijitMuhurat ? toRange(data.abhijitMuhurat.start, data.abhijitMuhurat.end) : null },
    { label: L('vijaya'), value: data.vijayaMuhurat ? toRange(data.vijayaMuhurat.start, data.vijayaMuhurat.end) : null },
    { label: L('amritKaal'), value: data.amritKaal ? toRange(data.amritKaal.start, data.amritKaal.end) : null },
    { label: L('sarvarthaSiddhi'), value: data.sarvarthaSiddhiYoga ? (isHindi ? 'आज है' : 'Today') : null },
  ].filter(f => f.value) : [];
  const ASHUBH_FIELDS = data ? [
    { label: L('rahuKaal'), value: data.rahuKaal ? toRange(data.rahuKaal.start, data.rahuKaal.end) : null },
    { label: L('yamagandaKaal'), value: data.yamagandaKaal ? toRange(data.yamagandaKaal.start, data.yamagandaKaal.end) : null },
  ].filter(f => f.value) : [];

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
            <button
              type="button"
              className={styles.changeLocationBtn}
              style={{ marginBottom: '12px' }}
              onClick={() => setPanchangLang(isHindi ? 'en' : 'hi')}
              title="Switch Panchang language"
            >
              {isHindi ? 'English' : 'हिंदी'}
            </button>
            <div className={styles.arcWrap}>
              <SunArc
                sunriseHour={data?.sunrise ? istHourFraction(data.sunrise) : 6}
                sunsetHour={data?.sunset ? istHourFraction(data.sunset) : 18}
                moonPhase={moonPhase}
                isHindi={isHindi}
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

          {/* Right: Panchang dashboard — a clean, always-light "printed
              almanac" card (white bordered tiles, gold accents), matching a
              direct reference. Deliberately fixed/not theme-adaptive; see
              .panchangDash in the CSS module for why. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              className={styles.right}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: changing ? 0.3 : 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.panchangDash} ref={cardRef} lang={isHindi ? 'hi' : 'en'}>
                <img src="/logo.png" alt="" aria-hidden="true" className={styles.panchangDashWatermark} />
                <div className={styles.panchangDashContent}>
                <div className={styles.panchangDashHeader}>
                  <div>
                    <p className={styles.panchangDashDate}>{data ? hindiOr(language, HINDI_WEEKDAY, data.vara) : '...'}</p>
                    <p className={styles.panchangDashBrand}>Tredev Astro · {isHindi ? 'पावन पंचांग' : 'Sacred Panchang'}{currentUser ? ` · ${currentUser.name}` : ''}</p>
                  </div>
                  <img src="/images/acharya.png" alt="" aria-hidden="true" className={styles.panchangDashFigure} />
                </div>

                <div className={styles.panchangDashHeroRow}>
                  {HERO_FIELDS.map(f => (
                    <div key={f.label} className={styles.panchangDashHeroTile}>
                      <span className={styles.panchangDashHeroIcon}>{f.icon}</span>
                      <span className={styles.panchangDashHeroLabel}>{f.label}</span>
                      <span className={styles.panchangDashHeroValue}>{f.value}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.panchangDashDetailGrid}>
                  {HINDI_FIELDS.map(f => (
                    <div key={f.label} className={styles.panchangDashDetailTile}>
                      <span className={styles.panchangDashDetailIcon}>{f.icon}</span>
                      <div>
                        <span className={styles.panchangDashDetailLabel}>{f.label}</span>
                        <span className={styles.panchangDashDetailValue}>{f.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.panchangDashMuhuratRow}>
                  {SHUBH_FIELDS.map(f => (
                    <span key={f.label} className={`${styles.panchangDashPill} ${styles.panchangDashPillShubh}`}>✓ {f.label} · {f.value}</span>
                  ))}
                  {ASHUBH_FIELDS.map(f => (
                    <span key={f.label} className={`${styles.panchangDashPill} ${styles.panchangDashPillAshubh}`}>⚠ {f.label} · {f.value}</span>
                  ))}
                </div>

                <p className={styles.panchangDashFooter}>{isHindi ? 'ॐ सर्वे भवन्तु सुखिनः · Tredev Astro · भारतीय समयानुसार (IST)' : 'Om Sarve Bhavantu Sukhinah · Tredev Astro · Indian Standard Time (IST)'}</p>
                </div>
              </div>

              <button className={styles.shareButton} onClick={shareCard} disabled={!data || sharing}>
                <span aria-hidden="true">↗</span> {sharing ? (isHindi ? 'तैयार हो रहा है...' : 'Preparing...') : (isHindi ? 'पंचांग शेयर करें' : 'Share Panchang')}
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
