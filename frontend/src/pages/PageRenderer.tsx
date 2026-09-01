import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import {
  PRODUCTS,
  COURSES,
  PANCHANG,
  HOUSE_MEANINGS
} from '../data/mockData';
import { contentService, ContentApiError } from '../services/contentService';
import type { AstrologyReport, BlogPost, ReportBundle, ReportPurchase } from '../services/contentService';
import { PLANET_META } from '../data/planetMeta';
import { useAstrologer } from '../hooks/useAstrologer';
import styles from './PageRenderer.module.css';

// Import landing sections
import Hero from '../sections/Hero/Hero';
import CampaignBanner from '../sections/CampaignBanner/CampaignBanner';
import JourneyCards from '../sections/JourneyCards/JourneyCards';
import KundliSection from '../sections/KundliSection/KundliSection';
import SeekGuidance from '../sections/SeekGuidance/SeekGuidance';
import GuidanceBanner from '../sections/Guidance/GuidanceBanner';
import FreeTools from '../sections/FreeTools/FreeTools';
import PanchangSection from '../sections/Panchang/Panchang';
import AstrologersSection from '../sections/Astrologers/Astrologers';
import AIAstrology from '../sections/AIAstrology/AIAstrology';
import ReportsSection from '../sections/Reports/Reports';
import StoreSection from '../sections/Store/Store';
import AcademySection from '../sections/Academy/Academy';
import Testimonials from '../sections/Testimonials/Testimonials';
import WhyTredevAstro from '../sections/WhyTredevAstro/WhyTredevAstro';
import BlogSection from '../sections/Blog/Blog';
import AuthPage from './AuthPage/AuthPage';
import AncientDatePicker from '../components/AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../components/AncientTimePicker/AncientTimePicker';
import BirthDetailsForm from '../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../components/BirthDetailsForm/BirthDetailsForm';
import PanchangDetailsForm from '../components/PanchangDetailsForm/PanchangDetailsForm';
import type { PanchangDetailsSubmitValue } from '../components/PanchangDetailsForm/PanchangDetailsForm';
import AstrologistDashboard from './AstrologistDashboard/AstrologistDashboard';
import AdminConsole from '../admin/AdminConsole';
import { useRealtime } from '../realtime/RealtimeContext';
import { calculatorService, CalculatorApiError } from '../services/calculatorService';
import type { DailyHoroscopeResult, FlamesOutcome, GunMilanResult, KaalSarpDoshaResult, KundliResult, MangalDoshaResult, NakshatraResult, NumerologyMatchResult, NumerologyResult, PanchangResult, RahuKetuTransitResult, SadeSatiResult } from '../services/calculatorService';
import { formatIst } from '../utils/istTime';
import { toSavedBirthDetails } from '../utils/birthDetails';
import { astrologerService, AstrologerApiError } from '../services/astrologerService';
import type { Review, UiAstrologer } from '../services/astrologerService';
import { consultationService, ConsultationApiError } from '../services/consultationService';
import type { MyConsultation } from '../services/consultationService';
import ChatWindow from '../components/ChatWindow/ChatWindow';

export default function PageRenderer() {
  const { page, setPage, selectedId, setSelectedId, cart, addToCart, removeFromCart, clearCart, birthProfile } = useAppContext();

  // Scroll to top on page navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Render sub-page layout
  switch (page) {
    case 'auth':
    case 'login':
      return <AuthPage />;

    case 'home':
      return (
        <>
          <Hero />
          <CampaignBanner />
          <SeekGuidance />

          <div className="yantra-watermark-right">
            <ReportsSection featured />
          </div>

          <div className="yantra-watermark-left">
            <FreeTools featured />
          </div>

          <div className="yantra-watermark-right">
            <PanchangSection />
          </div>

          <div className="yantra-watermark-left">
            <AstrologersSection featured />
          </div>

          <AIAstrology />

          <div className="yantra-watermark-right">
            <StoreSection featured />
          </div>

          <div className="yantra-watermark-left">
            <AcademySection featured />
          </div>

          <div className="yantra-watermark-right">
            <BlogSection />
          </div>

          <Testimonials />
          <WhyTredevAstro />
        </>
      );

    case 'free-kundli':
    case 'kundli-result':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <KundliSection />
          </div>
        </div>
      );

    case 'my-jyotish':
    case 'profile':
    case 'dashboard':
      return <DashboardEntry />;

    case 'horoscope':
      return <HoroscopePage />;

    case 'panchang':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <PanchangSection />
          </div>
        </div>
      );

    case 'choghadiya':
      return <ChoghadiyaPage />;

    case 'muhurat-finder':
      return <MuhuratFinderPage />;

    case 'abhijit-muhurat':
      return <AbhijitMuhuratPage />;

    case 'kundli-matching':
      return <KundliMatchingPage />;

    case 'nakshatra-finder':
      return <NakshatraFinderPage />;

    case 'mangal-dosha':
      return <MangalDoshaPage />;

    case 'sade-sati':
      return <SadeSatiPage />;

    case 'kaal-sarp-dosha':
      return <KaalSarpDoshaPage />;

    case 'rahu-ketu-transit':
      return <RahuKetuTransitPage />;

    case 'moon-sign':
      return <MoonSignPage />;

    case 'ascendant':
      return <AscendantPage />;

    case 'numerology':
      return <NumerologyPage />;

    case 'life-path-number':
      return <LifePathNumberPage />;

    case 'name-numerology':
      return <NameNumerologyPage />;

    case 'numerology-match':
      return <NumerologyMatchPage />;

    case 'flames':
      return <FlamesPage />;

    case 'astrology-tools':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <div className={styles.pageHeader}>
              <span className="section-eyebrow">Astrology Utilities</span>
              <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Astrology Tools</h1>
              <div className={styles.divider}>✦ ❖ ✦</div>
              <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>
                Explore birth calculators, relationship matches, doshas, and daily timing utilities.
              </p>
            </div>
            <FreeTools />
          </div>
        </div>
      );

    case 'astrologers':
      return (
        <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
          <div className={styles.container}>
            <AstrologersSection />
          </div>
        </div>
      );

    case 'astrologer-profile':
      return <AstrologerProfilePage id={selectedId} />;

    case 'consultation-booking':
      return <ConsultationBookingPage id={selectedId} />;

    case 'consultation-waiting':
      return <ConsultationWaitingPage />;

    case 'reports':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <ReportsSection />
          </div>
        </div>
      );

    case 'report-detail':
      return <ReportDetailPage id={selectedId} />;

    case 'store':
      return (
        <div className={`${styles.pageWrapper} ${styles.maroonPage}`}>
          <div className={styles.container}>
            <StoreSection />
          </div>
        </div>
      );

    case 'product-detail':
      return <ProductDetailPage id={selectedId} />;

    case 'cart':
      return <CartPage />;

    case 'checkout':
      return <CheckoutPage />;

    case 'academy':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <AcademySection />
          </div>
        </div>
      );

    case 'course-detail':
      return <CourseDetailPage id={selectedId} />;

    case 'course-learning':
      return <CourseLearningPage id={selectedId} />;

    case 'ask-tredevastro':
      return (
        <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
          <div className={styles.container}>
            <AIAstrology />
          </div>
        </div>
      );

    case 'my-reports':
      return <MyReportsPage />;

    case 'my-consultations':
      return <MyConsultationsPage />;

    case 'my-orders':
      return <MyOrdersPage />;

    case 'blog':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <BlogSection />
          </div>
        </div>
      );

    case 'blog-detail':
      return <BlogDetailPage id={selectedId} />;

    case 'about':
      return <AboutPage />;

    default:
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container} style={{ textAlign: 'center' }}>
            <h2>Page Not Found</h2>
            <button className="btn btn-gold" onClick={() => setPage('home')}>Go Home</button>
          </div>
        </div>
      );
  }
}

/* ====================================================
   SUB-PAGE COMPONENTS
   ==================================================== */

// 1. Horoscope Page
// Classical Naisargika (natural) benefic/malefic classification — a real,
// standard Vedic categorization, not an invented one. Mercury is naturally
// neutral (its nature follows whichever planet it's conjunct/aspected by),
// so it gets neither color.
const NATURAL_BENEFIC = new Set(['jupiter', 'venus', 'moon']);
const NATURAL_MALEFIC = new Set(['saturn', 'mars', 'sun', 'rahu', 'ketu']);

function HoroscopePage() {
  const [activeRashi, setActiveRashi] = useState(0);
  const [transitData, setTransitData] = useState<DailyHoroscopeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const RASHIS = [
    { name: 'Mesha', eng: 'Aries', element: 'Fire', graha: 'Mars', index: 1 },
    { name: 'Vrishabha', eng: 'Taurus', element: 'Earth', graha: 'Venus', index: 2 },
    { name: 'Mithuna', eng: 'Gemini', element: 'Air', graha: 'Mercury', index: 3 },
    { name: 'Karka', eng: 'Cancer', element: 'Water', graha: 'Moon', index: 4 },
    { name: 'Simha', eng: 'Leo', element: 'Fire', graha: 'Sun', index: 5 },
    { name: 'Kanya', eng: 'Virgo', element: 'Earth', graha: 'Mercury', index: 6 },
    { name: 'Tula', eng: 'Libra', element: 'Air', graha: 'Venus', index: 7 },
    { name: 'Vrischika', eng: 'Scorpio', element: 'Water', graha: 'Mars', index: 8 },
    { name: 'Dhanu', eng: 'Sagittarius', element: 'Fire', graha: 'Jupiter', index: 9 },
    { name: 'Makara', eng: 'Capricorn', element: 'Earth', graha: 'Saturn', index: 10 },
    { name: 'Kumbha', eng: 'Aquarius', element: 'Air', graha: 'Saturn', index: 11 },
    { name: 'Meena', eng: 'Pisces', element: 'Water', graha: 'Jupiter', index: 12 },
  ];

  const current = RASHIS[activeRashi];

  useEffect(() => {
    setError('');
    setLoading(true);
    calculatorService.dailyHoroscope(current.eng)
      .then(setTransitData)
      .catch(err => setError(err instanceof CalculatorApiError ? err.message : 'Could not load today\'s transits. Please try again.'))
      .finally(() => setLoading(false));
  }, [current.eng]);

  const sortedTransits = transitData ? [...transitData.transits].sort((a, b) => a.house - b.house) : [];
  const focusPlanet = sortedTransits.find(t => t.house === 1);

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Rashi Rashiphal</span>
          <h1 className={styles.pageTitle}>Free Horoscopes</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle}>
            Real, freshly-computed planetary transits for today, read against your Moon Sign — not a canned prediction.
          </p>
        </div>

        <div className={styles.horoscopeLayout}>
          {/* Wheel Selector — a real 12-segment zodiac ring (wedges radiating
              from a center hub, like a printed horoscope wheel) instead of
              12 loose circles floating around a rim, which read as a rotary
              phone dial rather than an astrological chart. */}
          <div className={styles.wheelColumn}>
            <div className={styles.zodiacWheelWrap}>
              <svg viewBox="0 0 400 400" className={styles.zodiacWheelSvg}>
                <circle cx="200" cy="200" r="190" className={styles.wheelRimOuter} />
                <circle cx="200" cy="200" r="106" className={styles.wheelRimInner} />
                {/* Degree tick marks — 3 per sign (every 10°), the fine
                    graduated-rim detail a real horoscope wheel has. */}
                {Array.from({ length: 36 }, (_, t) => {
                  const deg = t * 10 - 90;
                  const rad = (deg * Math.PI) / 180;
                  const long = t % 3 === 0;
                  const r1 = long ? 178 : 184;
                  return (
                    <line
                      key={t}
                      x1={200 + Math.cos(rad) * r1} y1={200 + Math.sin(rad) * r1}
                      x2={200 + Math.cos(rad) * 190} y2={200 + Math.sin(rad) * 190}
                      className={styles.wheelTick}
                    />
                  );
                })}
                {RASHIS.map((r, i) => {
                  const startDeg = i * 30 - 90;
                  const endDeg = startDeg + 30;
                  const midRad = ((startDeg + 15) * Math.PI) / 180;
                  const p = (deg: number, radius: number) => {
                    const rad = (deg * Math.PI) / 180;
                    return [200 + Math.cos(rad) * radius, 200 + Math.sin(rad) * radius];
                  };
                  const [x1, y1] = p(startDeg, 190);
                  const [x2, y2] = p(endDeg, 190);
                  const [x3, y3] = p(endDeg, 106);
                  const [x4, y4] = p(startDeg, 106);
                  const wedgePath = `M${x1},${y1} A190,190 0 0 1 ${x2},${y2} L${x3},${y3} A106,106 0 0 0 ${x4},${y4} Z`;
                  const iconX = 200 + Math.cos(midRad) * 148;
                  const iconY = 200 + Math.sin(midRad) * 148;

                  return (
                    <g
                      key={r.name}
                      className={`${styles.wheelWedge} ${activeRashi === i ? styles.wheelWedgeActive : ''}`}
                      onClick={() => setActiveRashi(i)}
                    >
                      <title>{`${r.name} (${r.eng})`}</title>
                      <path d={wedgePath} className={styles.wedgeFill} />
                      {/* The icons are plain black line-art (background just
                          stripped from opaque white) — a light medallion
                          backing keeps them visible against a dark-theme
                          wedge, which pure black on a dark surface wouldn't
                          be. */}
                      <circle cx={iconX} cy={iconY} r="19" className={styles.wedgeIconBacking} />
                      <image href={`/images/zodiac/${r.eng}.png`} x={iconX - 15} y={iconY - 15} width="30" height="30" className={styles.wedgeIcon} />
                    </g>
                  );
                })}
                <circle cx="200" cy="200" r="104" className={styles.wheelHub} />
                <text x="200" y="196" textAnchor="middle" className={styles.wheelHubName}>{current.name}</text>
                <text x="200" y="214" textAnchor="middle" className={styles.wheelHubEng}>{current.eng}</text>
              </svg>
            </div>
            <p className={styles.reviewText}>✦ Select a sign on the ring to view its forecast ✦</p>
          </div>

          {/* Details Column */}
          <div className={styles.horoscopeDetailsCard}>
            <div className={styles.rashiHeader}>
              <h2 className={styles.rashiTitle}>{current.name}</h2>
              <span className={styles.rashiMeta}>{current.eng} Moon Sign</span>
            </div>

            <div className={styles.rashiSpecs}>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Ruling Graha</span>
                <span className={styles.specVal}>{current.graha}</span>
              </div>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Element</span>
                <span className={styles.specVal}>{current.element}</span>
              </div>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Traditional Key</span>
                <span className={styles.specVal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <img src={`/images/zodiac/${current.eng}.png`} alt="" width={16} height={16} /> Rashi
                </span>
              </div>
            </div>

            <div className={styles.horoscopeText}>
              {error && <p style={{ color: '#d64545' }}>{error}</p>}
              {loading && !transitData && (
                <p className={styles.reviewText}>Computing today's transits for {current.eng}...</p>
              )}
              {transitData && (
                <>
                  <p className={styles.reviewText} style={{ marginBottom: '14px', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    Real planetary transits for {transitData.date}, counted as houses from {current.eng} (treated as your Moon Sign) — the standard Vedic approach for rashi-based predictions.
                  </p>

                  {focusPlanet && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '14px', background: 'rgba(199, 161, 90, 0.08)', border: '1px solid var(--border-subtle)', borderRadius: '8px', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                      <span style={{ fontSize: '1.3rem' }}>{PLANET_META[focusPlanet.id]?.symbol}</span>
                      <span>
                        <strong style={{ color: 'var(--gold-primary)' }}>Today's Focus:</strong>{' '}
                        {PLANET_META[focusPlanet.id]?.name} is transiting your 1st house (Self) in {focusPlanet.rashi}{focusPlanet.retrograde ? ' — Retrograde' : ''} — {PLANET_META[focusPlanet.id]?.quality}.
                      </span>
                    </div>
                  )}

                  <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    {sortedTransits.map(t => {
                      const meta = PLANET_META[t.id];
                      const dotColor = NATURAL_BENEFIC.has(t.id) ? '#4caf7d' : NATURAL_MALEFIC.has(t.id) ? '#c85a5a' : '#9a9a9a';
                      return (
                        // A fixed 160px third column used to hold the house-meaning
                        // text — on a narrower details card (or a longer meaning
                        // string) that guessed width either overflowed the card or
                        // wrapped and threw the row's vertical alignment off relative
                        // to its neighbors. Stacking the meaning as a second line
                        // under the planet name instead can't misalign at any width.
                        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '6px' }} title={NATURAL_BENEFIC.has(t.id) ? 'Naturally benefic' : NATURAL_MALEFIC.has(t.id) ? 'Naturally malefic' : 'Naturally neutral'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div>
                              {meta?.symbol} {meta?.name || t.id} in {t.rashi}
                              {t.retrograde && <span style={{ marginLeft: '6px', fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(200,90,90,0.15)', color: '#c85a5a' }}>℞ Retrograde</span>}
                            </div>
                            <div style={{ color: 'var(--color-text-muted, #999)', fontSize: '13px', marginTop: '2px' }}>
                              {t.house}{ordinal(t.house)} house — {HOUSE_MEANINGS[t.house]?.split('—')[1]?.trim()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '14px' }}>
                    Dot colors show each planet's classical natural temperament (green = benefic, red = malefic, grey = neutral) — a fixed classical property of the planet itself, not a verdict on today specifically.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChoghadiyaPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Choghadiya" title="Choghadiya Muhurat Table" description="All 8 day segments and 8 night segments, each ruled by one of 7 classical types — auspicious, neutral, or inauspicious.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Show Choghadiya" idPrefix="choghadiya" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && !result.choghadiya && (
        <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--color-text-muted)' }}>Could not compute sunrise/sunset for this location and date.</p>
      )}
      {result?.choghadiya && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Day Choghadiya (Sunrise to Sunset)</h3>
          {result.choghadiya.day.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: s.auspicious ? '#2e7d32' : '#b23c3c', fontWeight: 500 }}>{s.name} {s.auspicious ? '(Auspicious)' : '(Inauspicious)'}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          <h3 className={styles.partnerTitle} style={{ border: 'none', marginTop: '20px' }}>Night Choghadiya (Sunset to Next Sunrise)</h3>
          {result.choghadiya.night.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: s.auspicious ? '#2e7d32' : '#b23c3c', fontWeight: 500 }}>{s.name} {s.auspicious ? '(Auspicious)' : '(Inauspicious)'}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Amrit, Labh, Shubh, and Chal are auspicious; Rog, Kaal, and Udveg are inauspicious — cross-check against any other Choghadiya table for the same date, time, and place.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function MuhuratFinderPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  const goodWindows = result?.choghadiya ? [...result.choghadiya.day, ...result.choghadiya.night].filter(s => s.auspicious) : [];

  return (
    <CalculatorPageShell eyebrow="Muhurat Finder" title="Find an Auspicious Muhurat" description="Filters the day's Choghadiya down to only the auspicious windows (Amrit, Shubh, Labh, Chal) — good times to start something new.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Find Good Muhurats" idPrefix="muhurat" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result?.choghadiya && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{goodWindows.length} Auspicious Windows on {result.date}</h3>
          {goodWindows.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: '#2e7d32', fontWeight: 500 }}>{s.name}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          {result.abhijitMuhurat && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <strong>Also: Abhijit Muhurat</strong> — {formatIst(result.abhijitMuhurat.start)} – {formatIst(result.abhijitMuhurat.end)} IST (considered auspicious on any weekday, centered on solar noon).
            </div>
          )}
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function AbhijitMuhuratPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Abhijit Muhurat" title="Find Today's Abhijit Muhurat" description="The 8th of 15 equal divisions of daylight, centered on solar noon — considered auspicious for starting important work on any weekday.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Find Abhijit Muhurat" idPrefix="abhijit" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          {result.abhijitMuhurat ? (
            <>
              <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{formatIst(result.abhijitMuhurat.start)} – {formatIst(result.abhijitMuhurat.end)} IST</h3>
              <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
                Sunrise was at {formatIst(result.sunrise)} IST and sunset is at {formatIst(result.sunset)} IST for this date and place — Abhijit Muhurat is the 8th of 15 equal muhurtas dividing that daylight span.
              </p>
            </>
          ) : (
            <p style={{ textAlign: 'center' }}>Could not compute sunrise/sunset for this location and date.</p>
          )}
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function ordinal(n: number): string {
  if (n % 10 === 1 && n !== 11) return 'st';
  if (n % 10 === 2 && n !== 12) return 'nd';
  if (n % 10 === 3 && n !== 13) return 'rd';
  return 'th';
}

// 2. Kundli Matching (Guna Milan) Page — real Ashtakoot calculation, both
// partners' places are geocoded server-side (see BirthDetailsForm) rather
// than trusting a free-text city name.
function verdictForScore(total: number): string {
  if (total >= 32) return 'Excellent Match — a highly auspicious pairing by classical Ashtakoot standards.';
  if (total >= 24) return 'Good Match — favourable compatibility with strong long-term potential.';
  if (total >= 18) return 'Average Match — workable, but review the Nadi and Bhakoot scores below with an astrologer.';
  return 'Not Recommended — this pairing scores below the classical minimum (18/36).';
}

function PartnerBirthFields({ title, value, onChange }: { title: string; value: { name: string; dob: string; tob: string; place: string }; onChange: (v: typeof value) => void }) {
  return (
    <div className={styles.partnerFormCard}>
      <h3 className={styles.partnerTitle}>✦ {title}</h3>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Name</label>
        <input type="text" className="input-field input-cosmos" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} />
      </div>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Date of Birth</label>
        <AncientDatePicker className="input-field input-cosmos" value={value.dob} onChange={val => onChange({ ...value, dob: val })} placeholder="Select Date of Birth" />
      </div>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Time of Birth</label>
        <AncientTimePicker className="input-field input-cosmos" value={value.tob} onChange={val => onChange({ ...value, tob: val })} placeholder="Select Time of Birth" />
      </div>
      <div className="form-group">
        <label className="form-label">Place of Birth</label>
        <input type="text" className="input-field input-cosmos" placeholder="City, Country" value={value.place} onChange={e => onChange({ ...value, place: e.target.value })} />
      </div>
    </div>
  );
}

function KundliMatchingPage() {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GunMilanResult | null>(null);
  const [boy, setBoy] = useState({ name: 'Rohit', dob: '1992-04-14', tob: '08:30', place: 'Mumbai, India' });
  const [girl, setGirl] = useState({ name: 'Meera', dob: '1993-07-20', tob: '14:45', place: 'Pune, India' });

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boy.dob || !boy.tob || !boy.place || !girl.dob || !girl.tob || !girl.place) return;
    setCalculating(true);
    setError('');
    setResult(null);
    try {
      const [boyGeo, girlGeo] = await Promise.all([calculatorService.geocode(boy.place), calculatorService.geocode(girl.place)]);
      // India Standard Time (UTC+5:30) — matches the timezone assumption
      // used elsewhere on this form; a full per-partner timezone picker
      // would be the next refinement if international users need it.
      const data = await calculatorService.kundliMatching(
        { date: girl.dob, time: girl.tob, timezoneOffsetMinutes: -330, latitude: girlGeo.latitude, longitude: girlGeo.longitude },
        { date: boy.dob, time: boy.tob, timezoneOffsetMinutes: -330, latitude: boyGeo.latitude, longitude: boyGeo.longitude }
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate the match. Please check the birth details and try again.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Ashta Koota Milan</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Kundli Matching</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>
            Traditional Guna Milan analysis to examine marriage compatibility based on Nakshatra alignment.
          </p>
        </div>

        <div className={styles.matchingLayout}>
          <form onSubmit={handleMatch} className={styles.matchingGrid}>
            <PartnerBirthFields title="Partner 1 (Boy)" value={boy} onChange={setBoy} />
            <PartnerBirthFields title="Partner 2 (Girl)" value={girl} onChange={setGirl} />

            <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '16px' }}>
              {error && <p style={{ color: '#d64545', marginBottom: '12px' }}>{error}</p>}
              <button type="submit" className="btn btn-gold btn-lg" disabled={calculating}>
                {calculating ? 'Analyzing Charts...' : 'Calculate Guna Match'}
              </button>
            </div>
          </form>

          {/* Results Output */}
          {result && (
            <div className={styles.compatibilityResult}>
              <div className={styles.compatHeader}>
                <div>
                  <h3 className={styles.partnerTitle} style={{ border: 'none', margin: 0 }}>Guna Milan Result</h3>
                  <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', margin: 0 }}>
                    Match between {boy.name} &amp; {girl.name} — {result.brideMoonRashi} Moon &amp; {result.groomMoonRashi} Moon
                  </p>
                </div>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreVal}>{result.totalPoints}</span>
                  <span className={styles.scoreLabel}>Out of 36</span>
                </div>
              </div>

              <div className={styles.compatGrid}>
                {result.kootas.map(k => (
                  <div className={styles.compatBox} key={k.name}>
                    <span className={styles.compatLabel}>{k.name}</span>
                    <span className={styles.compatVal}>{k.points} / {k.maxPoints}</span>
                  </div>
                ))}
              </div>

              <div className={styles.compatVerdict}>
                <strong>Vedic Verdict:</strong> {verdictForScore(result.totalPoints)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Nakshatra Finder, Mangal Dosha, Sade Sati, Numerology — one shared shell:
// a single BirthDetailsForm feeding a calculator endpoint, with the result
// shown alongside the raw computed values (not just a verdict), so the
// numbers can be independently cross-checked against any other Kundli tool.
function CalculatorPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container} style={{ maxWidth: '720px' }}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>{title}</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.compatibilityResult} style={{ marginTop: '32px' }}>
      {children}
    </div>
  );
}

function NakshatraFinderPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<NakshatraResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.nakshatra(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Nakshatra Finder" title="Find Your Birth Nakshatra" description="Your Nakshatra (lunar mansion) is determined by the Moon's exact position at your birth moment.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Nakshatra" idPrefix="nakshatra" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Nakshatra: {result.name} (Pada {result.pada})</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Moon sits at {result.moonLongitude.toFixed(2)}° sidereal longitude, in {result.rashi} Rashi — that places it in the {result.name} Nakshatra,
            {' '}Pada {result.pada}, ruled by {result.lord.charAt(0).toUpperCase() + result.lord.slice(1)}.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            You can cross-check this against any other Kundli tool using the same birth date, time, and place — the Moon's longitude above should match closely.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function MangalDoshaPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<MangalDoshaResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.mangalDosha(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Mangal Dosha" title="Mangal Dosha (Manglik) Check" description="Checks whether Mars falls in a Manglik-causing house counted from your Ascendant.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Mangal Dosha" idPrefix="mangal" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{result.isManglik ? 'You are Manglik' : 'You are Not Manglik'}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Mars is placed in your {result.marsHouse}{ordinal(result.marsHouse)} house from the Ascendant. Mangal Dosha applies when Mars is in house
            1, 2, 4, 7, 8, or 12 from the Ascendant — {result.isManglik ? 'and that is the case here.' : 'which is not the case here.'}
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Some traditions also check Mars's house from the Moon or Venus — this result uses the Ascendant-based rule, the most widely used version.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function SadeSatiPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<SadeSatiResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.sadeSati(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  const phaseLabel: Record<string, string> = { rising: 'Rising phase (first 2.5 years)', peak: 'Peak phase (middle 2.5 years)', setting: 'Setting phase (final 2.5 years)' };

  return (
    <CalculatorPageShell eyebrow="Sade Sati" title="Sade Sati Checker" description="Checks whether Saturn is currently transiting the 12th, 1st, or 2nd rashi from your natal Moon.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Sade Sati" idPrefix="sadesati" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{result.active ? 'Sade Sati is currently active' : 'Sade Sati is not currently active'}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your natal Moon is in {result.moonRashi}. Saturn is currently transiting {result.saturnTransitRashi}.
            {result.active && result.phase ? ` This is your ${phaseLabel[result.phase]}.` : ' Saturn is not in the 12th, 1st, or 2nd sign from your Moon right now.'}
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function KaalSarpDoshaPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<KaalSarpDoshaResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.kaalSarpDosha(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Kaal Sarp Dosha" title="Kaal Sarp Dosha Check" description="Checks whether all 7 classical planets fall within the same half of the zodiac bounded by Rahu and Ketu.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Kaal Sarp Dosha" idPrefix="kaalsarp" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{result.isKaalSarp ? 'Kaal Sarp Dosha is present' : 'Kaal Sarp Dosha is not present'}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Rahu is in {result.rahuRashi} and Ketu is in {result.ketuRashi} — these two are always exactly opposite each other.
            {result.isKaalSarp
              ? ` All 7 other planets fall within the half of the zodiac running from ${result.enclosedSide === 'rahu-to-ketu' ? 'Rahu to Ketu' : 'Ketu to Rahu'} — the classical condition for Kaal Sarp Dosha.`
              : ' Your other 7 planets are split across both halves of the Rahu-Ketu axis, so the classical condition for Kaal Sarp Dosha is not met.'}
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            You can verify this yourself: check each planet's sign against your Rahu and Ketu signs above in the Free Kundli chart — if every planet falls on one side, the dosha applies.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function RahuKetuTransitPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<RahuKetuTransitResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.rahuKetuTransit(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Rahu-Ketu Transit" title="Rahu-Ketu Transit Tracker" description="Shows where the currently-transiting lunar nodes sit relative to your natal Moon.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Transit" idPrefix="rahuketu" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Transiting Rahu is in your {result.rahuHouseFromMoon}{ordinal(result.rahuHouseFromMoon)} house from the Moon</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your natal Moon is in {result.moonRashi}. Rahu is currently transiting {result.rahuTransitRashi} ({result.rahuHouseFromMoon}{ordinal(result.rahuHouseFromMoon)} house from your Moon),
            and Ketu is transiting {result.ketuTransitRashi} ({result.ketuHouseFromMoon}{ordinal(result.ketuHouseFromMoon)} house from your Moon).
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Classical sources disagree on which transit houses are favorable or challenging, so this reports the factual transit position rather than a one-size-fits-all verdict — read it alongside the rest of your chart.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function MoonSignPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<NakshatraResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.nakshatra(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Moon Sign Calculator" title="Find Your Moon Sign (Rashi)" description="Your Moon Sign is the zodiac sign (one of 12) the Moon occupied at your exact birth moment — the core of Vedic astrology, distinct from your Sun sign.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Moon Sign" idPrefix="moonsign" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Moon Sign is {result.rashi}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Moon sits at {result.moonLongitude.toFixed(2)}° sidereal longitude, placing it in {result.rashi} — the sign, out of 12, the Moon occupied at your birth moment.
            It also falls within the {result.name} Nakshatra (Pada {result.pada}); for the full 27-Nakshatra breakdown, see the dedicated Nakshatra Finder.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function AscendantPage() {
  const { currentUser } = useAppContext();
  const [result, setResult] = useState<KundliResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.kundli(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Lagna / Ascendant" title="Find Your Ascendant (Lagna)" description="Your Ascendant is the zodiac sign rising on the eastern horizon at your exact birth moment and place — it defines your 1st house and the whole-sign house layout of your chart.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Ascendant" idPrefix="ascendant" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Ascendant (Lagna) is {result.ascendant.rashi}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            At {result.ascendant.degreeInSign.toFixed(2)}° into {result.ascendant.rashi}, this sign is rising on the eastern horizon at your exact birth time and place.
            Because Vedic astrology uses whole-sign houses, {result.ascendant.rashi} becomes your 1st house, and every other sign follows in order for houses 2 through 12.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Since this depends on your exact birth time (it changes roughly every 2 hours), it's more time-sensitive than your Sun or Moon sign — double-check your birth time if this looks off.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function NumerologyPage() {
  const { currentUser } = useAppContext();
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Numerology" title="Full Numerology Report" description="All four Pythagorean numbers derived from your full name and date of birth, in one place.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Calculate My Numbers'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Life Path</span><span className={styles.compatVal}>{result.lifePathNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.soulUrgeNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Personality</span><span className={styles.compatVal}>{result.personalityNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Life Path is derived from your full date of birth; Destiny, Soul Urge, and Personality from the letters in your name (Pythagorean system). Numbers 11, 22, and 33 are Master Numbers and are shown unreduced.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function LifePathNumberPage() {
  const { currentUser } = useAppContext();
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Life Path Number" title="Find Your Life Path Number" description="Derived purely from your date of birth — the single most important number in Pythagorean numerology, describing your core life direction.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Find My Life Path Number'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>Your Life Path Number is {result.lifePathNumber}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            This comes from reducing every digit of your full date of birth to a single digit (or a Master Number — 11, 22, 33 — shown unreduced). It's read as your core life direction, independent of your name.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function NameNumerologyPage() {
  const { currentUser } = useAppContext();
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Name Numerology" title="Numbers Derived From Your Name" description="Destiny, Soul Urge, and Personality numbers — all derived from the letters in your full name using the Pythagorean letter-value system.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Calculate My Name Numbers'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.soulUrgeNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Personality</span><span className={styles.compatVal}>{result.personalityNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Destiny sums every letter in your name; Soul Urge sums only the vowels (your inner motivation); Personality sums only the consonants (how others perceive you). Your date of birth isn't used for any of these three.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function NumerologyMatchPage() {
  const [p1, setP1] = useState({ name: '', dob: '' });
  const [p2, setP2] = useState({ name: '', dob: '' });
  const [result, setResult] = useState<NumerologyMatchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = p1.name.trim() && p1.dob && p2.name.trim() && p2.dob && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerologyMatch({ name: p1.name.trim(), date: p1.dob }, { name: p2.name.trim(), date: p2.dob }));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const affinityLabel: Record<string, string> = { same: 'Same number — strong resonance', grouped: 'Same numerology group — good affinity', different: 'Different groups — more contrast' };

  return (
    <CalculatorPageShell eyebrow="Numerology Match" title="Numerology Compatibility" description="Compares both people's Life Path, Destiny, and Soul Urge numbers using a widely-used numerology grouping — a distinct compatibility read from Kundli Matching, based on names and dates of birth only.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 className={styles.partnerTitle}>Person 1</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="input-field input-cosmos" value={p1.name} onChange={e => setP1({ ...p1, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <AncientDatePicker className="input-field input-cosmos" value={p1.dob} onChange={val => setP1({ ...p1, dob: val })} placeholder="Select Date" />
            </div>
          </div>
          <div>
            <h4 className={styles.partnerTitle}>Person 2</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="input-field input-cosmos" value={p2.name} onChange={e => setP2({ ...p2, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <AncientDatePicker className="input-field input-cosmos" value={p2.dob} onChange={val => setP2({ ...p2, dob: val })} placeholder="Select Date" />
            </div>
          </div>
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', margin: '16px 0 0' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={!canSubmit}>
          {loading ? 'Calculating...' : 'Check Compatibility'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>Compatibility Score: {result.compatibilityScore} / 9</h3>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Life Path</span><span className={styles.compatVal}>{result.person1.lifePathNumber} · {result.person2.lifePathNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.person1.destinyNumber} · {result.person2.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.person1.soulUrgeNumber} · {result.person2.soulUrgeNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Life Path: {affinityLabel[result.lifePathAffinity]}. Destiny: {affinityLabel[result.destinyAffinity]}. Soul Urge: {affinityLabel[result.soulUrgeAffinity]}.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            This groups numbers 1/5/7, 2/4/8, and 3/6/9 by shared temperament — a common but simplified numerology convention, not a precise or universally-agreed system. Use it alongside Kundli Matching, not instead of it.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

function FlamesPage() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [result, setResult] = useState<FlamesOutcome | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name1.trim() && name2.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.flames(name1.trim(), name2.trim()));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="FLAMES" title="FLAMES Calculator" description="The classic letter-counting name game — Friends, Love, Affection, Marriage, Enemies, or Siblings. A fun word game, not an astrological reading.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">Your Name</label>
          <input type="text" className="input-field input-cosmos" value={name1} onChange={e => setName1(e.target.value)} placeholder="Your name" />
        </div>
        <div className="form-group">
          <label className="form-label">Their Name</label>
          <input type="text" className="input-field input-cosmos" value={name2} onChange={e => setName2(e.target.value)} placeholder="Their name" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', margin: '16px 0 0' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={!canSubmit}>
          {loading ? 'Calculating...' : 'Play FLAMES'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{result.result}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', textAlign: 'center' }}>
            {name1.trim()} + {name2.trim()} → {result.remainingCount} letter{result.remainingCount === 1 ? '' : 's'} left after crossing out shared letters, landing on "{result.letter}".
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

// 3. Astrologer Profile Page
function AstrologerProfilePage({ id }: { id: any }) {
  const { setPage, isLoggedIn, setShowLoginModal, setPendingAction } = useAppContext();
  const { astrologer, loading, notFound } = useAstrologer(id);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [favBusy, setFavBusy] = useState(false);

  useEffect(() => {
    if (!astrologer) return;
    astrologerService.listReviews(astrologer.id).then(setReviews).catch(() => {});
    if (isLoggedIn) astrologerService.isFavorite(astrologer.id).then(r => setIsFav(r.favorited)).catch(() => {});
  }, [astrologer?.id, isLoggedIn]);

  const toggleFavorite = async () => {
    if (!astrologer) return;
    if (!isLoggedIn) { setPendingAction('astrologers'); setShowLoginModal(true); return; }
    setFavBusy(true);
    try {
      if (isFav) await astrologerService.removeFavorite(astrologer.id);
      else await astrologerService.addFavorite(astrologer.id);
      setIsFav(!isFav);
    } catch {
      // best-effort — leave state unchanged on failure
    } finally {
      setFavBusy(false);
    }
  };

  if (loading) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>;
  if (notFound || !astrologer) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Astrologer not found.</div>;

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.profileGrid}>
          {/* Sidebar */}
          <div className={styles.profileSidebar}>
            <div className={styles.profileAvatar}>
              {astrologer.avatar ? (
                <img src={astrologer.avatar} alt={astrologer.name} className={styles.profileAvatarImg} />
              ) : (
                astrologer.name.charAt(0)
              )}
            </div>
            <h1 className={styles.sidebarName}>{astrologer.name}</h1>
            <p className={styles.sidebarTitle}>{astrologer.title}</p>

            <div className={styles.profileRating}>
              <span className={styles.starRating}>★ {astrologer.rating}</span>
              <span className={styles.reviewCount}>({astrologer.reviews.toLocaleString()} reviews)</span>
            </div>

            <div className={styles.sidebarStats}>
              <div className={styles.sidebarStatBox}>
                <span className={styles.statVal}>{astrologer.experience} yrs</span>
                <span className={styles.statLbl}>Experience</span>
              </div>
              <div className={styles.sidebarStatBox}>
                <span className={styles.statVal}>{astrologer.consultations.toLocaleString()}</span>
                <span className={styles.statLbl}>Consultations</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span className={styles.statLbl} style={{ display: 'block', marginBottom: '8px' }}>Languages</span>
              <div className={styles.rashiSpecs} style={{ gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {astrologer.languages.map(l => (
                  <span key={l} className="badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(184,138,59,0.2)' }}>{l}</span>
                ))}
              </div>
            </div>

            <div style={{ color: 'var(--color-gold)', fontSize: '1.25rem', fontWeight: 500, marginBottom: '20px' }}>
              ₹{astrologer.price} / min
            </div>

            <button className="btn btn-gold" style={{ width: '100%' }} onClick={() => setPage('consultation-booking')}>
              Book Consultation
            </button>
            <button
              className="btn btn-outline-gold"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={favBusy}
              onClick={toggleFavorite}
            >
              {isFav ? '♥ Saved' : '♡ Save Astrologer'}
            </button>
          </div>

          {/* Content Card */}
          <div className={styles.profileContentCard}>
            <div className={styles.contentSection}>
              <h3 className={styles.contentSectionTitle}>About Astrologist</h3>
              <p className={styles.contentText}>{astrologer.about} Specialized in deep Vedic techniques including transit analysis, Ashtakavarga matrices, and divisional chart readings. Renders direct predictions and practical remedies to help navigate career transitions, marriages, and financial timings.</p>
            </div>

            <div className={styles.contentSection}>
              <h3 className={styles.contentSectionTitle}>Approach to Jyotish</h3>
              <p className={styles.contentText}>Jyotish is not about fixed fatalistic predictions. It is the science of light, illuminating the coordinates of your path so that you can exercise your karma with alignment and clarity. Every consultation details the active Dashas and suggests constructive remedies such as mantras, pujas, and yantras to mitigate challenges.</p>
            </div>

            <div className={styles.contentSection}>
              <h3 className={styles.contentSectionTitle}>Lineage &amp; Training</h3>
              <p className={styles.contentText}>Initiated into classical Vedic astrology under venerable gurus in Varanasi, following the Parashari system. Holds traditional shastri certifications with extensive research in Nakshatra-based predictive astrology.</p>
            </div>

            <div className={styles.contentSection}>
              <h3 className={styles.contentSectionTitle}>Client Reviews</h3>
              {reviews.length === 0 ? (
                <p className={styles.contentText} style={{ opacity: 0.7 }}>No reviews yet — be the first to consult and share your experience.</p>
              ) : (
                <div className={styles.reviewList}>
                  {reviews.map(r => (
                    <div key={r.id} className={styles.reviewItem}>
                      <div className={styles.reviewHeader}>
                        <span className={styles.reviewUser}>{r.authorName}</span>
                        <span className={styles.starRating}>★ {r.rating}</span>
                      </div>
                      {r.text && <p className={styles.reviewText}>"{r.text}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Consultation Booking Page
function ConsultationBookingPage({ id }: { id: any }) {
  const { setPage, currentUser, setShowLoginModal, setPendingAction } = useAppContext();
  const { publicStates, requestConsultation } = useRealtime();
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [activeType, setActiveType] = useState<'chat' | 'voice' | 'video'>('chat');
  const [activeSlot, setActiveSlot] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { astrologer, loading: astrologerLoading, notFound } = useAstrologer(id);

  if (astrologerLoading) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>;
  if (notFound || !astrologer) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Astrologer not found.</div>;

  const live = publicStates[astrologer.id];
  const liveLabel = !live ? null : live.status === 'ONLINE_AVAILABLE' ? '🟢 Available now' : live.status === 'ONLINE_BUSY' ? '🟡 Currently busy' : live.status === 'AWAY' ? '⚪ Away' : '⚪ Offline';

  const OPTIONS = [
    { type: 'chat', label: 'Live Chat', price: astrologer.price * 20, desc: '20-min session text consultation' },
    { type: 'voice', label: 'Voice Call', price: astrologer.price * 25, desc: '25-min live voice guidance call' },
    { type: 'video', label: 'Video Call', price: astrologer.price * 30, desc: '30-min premium video chart reading' },
  ];

  const SLOTS = [
    'Today - 04:30 PM',
    'Today - 06:00 PM',
    'Today - 07:30 PM',
    'Tomorrow - 10:00 AM',
    'Tomorrow - 11:30 AM',
    'Tomorrow - 03:00 PM',
  ];

  const selectedOpt = OPTIONS.find(o => o.type === activeType)!;

  const handleConfirm = () => {
    alert(`Consultation booked successfully with ${astrologer.name} for ${SLOTS[activeSlot]}.`);
    setPage('my-consultations');
  };

  const handleStartNow = async () => {
    if (!currentUser) {
      setPendingAction('astrologers');
      setShowLoginModal(true);
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const category = astrologer.category[0] || astrologer.specialization[0];
      const result = await requestConsultation(astrologer.id, category, activeType);
      if (result.outcome === 'UNAVAILABLE') {
        setError(result.reason);
      } else {
        setPage('consultation-waiting');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Secure Consultation Scheduler</span>
          <h1 className={styles.pageTitle}>Choose Your Guidance</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle}>
            {astrologer.name}{liveLabel ? ` · ${liveLabel}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
          <button className={mode === 'now' ? 'btn btn-gold btn-sm' : 'btn btn-outline-light btn-sm'} onClick={() => setMode('now')}>Consult Now</button>
          <button className={mode === 'schedule' ? 'btn btn-gold btn-sm' : 'btn btn-outline-light btn-sm'} onClick={() => setMode('schedule')}>Schedule for Later</button>
        </div>

        {mode === 'now' ? (
          <div className={styles.bookingLayout}>
            <div className={styles.bookingOptionsCard}>
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle} style={{ border: 'none' }}>Select Consultation Format</h3>
                <div className={styles.optionSelectGrid}>
                  {OPTIONS.map(opt => (
                    <div
                      key={opt.type}
                      className={`${styles.optionSelector} ${activeType === opt.type ? styles.optionSelectorActive : ''}`}
                      onClick={() => setActiveType(opt.type as any)}
                    >
                      <span className={styles.optionName}>{opt.label}</span>
                      <span className={styles.optionPrice}>₹{astrologer.price}/min</span>
                    </div>
                  ))}
                </div>
                <p className={styles.reviewCount} style={{ marginTop: '16px' }}>
                  This connects you to the astrologer's real-time queue — if they're busy, you'll see your position and estimated wait instead of a fixed appointment slot.
                </p>
              </div>
            </div>

            <div className={styles.profileSidebar} style={{ textAlign: 'left' }}>
              <h3 className={styles.sidebarName} style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span>Astrologist</span>
                <span style={{ color: 'var(--color-text-light)' }}>{astrologer.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                <span>Format</span>
                <span style={{ color: 'var(--color-text-light)' }}>{selectedOpt.label}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(184,138,59,0.15)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-gold)' }}>
                <span>Rate</span>
                <span>₹{astrologer.price}/min</span>
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: '12px', marginTop: '12px' }}>{error}</p>}
              <button className="btn btn-gold" style={{ width: '100%', marginTop: '20px' }} disabled={starting} onClick={handleStartNow}>
                {starting ? 'Connecting…' : 'Start Consultation Now'}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.bookingLayout}>
            <div className={styles.bookingOptionsCard}>
              <div className={styles.contentSection}>
                <h3 className={styles.contentSectionTitle} style={{ border: 'none' }}>1. Select Consultation Format</h3>
                <div className={styles.optionSelectGrid}>
                  {OPTIONS.map(opt => (
                    <div
                      key={opt.type}
                      className={`${styles.optionSelector} ${activeType === opt.type ? styles.optionSelectorActive : ''}`}
                      onClick={() => setActiveType(opt.type as any)}
                    >
                      <span className={styles.optionName}>{opt.label}</span>
                      <span className={styles.optionPrice}>₹{opt.price}</span>
                      <p className={styles.reviewCount} style={{ marginTop: '6px', fontSize: '9px', lineHeight: 1.2 }}>{opt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.slotsSection}>
                <h3 className={styles.contentSectionTitle} style={{ border: 'none' }}>2. Available Time Slots</h3>
                <div className={styles.slotsGrid}>
                  {SLOTS.map((s, idx) => (
                    <button
                      key={s}
                      className={`${styles.slotBtn} ${activeSlot === idx ? styles.slotBtnActive : ''}`}
                      onClick={() => setActiveSlot(idx)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing Summary Sidebar */}
            <div className={styles.profileSidebar} style={{ textAlign: 'left' }}>
              <h3 className={styles.sidebarName} style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Summary</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span>Astrologist</span>
                <span style={{ color: 'var(--color-text-light)' }}>{astrologer.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span>Format</span>
                <span style={{ color: 'var(--color-text-light)' }}>{selectedOpt.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
                <span>Time Slot</span>
                <span style={{ color: 'var(--color-text-light)' }}>{SLOTS[activeSlot]}</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(184,138,59,0.15)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-gold)' }}>
                <span>Total Fees</span>
                <span>₹{selectedOpt.price}</span>
              </div>

              <button className="btn btn-gold" style={{ width: '100%', marginTop: '20px' }} onClick={handleConfirm}>
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 4b. Consultation Waiting / Queue Page — reflects the realtime backend's
// authoritative queue position and assignment state. Nothing here is
// computed client-side; it only renders what server/store.ts has decided.
function ConsultationWaitingPage() {
  const { setPage, setSelectedId } = useAppContext();
  const { userSync, recommendations, queueExpired, clearQueueExpired, cancelMyQueueEntry } = useRealtime();
  const [justReviewed, setJustReviewed] = useState(false);

  const astrologerId = userSync?.queueEntry?.astrologerId ?? userSync?.consultation?.astrologerId;
  const { astrologer } = useAstrologer(astrologerId);

  const goToAstrologer = (targetId: number) => {
    clearQueueExpired();
    setSelectedId(targetId);
    setPage('consultation-booking');
  };

  if (!userSync || (!userSync.queueEntry && !userSync.consultation)) {
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container} style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>No active consultation request</h2>
          <button className="btn btn-gold" style={{ marginTop: '20px' }} onClick={() => setPage('astrologers')}>Browse Astrologers</button>
        </div>
      </div>
    );
  }

  const recsBlock = recommendations && recommendations.length > 0 && (
    <div style={{ marginTop: '32px' }}>
      <h3 className={styles.contentSectionTitle} style={{ border: 'none', textAlign: 'center' }}>Don't want to wait? Similar astrologers available now</h3>
      <div className={styles.optionSelectGrid} style={{ marginTop: '16px' }}>
        {recommendations.map(rec => (
          <div key={rec.id} className={styles.optionSelector} onClick={() => goToAstrologer(rec.id)} style={{ cursor: 'pointer' }}>
            <span className={styles.optionName}>{rec.name}</span>
            <p className={styles.reviewCount} style={{ margin: '4px 0' }}>{rec.category.join(', ')}</p>
            <span className={styles.optionPrice}>★ {rec.rating} · {rec.status === 'ONLINE_AVAILABLE' ? '🟢 Available now' : rec.status === 'ONLINE_BUSY' ? '🟡 Busy' : '⚪ Offline'} · ₹{rec.price}/min</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (queueExpired) {
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>This consultation is taking longer than expected</h1>
            <p className={styles.pageSubtitle}>Your wait for {astrologer?.name || 'this astrologer'} timed out. Choose another astrologer below, or check back later.</p>
          </div>
          {recsBlock}
        </div>
      </div>
    );
  }

  if (userSync.queueEntry) {
    const { position, eta } = userSync;
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <span className="section-eyebrow">Astrologer Currently Busy</span>
            <h1 className={styles.pageTitle}>{astrologer?.name || 'Your astrologer'} is consulting another client</h1>
            <p className={styles.pageSubtitle}>We'll notify you the instant they're ready — no need to refresh this page.</p>
          </div>
          <div className={styles.bookingOptionsCard} style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>
              {position === 1 ? "You're next" : `You're #${position}`}
            </div>
            {eta && <p className={styles.reviewCount} style={{ marginTop: '8px' }}>Estimated wait: {eta.minMinutes}-{eta.maxMinutes} min</p>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
              <button className="btn btn-outline-light" onClick={() => cancelMyQueueEntry().then(() => setPage('astrologers'))}>Leave Queue</button>
            </div>
          </div>
          {recsBlock}
        </div>
      </div>
    );
  }

  const consultation = userSync.consultation!;
  if (consultation.status === 'ASSIGNED') {
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container} style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>Connecting you to {astrologer?.name}…</h2>
          <p className={styles.reviewCount} style={{ marginTop: '8px' }}>Waiting for them to accept your request.</p>
        </div>
      </div>
    );
  }
  if (consultation.status === 'ACTIVE' || consultation.status === 'ACCEPTED') {
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container} style={{ maxWidth: '600px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2>Your consultation with {astrologer?.name} is now active</h2>
            <p className={styles.reviewCount} style={{ marginTop: '8px' }}>{consultation.category} · {consultation.type}</p>
          </div>
          <ChatWindow consultationId={consultation.id} otherPartyName={astrologer?.name || 'your astrologer'} />
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button className="btn btn-outline-light" onClick={() => setPage('home')}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }
  if (consultation.status === 'COMPLETED') {
    // ponytail: `justReviewed` is local-only, so navigating away and back to
    // this same completed consultation re-shows the form; submitting again
    // just surfaces the backend's ALREADY_REVIEWED error. Fine for now — a
    // real fix needs `reviewed` on the realtime Consultation type itself.
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container} style={{ maxWidth: '480px', textAlign: 'center', padding: '60px 20px' }}>
          <h2>Your consultation with {astrologer?.name || 'your astrologer'} has ended</h2>
          <p className={styles.reviewCount} style={{ marginTop: '8px' }}>{consultation.category} · {consultation.type}</p>
          {justReviewed ? (
            <p className={styles.reviewCount} style={{ marginTop: '16px', color: 'var(--color-gold)' }}>✦ Thanks for your feedback!</p>
          ) : (
            <ReviewFormInline consultation={consultation} onDone={() => setJustReviewed(true)} />
          )}
          <button className="btn btn-outline-light" style={{ marginTop: '20px' }} onClick={() => setPage('home')}>Back to Home</button>
        </div>
      </div>
    );
  }
  if (consultation.status === 'DECLINED') {
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Your request was declined</h1>
            <p className={styles.pageSubtitle}>{astrologer?.name} wasn't able to take this consultation. Try another astrologer below.</p>
          </div>
          {recsBlock}
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container} style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2>Consultation {consultation.status.toLowerCase()}</h2>
        <button className="btn btn-gold" style={{ marginTop: '20px' }} onClick={() => setPage('astrologers')}>Browse Astrologers</button>
      </div>
    </div>
  );
}

// 5. Report Detail Page
function ReportDetailPage({ id }: { id: any }) {
  const { setPage, isLoggedIn, setShowLoginModal } = useAppContext();
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [buying, setBuying] = useState<ReportBundle | null>(null);
  const [buyError, setBuyError] = useState('');

  useEffect(() => {
    contentService.getReport(Number(id)).then(setReport).catch(() => setReport(null));
  }, [id]);

  if (!report) {
    return (
      <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
        <div className={styles.container} style={{ textAlign: 'center' }}>Loading report...</div>
      </div>
    );
  }

  const BUNDLES: { key: ReportBundle; title: string; price: number; desc: string }[] = [
    { key: 'report-only', title: 'Digital Manuscript Only', price: report.price, desc: 'Vedic report delivered as dynamic dashboard + PDF' },
    { key: 'report-qa', title: 'Manuscript + 2 Astrologist Qs', price: report.price + 300, desc: 'Add 2 direct questions to our Acharyas' },
    { key: 'report-consult', title: 'Manuscript + 15-min Consult', price: report.price + 900, desc: 'Includes direct video consultation regarding transits' },
  ];

  const handleBuy = async (bundle: typeof BUNDLES[0]) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setBuying(bundle.key);
    setBuyError('');
    try {
      await contentService.purchaseReport(report.id, bundle.key);
      setPage('my-reports');
    } catch (err) {
      setBuyError(err instanceof ContentApiError ? err.message : 'Could not complete your purchase. Please try again.');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.reportDetailLayout}>
          {/* Cover Display */}
          <div className={styles.bookDisplayColumn}>
            <div className={styles.manuscriptViewer}>
              <div className={styles.manuscriptSpine} />
              <div className={styles.manuscriptBorder} />
              <h2 className={styles.manuscriptTitle}>{report.title}</h2>
              <img src="/logo.png" alt="" className={styles.manuscriptLogoImg} />
              <div className={styles.manuscriptBottom}>
                <span className={styles.manuscriptLogo}>✦</span>
                <div className={styles.manuscriptSeal}>TREDEVASTRO GRANTH</div>
              </div>
            </div>
            <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', marginTop: '24px' }}>
              ✦ Traditional Book Preview (Open Manuscript View) ✦
            </p>
          </div>

          {/* Details & Pricing */}
          <div className={styles.horoscopeDetailsCard} style={{ background: '#fff', borderColor: 'rgba(154,107,47,0.15)' }}>
            <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)', fontSize: '2.5rem', marginBottom: '8px' }}>
              {report.title}
            </h1>
            <p className={styles.reviewText} style={{ color: 'var(--color-gold-dark)', fontWeight: 500, margin: '0 0 16px 0' }}>
              {report.subtitle}
            </p>
            <p className={styles.contentText} style={{ color: 'var(--color-text-dark-2)', marginBottom: '24px' }}>
              {report.description} Responsibly computed based on classical Sanskrit texts, this comprehensive analysis examines all divisional charts (Shodashvarga), planetary Dashas, Sade Sati phases, and Gochara transits.
            </p>

            <h3 className={styles.contentSectionTitle} style={{ color: 'var(--color-text-dark)', borderColor: 'rgba(36,27,22,0.1)' }}>
              Select Configuration
            </h3>

            <div className={styles.reviewList}>
              {BUNDLES.map(b => (
                <div
                  key={b.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid rgba(154,107,47,0.15)',
                    padding: '16px',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-dark)' }}>{b.title}</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--color-text-dark-2)' }}>{b.desc}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-gold-dark)', marginBottom: '8px' }}>₹{b.price}</div>
                    <button className="btn btn-gold btn-sm" disabled={!!buying} onClick={() => handleBuy(b)}>
                      {buying === b.key ? 'Processing...' : 'Select'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {buyError && <p style={{ color: '#d64545', fontSize: '13px', marginTop: '8px' }}>{buyError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Product Detail Page
function ProductDetailPage({ id }: { id: any }) {
  const { addToCart, setPage, t } = useAppContext();
  const product = PRODUCTS.find(p => p.id === Number(id)) || PRODUCTS[0];

  const handleAdd = () => {
    window.location.href = 'https://tredevastore.com/';
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.maroonPage}`}>
      <div className={styles.container}>
        <div className={styles.reportDetailLayout}>
          {/* Visual Column */}
          <div className={styles.bookDisplayColumn}>
            <div className={styles.rashiWheelWrap} style={{ borderColor: 'var(--color-border-dark)', background: 'rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '5rem' }}>{product.category === 'Gemstones' ? '💎' : '⊞'}</span>
            </div>
            <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', marginTop: '12px' }}>
              ✦ Animated 3D Depth &amp; Gemstone Rotation Viewer ✦
            </p>
          </div>

          {/* Product Details */}
          <div className={styles.horoscopeDetailsCard}>
            <span className={styles.tag} style={{ background: 'rgba(184,138,59,0.1)', color: 'var(--color-gold)', border: '1px solid rgba(184,138,59,0.2)' }}>
              {product.category}
            </span>
            <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-light)', fontSize: '2.5rem', margin: '12px 0 6px 0' }}>
              {product.name}
            </h1>
            <p className={styles.reviewText} style={{ color: 'var(--color-gold)', fontWeight: 500, margin: '0 0 16px 0' }}>
              {product.association}
            </p>
            <p className={styles.contentText} style={{ color: 'var(--color-text-dark-2)', marginBottom: '24px' }}>
              Traditional association: {product.benefit}. Resourced responsibly, all remedies are purified, verified for dimensional coordinates, and energized through authentic Vedic pran-pratishtha pujas at specific chart-matching muhurtas.
            </p>

            <div style={{ borderTop: '1px solid var(--color-border-dark)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                <span>Planet Alignment</span>
                <span style={{ color: 'var(--color-text-light)' }}>{product.planet}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <span>Responsibly Sourced</span>
                <span style={{ color: 'var(--color-text-light)' }}>Certified Authentic</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 500, color: 'var(--color-gold)' }}>
                ₹{product.price}
              </div>
              <button className="btn btn-gold" onClick={handleAdd}>
                {t('btn_add_to_cart') || 'Buy Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 7. Shopping Cart Page
function CartPage() {
  const { cart, removeFromCart, clearCart, setPage } = useAppContext();

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
        <div className={styles.container} style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>Your Cart is Empty</h2>
          <p style={{ margin: '12px 0 24px 0' }}>Explore Jyotish Upay or Reports to add planetary remedies.</p>
          <button className="btn btn-gold" onClick={() => setPage('store')}>Shop Upays</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Shopping Cart</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Remedy Basket</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.cartLayout}>
          <div className={styles.cartList}>
            {cart.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.cartItemInfo}>
                  <h3 className={styles.cartItemName}>{item.name}</h3>
                  <span className={styles.cartItemCat}>{item.category}</span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--color-text-dark)', padding: '0 20px' }}>
                  ₹{item.price}
                </div>
                <button className={styles.qtyBtn} style={{ color: '#c93b2b', borderColor: 'rgba(201, 59, 43, 0.2)' }} onClick={() => removeFromCart(item.id)}>
                  ✕
                </button>
              </div>
            ))}
            <button className="btn btn-outline" style={{ width: 'fit-content', marginTop: '12px' }} onClick={clearCart}>
              Clear All Items
            </button>
          </div>

          {/* Pricing summary */}
          <div className={styles.cartSumCard}>
            <h3 className={styles.partnerTitle} style={{ border: 'none', margin: '0 0 16px 0' }}>Order Summary</h3>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>₹{total}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Energizing Pujas</span>
              <span style={{ color: '#50C878' }}>Free</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Shipping</span>
              <span style={{ color: '#50C878' }}>Free</span>
            </div>
            <div className={styles.totalRow}>
              <span>Total Fees</span>
              <span>₹{total}</span>
            </div>

            <button className="btn btn-gold" style={{ width: '100%', marginTop: '20px' }} onClick={() => setPage('checkout')}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 8. Checkout Page
function CheckoutPage() {
  const { clearCart, setPage, cart } = useAppContext();
  const [formData, setFormData] = useState({ name: 'Arjun Sharma', email: 'arjun@gmail.com', address: '12, Sanskrit Marg', city: 'Delhi', zip: '110001' });

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Order placed successfully. Puja energization will begin during the upcoming Muhurta.');
    clearCart();
    setPage('my-orders');
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Payment Integration</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Secure Checkout</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <form onSubmit={handlePlaceOrder} className={styles.cartLayout}>
          {/* Billing Form */}
          <div className={styles.partnerFormCard}>
            <h3 className={styles.partnerTitle}>✦ Billing &amp; Address</h3>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="input-field input-cosmos"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="input-field input-cosmos"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Address</label>
              <input
                type="text"
                className="input-field input-cosmos"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Postal Zip</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={formData.zip}
                  onChange={e => setFormData({ ...formData, zip: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Payment summary */}
          <div className={styles.cartSumCard}>
            <h3 className={styles.partnerTitle} style={{ border: 'none', margin: '0 0 16px 0' }}>Payment Mode</h3>
            <div style={{ border: '1px solid var(--color-gold)', padding: '12px', background: 'rgba(184,138,59,0.02)', borderRadius: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gold-dark)' }}>🔒 Secured by UPI / Card Gateway</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--color-text-dark-2)' }}>Pujas are scheduled dynamically under auspicious nakshatras.</p>
            </div>
            <div className={styles.totalRow} style={{ borderTop: 'none', marginTop: 0, paddingTop: 0, marginBottom: '20px' }}>
              <span>Total Fees</span>
              <span>₹{total}</span>
            </div>
            <button type="submit" className="btn btn-gold" style={{ width: '100%' }}>
              Place Sacred Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 9. Course Detail Page
function CourseDetailPage({ id }: { id: any }) {
  const { setPage } = useAppContext();
  const course = COURSES.find(c => c.id === Number(id)) || COURSES[0];

  const handleEnroll = () => {
    alert(`Enrolled successfully in ${course.title}. Start learning path now.`);
    setPage('course-learning');
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.reportDetailLayout}>
          {/* Cover */}
          <div className={styles.bookDisplayColumn}>
            <div className={styles.manuscriptViewer} style={{ background: '#e9e1d5', borderColor: '#9a6b2f' }}>
              <div className={styles.manuscriptBorder} style={{ borderColor: 'rgba(36,27,22,0.15)' }} />
              <span style={{ fontSize: '3rem', textAlign: 'center', display: 'block', marginTop: '16px' }}>{course.icon}</span>
              <h2 className={styles.manuscriptTitle} style={{ color: 'var(--color-text-dark)', fontSize: '1.5rem' }}>{course.title}</h2>
              <img src="/logo.png" alt="" className={styles.manuscriptLogoImg} />
              <div className={styles.manuscriptBottom}>
                <div className={styles.manuscriptSeal} style={{ color: 'var(--color-text-dark)' }}>VED GURUKUL</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className={styles.horoscopeDetailsCard} style={{ background: '#fff', borderColor: 'rgba(154,107,47,0.15)' }}>
            <span className={styles.tag} style={{ background: 'rgba(184,138,59,0.1)', color: 'var(--color-gold-dark)', border: '1px solid rgba(184,138,59,0.2)' }}>
              {course.category}
            </span>
            <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)', fontSize: '2.5rem', margin: '12px 0 6px 0' }}>
              {course.title}
            </h1>
            <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', margin: '0 0 16px 0' }}>
              {course.subtitle}
            </p>

            <h3 className={styles.contentSectionTitle} style={{ color: 'var(--color-text-dark)', borderColor: 'rgba(36,27,22,0.1)' }}>
              Gurukul Curriculum
            </h3>
            <div className={styles.reviewList} style={{ marginBottom: '24px' }}>
              {course.topics.map((t, idx) => (
                <div key={t} style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-text-dark-2)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--color-gold-dark)', fontWeight: 600 }}>Module 0{idx + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 500, color: 'var(--color-gold-dark)' }}>₹{course.price}</div>
                {course.originalPrice && <div style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--color-text-dark-2)' }}>₹{course.originalPrice}</div>}
              </div>
              <button className="btn btn-gold" onClick={handleEnroll}>
                Enroll Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 10. Course Learning Classroom
function CourseLearningPage({ id }: { id: any }) {
  const [activeLesson, setActiveLesson] = useState(0);
  const course = COURSES.find(c => c.id === Number(id)) || COURSES[0];

  const LESSONS = [
    { title: 'Introduction to Chart Houses (Bhavas)', duration: '12 min' },
    { title: 'Understanding Planetary Aspects (Drishti)', duration: '18 min' },
    { title: 'Vimshottari Dasha Calculation Fundamentals', duration: '22 min' },
    { title: 'Identifying Auspicious Muhurtas', duration: '15 min' },
  ];

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">{course.title}</span>
          <h1 className={styles.pageTitle}>Gurukul Virtual Classroom</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.learningLayout}>
          {/* Video Player */}
          <div>
            <div className={styles.videoSection}>
              <div className={styles.videoPlaceholder}>
                <span className={styles.videoPlayIcon}>▶</span>
                <h3>{LESSONS[activeLesson].title}</h3>
                <p className={styles.reviewCount}>Video lecture loading ... ({LESSONS[activeLesson].duration})</p>
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <h2 className={styles.sidebarName}>{LESSONS[activeLesson].title}</h2>
              <p className={styles.reviewText} style={{ marginTop: '8px' }}>Lineage lessons computed dynamically. Study the Divisional coordinates to understand lords aspects.</p>
            </div>
          </div>

          {/* Syllabus Sidebar */}
          <div className={styles.learningSidebar}>
            <h3 className={styles.sidebarName} style={{ borderBottom: '1px solid rgba(184,138,59,0.15)', paddingBottom: '8px' }}>Syllabus Steps</h3>
            <div className={styles.syllabusList}>
              {LESSONS.map((l, idx) => (
                <div
                  key={l.title}
                  className={`${styles.lessonItem} ${activeLesson === idx ? styles.lessonActive : ''}`}
                  onClick={() => setActiveLesson(idx)}
                >
                  <div>
                    <span style={{ display: 'block', fontSize: '9px', opacity: 0.6 }}>Lecture 0{idx + 1}</span>
                    <span>{l.title}</span>
                  </div>
                  <span style={{ fontSize: '10px' }}>{l.duration}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 11. Profile Page
function ProfilePage() {
  const { birthProfile, setBirthProfile, setPage } = useAppContext();
  const [formData, setFormData] = useState({ ...birthProfile });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setBirthProfile(formData);
    alert('Birth Profile updated successfully.');
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Yajamana Profile</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Account</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.timelineGrid}>
          {/* Quick links Sidebar */}
          <div>
            <div className={styles.profileSidebar} style={{ background: '#fff', borderColor: 'rgba(154,107,47,0.15)', padding: '20px' }}>
              <div className={styles.profileAvatar} style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                {birthProfile.name.charAt(0)}
              </div>
              <h3 className={styles.sidebarName} style={{ color: 'var(--color-text-dark)', fontSize: '1.2rem', marginTop: '10px' }}>{birthProfile.name}</h3>
              <p className={styles.reviewCount} style={{ margin: '0 0 20px 0' }}>Birth Profile Yajamana</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <button className={styles.toolItemLink} onClick={() => setPage('my-reports')}>My Granth Reports</button>
                <button className={styles.toolItemLink} onClick={() => setPage('my-consultations')}>My Consultations</button>
                <button className={styles.toolItemLink} onClick={() => setPage('my-orders')}>My Remedy Orders</button>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className={styles.partnerFormCard}>
            <h3 className={styles.partnerTitle}>✦ Edit Coordinates</h3>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <AncientDatePicker
                    className="input-field input-cosmos"
                    value={formData.dob}
                    onChange={val => setFormData({ ...formData, dob: val })}
                    placeholder="Select Date of Birth"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Exact Birth Time</label>
                  <input
                    type="time"
                    className="input-field input-cosmos"
                    value={formData.tob}
                    onChange={e => setFormData({ ...formData, tob: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Birth Place</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={formData.place}
                  onChange={e => setFormData({ ...formData, place: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-gold">
                Save Birth Coordinates
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

// 13. My Reports Page
const REPORT_BUNDLE_LABEL: Record<string, string> = {
  'report-only': 'Report Only',
  'report-qa': 'Report + Expert Q&A',
  'report-consult': 'Report + Consultation',
};

function MyReportsPage({ nested = false }: { nested?: boolean } = {}) {
  const { setPage, setSelectedId } = useAppContext();
  const [purchases, setPurchases] = useState<ReportPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    contentService.listMyReportPurchases()
      .then(setPurchases)
      .catch(err => setError(err instanceof ContentApiError ? err.message : 'Could not load your reports.'))
      .finally(() => setLoading(false));
  }, []);

  const Wrapper = nested ? React.Fragment : 'div';
  const wrapperProps = nested ? {} : { className: `${styles.pageWrapper} ${styles.ivoryPage}` };

  return (
    <Wrapper {...wrapperProps}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your purchased reports</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Reports</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
        {error && <p style={{ color: '#d64545', textAlign: 'center' }}>{error}</p>}
        {!loading && !error && purchases.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>You haven't purchased a report yet.</p>
        )}

        <div className={styles.cartList}>
          {purchases.map(p => (
            <div key={p.id} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <h3 className={styles.cartItemName}>{p.reportTitle}</h3>
                <span className={styles.cartItemCat}>
                  {REPORT_BUNDLE_LABEL[p.bundle] || p.bundle} · ₹{p.amount} · {new Date(p.purchasedAt).toLocaleDateString()}
                </span>
              </div>
              <button className="btn btn-gold btn-sm" onClick={() => { setSelectedId(p.reportId); setPage('report-detail'); }}>
                View Report
              </button>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

// 14. My Consultations Page
const CONSULTATION_STATUS_LABEL: Record<MyConsultation['status'], string> = {
  ASSIGNED: 'Awaiting Astrologer', ACCEPTED: 'Accepted', ACTIVE: 'In Progress',
  COMPLETED: 'Completed', DECLINED: 'Declined', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
};

function ReviewFormInline({ consultation, onDone }: { consultation: { id: string; astrologerId: number }; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await astrologerService.submitReview(consultation.astrologerId, consultation.id, rating, text.trim());
      onDone();
    } catch (err) {
      setError(err instanceof AstrologerApiError ? err.message : 'Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '12px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} onClick={() => setRating(n)} style={{ cursor: 'pointer', fontSize: '1.3rem', color: n <= rating ? '#B58A3B' : 'rgba(0,0,0,0.15)' }}>★</span>
        ))}
      </div>
      <textarea
        className="input-field"
        style={{ width: '100%', minHeight: '70px', marginBottom: '8px' }}
        placeholder="How was your consultation? (optional)"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      {error && <p style={{ color: '#d64545', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
      <button className="btn btn-gold btn-sm" disabled={submitting} onClick={handleSubmit}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}

function MyConsultationsPage({ nested = false }: { nested?: boolean } = {}) {
  const { setPage } = useAppContext();
  const [consultations, setConsultations] = useState<MyConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    consultationService.listMine()
      .then(setConsultations)
      .catch(err => setError(err instanceof ConsultationApiError ? err.message : 'Could not load your consultations.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const Wrapper = nested ? React.Fragment : 'div';
  const wrapperProps = nested ? {} : { className: `${styles.pageWrapper} ${styles.ivoryPage}` };

  return (
    <Wrapper {...wrapperProps}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your bookings history</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Consultations</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
        {error && <p style={{ color: '#d64545', textAlign: 'center' }}>{error}</p>}
        {!loading && !error && consultations.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>You haven't booked a consultation yet.</p>
        )}

        <div className={styles.cartList}>
          {consultations.map(c => (
            <div key={c.id} className={styles.cartItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div className={styles.cartItemInfo}>
                  <h3 className={styles.cartItemName}>{c.astrologerName}</h3>
                  <span className={styles.cartItemCat}>{c.category} · {c.type} · {new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <span className="badge" style={{ background: c.status === 'COMPLETED' ? 'rgba(80,200,120,0.1)' : 'rgba(0,0,0,0.05)', color: c.status === 'COMPLETED' ? '#50C878' : 'var(--color-text-dark-2)', border: '1px solid' }}>
                  {CONSULTATION_STATUS_LABEL[c.status]}
                </span>
              </div>
              {(c.status === 'ACCEPTED' || c.status === 'ACTIVE') && (
                <button className="btn btn-gold btn-sm" style={{ alignSelf: 'flex-start', marginTop: '10px' }} onClick={() => setPage('consultation-waiting')}>
                  Open Chat
                </button>
              )}
              {c.status === 'COMPLETED' && !c.reviewed && reviewingId !== c.id && (
                <button className="btn btn-outline-gold btn-sm" style={{ alignSelf: 'flex-start', marginTop: '10px' }} onClick={() => setReviewingId(c.id)}>
                  Leave a Review
                </button>
              )}
              {c.status === 'COMPLETED' && c.reviewed && (
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>✦ You reviewed this consultation</span>
              )}
              {reviewingId === c.id && (
                <ReviewFormInline consultation={c} onDone={() => { setReviewingId(null); load(); }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

// 15. My Orders Page
function MyOrdersPage({ nested = false }: { nested?: boolean } = {}) {
  const ORDERS = [
    { orderId: 'TA-98384', items: 'Natural Colombian Emerald Gemstone', total: 2499, date: '12 August 2026', status: 'Puja Energization Scheduled' },
    { orderId: 'TA-83748', items: 'Shri Yantra (Brass)', total: 1299, date: '02 July 2026', status: 'Delivered' },
  ];

  const Wrapper = nested ? React.Fragment : 'div';
  const wrapperProps = nested ? {} : { className: `${styles.pageWrapper} ${styles.ivoryPage}` };

  return (
    <Wrapper {...wrapperProps}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your remedial orders</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Orders</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.cartList}>
          {ORDERS.map(o => (
            <div key={o.orderId} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <h3 className={styles.cartItemName}>Order #{o.orderId}</h3>
                <span className={styles.cartItemCat}>{o.items} · Ordered: {o.date}</span>
              </div>
              <div style={{ paddingRight: '20px', fontWeight: 600 }}>₹{o.total}</div>
              <span className="badge" style={{ background: o.status === 'Delivered' ? 'rgba(80,200,120,0.1)' : 'rgba(184,138,59,0.08)', color: o.status === 'Delivered' ? '#50C878' : 'var(--color-gold-dark)', border: '1px solid' }}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

// 16. Blog Detail Page
function BlogDetailPage({ id }: { id: any }) {
  const [post, setPost] = useState<BlogPost | null>(null);

  useEffect(() => {
    contentService.getBlogPost(Number(id)).then(setPost).catch(() => setPost(null));
  }, [id]);

  if (!post) {
    return (
      <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
        <div className={styles.container} style={{ textAlign: 'center' }}>Loading article...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader} style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto var(--space-8)' }}>
          <span className="section-eyebrow">{post.tag}</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)', fontSize: '2.75rem', lineHeight: 1.2 }}>{post.title}</h1>
          <div className={styles.blogFooter} style={{ marginTop: '12px' }}>
            <span>By Astrologist Writers · {post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 1.75, color: 'var(--color-text-dark)' }}>
          <div className={styles.blogCover} style={{ marginBottom: '32px' }}>
            ❂
          </div>
          <p><strong>{post.excerpt}</strong></p>
          {post.content.split('\n\n').map((para, i) => (
            <p key={i} style={{ marginTop: '16px' }}>{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// 17. About Page
function AboutPage() {
  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container} style={{ maxWidth: '800px' }}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Our Lineage</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>About TredevAstro</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 1.75, color: 'var(--color-text-dark)' }}>
          <p>TredevAstro was founded to bridge ancient Vedic wisdom with modern digital clarity. Rather than generating generic commercial predictions, our platform is built on classical Indian astronomical observations (Jyotish Shastra).</p>
          <p style={{ marginTop: '16px' }}>All calculations follow the Lahiri Ayanamsa, matching planetary alignments to the exact degrees of the stars. We partner with respected Acharyas initiated into authentic lineages to ensure all consultations and Pujas follow precise shastric codes.</p>
          <p style={{ marginTop: '16px' }}>Explore your birth blueprint, balance energies through energized remedies, and walk your path with alignment, purpose and dharma.</p>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Entry — single logical /dashboard route, resolved by backend-authenticated role
// ─────────────────────────────────────────────────────────────────────────────
function DashboardEntry() {
  const { currentUser } = useAppContext();
  if (currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') return <AdminDashboardPage />;
  if (currentUser?.role === 'ASTROLOGIST') return <AstrologistDashboard />;
  return <ProfileDashboardPage />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard — a fully separate internal console, see src/admin/AdminConsole.tsx
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboardPage() {
  return <AdminConsole />;
}

function SavedAstrologersPanel({ onView }: { onView: (id: number) => void }) {
  const [favorites, setFavorites] = useState<UiAstrologer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    astrologerService.listFavorites().then(setFavorites).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleRemove = async (astrologerId: number) => {
    await astrologerService.removeFavorite(astrologerId);
    setFavorites(prev => prev.filter(a => a.id !== astrologerId));
  };

  if (loading) return <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>;

  if (favorites.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
        <span style={{ fontSize: '3rem', opacity: 0.3 }}>♃</span>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>Saved Astrologers</h3>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>
          Tap "Save Astrologer" on any astrologer's profile to keep them here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      {favorites.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)' }}>
          {a.avatar ? <img src={a.avatar} alt={a.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} /> : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a.name.charAt(0)}</div>}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)' }}>{a.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>★ {a.rating} · {a.title}</div>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => onView(a.id)}>View</button>
          <button className="btn btn-outline-gold btn-sm" onClick={() => handleRemove(a.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
function ProfileDashboardPage() {
  const {
    birthProfile, setPage, setSelectedId, isLoggedIn, setShowLoginModal, setPendingAction, kundliGenerated,
    currentUser,
  } = useAppContext();
  const [activeTab, setActiveTab] = React.useState('my-jyotish');

  React.useEffect(() => {
    if (!isLoggedIn) {
      setPendingAction('profile');
      setShowLoginModal(true);
    }
  }, [isLoggedIn]);

  // Self-service "Become an Astrologer" was removed from here — assigning
  // the Astrologer role is now an admin/staff-only action (see UsersPage in
  // the admin console), not something a user requests for themselves.
  const SIDEBAR_ITEMS = [
    { key: 'my-jyotish', label: 'My Jyotish', icon: '✦' },
    { key: 'my-kundli', label: 'My Kundli', icon: '☉' },
    { key: 'my-reports', label: 'My Reports', icon: '☽' },
    { key: 'my-consultations', label: 'My Consultations', icon: '◎' },
    { key: 'my-orders', label: 'My Orders', icon: '◈' },
    { key: 'saved-astrologers', label: 'Saved Astrologers', icon: '♃' },
    { key: 'my-courses', label: 'My Courses', icon: '◉' },
    { key: 'settings', label: 'Account Settings', icon: '⚙' },
  ];

  const PLANETARY_PLACEMENTS = [
    { planet: 'Surya (Sun)', rashi: 'Vrischika', bhava: '4th Bhava', degrees: "22°14'", symbol: '☉' },
    { planet: 'Chandra (Moon)', rashi: 'Vrishabha', bhava: '10th Bhava', degrees: "08°32'", symbol: '☽' },
    { planet: 'Mangala (Mars)', rashi: 'Simha', bhava: '1st Bhava', degrees: "14°56'", symbol: '♂' },
    { planet: 'Budha (Mercury)', rashi: 'Tula', bhava: '3rd Bhava', degrees: "05°18'", symbol: '☿' },
    { planet: 'Guru (Jupiter)', rashi: 'Karka', bhava: '12th Bhava', degrees: "28°44'", symbol: '♃' },
    { planet: 'Shukra (Venus)', rashi: 'Dhanu', bhava: '5th Bhava', degrees: "11°22'", symbol: '♀' },
    { planet: 'Shani (Saturn)', rashi: 'Makara', bhava: '6th Bhava', degrees: "17°09'", symbol: '♄' },
    { planet: 'Rahu', rashi: 'Mithuna', bhava: '11th Bhava', degrees: "03°41'", symbol: '☊' },
    { planet: 'Ketu', rashi: 'Dhanu', bhava: '5th Bhava', degrees: "03°41'", symbol: '☋' },
  ];

  const KUNDLI_GRID = [
    { num: 12, sign: 'Pis', planets: 'Guru' },
    { num: 9, sign: 'Sag', planets: 'Ketu' },
    { num: 2, sign: 'Taurus', planets: 'Chandra' },
    { num: 11, sign: 'Aqu', planets: '' },
    { num: 'Lagna', sign: 'Leo', planets: 'Lagna' },
    { num: 3, sign: 'Gem', planets: '' },
    { num: 10, sign: 'Cap', planets: 'Shani' },
    { num: 4, sign: 'Can', planets: 'Surya' },
    { num: 5, sign: 'Leo', planets: 'Mangala' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 'calc(var(--nav-height) + var(--space-8))' }}>
      <div className={styles.profileLayout} style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        {/* Sidebar */}
        <aside className={styles.profileSidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>✦</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{birthProfile.name}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>Simha Lagna · Vrishabha Chandra</div>
          </div>
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`${styles.profileBtn} ${activeTab === item.key ? styles.profileBtnActive : ''}`}
            >
              <span style={{ fontSize: '0.85rem', width: '16px', textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main className={styles.profileMain}>
          {activeTab === 'my-jyotish' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <span className="section-eyebrow">Meri Kundli</span>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 300, color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>My Jyotish</h1>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Vedic birth chart for {birthProfile.name} · Born {birthProfile.dob}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                {[{ label: 'Janma Rashi', value: 'Vrishabha (Taurus)', icon: '☽' }, { label: 'Lagna (Ascendant)', value: 'Simha (Leo)', icon: '↑' }, { label: 'Nakshatra', value: 'Rohini (4th Pada)', icon: '✦' }].map(item => (
                  <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
                    <span style={{ fontSize: '1.5rem', color: 'var(--gold-primary)', display: 'block', marginBottom: 'var(--space-2)' }}>{item.icon}</span>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-8)' }}>
                <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)' }}>Graha Placements</h3>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Lahiri Ayanamsa</span>
                </div>
                {PLANETARY_PLACEMENTS.map((p, i) => (
                  <div key={p.planet} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1.4fr) minmax(0, 1.6fr) auto', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)', borderBottom: i < PLANETARY_PLACEMENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.1rem', color: 'var(--gold-primary)', textAlign: 'center' }}>{p.symbol}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{p.planet}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{p.rashi} · {p.bhava}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>{p.degrees}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>Vimshottari Dasha</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {[{ label: 'Current Mahadasha', value: 'Venus (Shukra)', period: '2018 – 2038', active: true }, { label: 'Current Antardasha', value: 'Mercury (Budha)', period: '2024 – 2027', active: true }, { label: 'Next Mahadasha', value: 'Sun (Surya)', period: '2038 – 2044', active: false }, { label: 'Pratyantardasha', value: 'Jupiter (Guru)', period: 'Dec 2024 – Mar 2025', active: false }].map(d => (
                    <div key={d.label} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: `1px solid ${d.active ? 'rgba(181,138,59,0.3)' : 'var(--border-subtle)'}`, background: d.active ? 'rgba(181,138,59,0.05)' : 'transparent' }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: d.active ? 'var(--gold-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{d.label}</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{d.value}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{d.period}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-kundli' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <span className="section-eyebrow">Your Birth Blueprint</span>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 300, color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>My Kundli Chart</h1>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                  Janam Kundli for {birthProfile.name} · Born {birthProfile.dob}
                </p>
              </div>

              {!kundliGenerated ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: '3rem', opacity: 0.3 }}>☉</span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>Your Kundli has not been created yet.</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>Generate your birth chart to unlock your Vedic blueprint.</p>
                  <button className="btn btn-gold" onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Generate My Kundli</button>
                </div>
              ) : (
                <div className={styles.chartPageGrid} style={{ gridTemplateColumns: '1fr' }}>
                  <div className={styles.ancientCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.chartVisualSection} style={{ width: '100%', maxWidth: '420px' }}>
                      <table className={styles.chartGridTable}>
                        <tbody>
                          <tr>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[0].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[0].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[0].planets}</span>
                            </td>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[1].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[1].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[1].planets}</span>
                            </td>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[2].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[2].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[2].planets}</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[3].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[3].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[3].planets}</span>
                            </td>
                            <td style={{ background: 'rgba(184, 138, 59, 0.05)' }}>
                              <span className={styles.houseSign} style={{ fontSize: '10px' }}>ASCENDANT</span>
                              <span className={styles.housePlanets} style={{ color: 'var(--color-gold-dark)' }}>Simha</span>
                            </td>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[5].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[5].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[5].planets}</span>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[6].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[6].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[6].planets}</span>
                            </td>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[7].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[7].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[7].planets}</span>
                            </td>
                            <td>
                              <span className={styles.houseNumber}>{KUNDLI_GRID[8].num}</span>
                              <span className={styles.houseSign}>{KUNDLI_GRID[8].sign}</span>
                              <span className={styles.housePlanets}>{KUNDLI_GRID[8].planets}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'my-reports' && <MyReportsPage nested />}
          {activeTab === 'my-consultations' && <MyConsultationsPage nested />}
          {activeTab === 'my-orders' && <MyOrdersPage nested />}
          {activeTab === 'settings' && <ProfilePage />}

          {activeTab === 'saved-astrologers' && (
            <SavedAstrologersPanel onView={id => { setSelectedId(id); setPage('astrologer-profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          )}

          {['my-courses'].includes(activeTab) && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: '3rem', opacity: 0.3 }}>{SIDEBAR_ITEMS.find(s => s.key === activeTab)?.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>{SIDEBAR_ITEMS.find(s => s.key === activeTab)?.label}</h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>This section is coming soon.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
