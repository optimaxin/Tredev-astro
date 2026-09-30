import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  PRODUCTS,
  COURSES,
} from '../data/mockData';
import { contentService, ContentApiError } from '../services/contentService';
import type { AstrologyReport, BlogPost, ReportBundle, ReportPurchase } from '../services/contentService';
import { NorthIndianChart, toChartPlanets, cap } from '../sections/KundliSection/KundliCharts';
import { useAstrologer } from '../hooks/useAstrologer';
import styles from './PageRenderer.module.css';

// Import landing sections
import Hero from '../sections/Hero/Hero';
import CampaignBanner from '../sections/CampaignBanner/CampaignBanner';
// Pages the homepage never shows are split into their own chunks so the
// first load doesn't have to download and parse them (KundliSection alone
// pulls in the whole PDF template + chart code).
const KundliSection = lazy(() => import('../sections/KundliSection/KundliSection'));
import SeekGuidance from '../sections/SeekGuidance/SeekGuidance';
import FreeTools from '../sections/FreeTools/FreeTools';
import PanchangSection from '../sections/Panchang/Panchang';
import HoroscopeSection from '../sections/Horoscope/Horoscope';
import AstrologersSection from '../sections/Astrologers/Astrologers';
import AIAstrology from '../sections/AIAstrology/AIAstrology';
import ReportsSection from '../sections/Reports/Reports';
import StoreSection from '../sections/Store/Store';
import PoojaSection from '../sections/Pooja/Pooja';
import AcademySection from '../sections/Academy/Academy';
import Testimonials from '../sections/Testimonials/Testimonials';
import WhyTredevAstro from '../sections/WhyTredevAstro/WhyTredevAstro';
import BlogSection from '../sections/Blog/Blog';
const AuthPage = lazy(() => import('./AuthPage/AuthPage'));
import BirthDetailsForm from '../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../components/BirthDetailsForm/BirthDetailsForm';
const AstrologistDashboard = lazy(() => import('./AstrologistDashboard/AstrologistDashboard'));
const GuidanceInfoPage = lazy(() => import('./GuidanceInfoPage/GuidanceInfoPage'));
const LegalPage = lazy(() => import('./LegalPage/LegalPage'));
const RaghavBookingPage = lazy(() => import('./RaghavBookingPage/RaghavBookingPage'));
const AdminConsole = lazy(() => import('../admin/AdminConsole'));
import { useRealtime } from '../realtime/RealtimeContext';
import { calculatorService, CalculatorApiError } from '../services/calculatorService';
import type { KundliFullResult } from '../services/calculatorService';
import { toSavedBirthDetails } from '../utils/birthDetails';
import {
  HoroscopePage, ChoghadiyaPage, MuhuratFinderPage, AbhijitMuhuratPage, KundliMatchingPage,
  NakshatraFinderPage, SadeSatiPage, LuckyPage, BabyNamePage, LalKitabPage,
  KaalSarpDoshaPage, PitraDoshaPage, RahuKetuTransitPage, MoonSignPage, AscendantPage, NumerologyPage,
  LifePathNumberPage, NameNumerologyPage, NumerologyMatchPage, FlamesPage, ChineseZodiacPage,
  NumerologyHoroscopePage, VastuCalculatorPage, ordinal,
} from './calculators/CalculatorPages';
import { astrologerService, AstrologerApiError } from '../services/astrologerService';
import type { EffectivePrice, Review, UiAstrologer } from '../services/astrologerService';
import { consultationService, ConsultationApiError } from '../services/consultationService';
import type { MyConsultation } from '../services/consultationService';
import ChatWindow from '../components/ChatWindow/ChatWindow';
import CallWindow from '../components/CallWindow/CallWindow';
import { orderService, OrderApiError } from '../services/orderService';
import type { Order } from '../services/orderService';
import { paymentService, PaymentApiError } from '../services/paymentService';

export default function PageRenderer() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-busy="true" />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const { page, setPage, selectedId, setSelectedId, cart, addToCart, removeFromCart, clearCart, birthProfile, currentUser } = useAppContext();

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
            <HoroscopeSection />
          </div>

          <div className="yantra-watermark-right">
            <AstrologersSection featured />
          </div>

          <AIAstrology />

          <div className="yantra-watermark-left">
            <StoreSection featured />
          </div>

          <div className="yantra-watermark-right">
            <AcademySection featured />
          </div>

          <div className="yantra-watermark-left">
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
            {/* serverPdfUrl (real Chromium print via backend/app/api/
                kundliPdf.routes.ts) is paused for now — the server launching
                Chromium per request was making the whole site heavy. Falls
                back to KundliSection's own client-side PDF generation until
                it's re-enabled — see docs/chromium-pdf-pause.md. */}
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
      return <NakshatraFinderPage currentUser={currentUser} />;


    case 'sade-sati':
      return <SadeSatiPage currentUser={currentUser} />;

    case 'kaal-sarp-dosha':
      return <KaalSarpDoshaPage currentUser={currentUser} />;

    case 'pitra-dosha':
      return <PitraDoshaPage currentUser={currentUser} />;

    case 'rahu-ketu-transit':
      return <RahuKetuTransitPage currentUser={currentUser} />;

    case 'moon-sign':
      return <MoonSignPage currentUser={currentUser} />;

    case 'ascendant':
      return <AscendantPage currentUser={currentUser} />;

    case 'numerology':
      return <NumerologyPage currentUser={currentUser} />;

    case 'life-path-number':
      return <LifePathNumberPage currentUser={currentUser} />;

    case 'name-numerology':
      return <NameNumerologyPage currentUser={currentUser} />;

    case 'numerology-match':
      return <NumerologyMatchPage />;

    case 'flames':
      return <FlamesPage />;

    case 'lucky':
      return <LuckyPage currentUser={currentUser} />;

    case 'baby-name':
      return <BabyNamePage currentUser={currentUser} />;

    case 'lal-kitab':
      return <LalKitabPage currentUser={currentUser} />;

    case 'chinese-zodiac':
      return <ChineseZodiacPage />;

    case 'vastu-calculator':
      return <VastuCalculatorPage currentUser={currentUser} />;

    case 'numerology-horoscope':
      return <NumerologyHoroscopePage currentUser={currentUser} />;

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

    case 'pooja':
      return <PoojaSection />;

    case 'guidance-info':
      return <GuidanceInfoPage id={selectedId} />;

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

    case 'terms':
      return <LegalPage docId="terms" />;

    case 'privacy':
      return <LegalPage docId="privacy" />;

    case 'safety':
      return <LegalPage docId="safety" />;

    case 'raghav-booking':
      return <RaghavBookingPage />;

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
              {astrologer.activeOfferPercent > 0 ? (
                <>
                  <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.75em', marginRight: 6 }}>₹{astrologer.price}</span>
                  ₹{Math.round(astrologer.price * (1 - astrologer.activeOfferPercent / 100))} / min
                  <span style={{ marginLeft: 8, fontSize: '0.6em', fontWeight: 700 }}>{astrologer.activeOfferPercent}% OFF</span>
                </>
              ) : (
                <>₹{astrologer.price} / min</>
              )}
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
  const { publicStates } = useRealtime();
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [activeType, setActiveType] = useState<'chat' | 'voice'>('chat');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [activeSlot, setActiveSlot] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { astrologer, loading: astrologerLoading, notFound } = useAstrologer(id);
  const [effectivePrice, setEffectivePrice] = useState<EffectivePrice | null>(null);
  // Was declared after the astrologerLoading/notFound early returns below,
  // so React called this hook on some renders and skipped it on others
  // (whenever loading flipped to loaded within the same mount) — a Rules of
  // Hooks violation that could crash this page. Hooks must run
  // unconditionally, every render.
  const [scheduleNotice, setScheduleNotice] = useState(false);

  // The real, offer/loyalty-adjusted price for this exact type — recomputed
  // whenever the user switches format, so what they see here always matches
  // what gets locked in the moment they actually start.
  useEffect(() => {
    if (!astrologer) return;
    let cancelled = false;
    setEffectivePrice(null);
    astrologerService.getEffectivePrice(astrologer.id, activeType).then(p => { if (!cancelled) setEffectivePrice(p); }).catch(() => {});
    return () => { cancelled = true; };
  }, [astrologer?.id, activeType]);

  if (astrologerLoading) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>;
  if (notFound || !astrologer) return <div className={`${styles.pageWrapper} ${styles.darkPage}`} style={{ textAlign: 'center', padding: '100px 20px' }}>Astrologer not found.</div>;

  const live = publicStates[astrologer.id];
  const liveLabel = !live ? null : live.status === 'ONLINE_AVAILABLE' ? '🟢 Available now' : live.status === 'ONLINE_BUSY' ? '🟡 Currently busy' : live.status === 'AWAY' ? '⚪ Away' : '⚪ Offline';
  // Only a soft client-side hint — the backend re-checks availability for
  // real at payment fulfillment time and auto-refunds to wallet if it turns
  // out unavailable by then (see fulfillment.ts's CONSULTATION case).
  const isUnavailable = live?.status === 'OFFLINE' || live?.status === 'AWAY';

  // Video call is coming later (WebRTC signaling isn't built yet) — chat and
  // voice already run on the real consultation queue/socket pipeline, so
  // only those two are offered for now.
  const OPTIONS = [
    { type: 'chat', label: 'Live Chat', price: astrologer.price * 20, desc: '20-min session text consultation' },
    { type: 'voice', label: 'Voice Call', price: astrologer.price * 25, desc: '25-min live voice guidance call' },
  ];

  const DURATION_STEP = 5, DURATION_MIN = 5, DURATION_MAX = 120;

  const SLOTS = [
    'Today - 04:30 PM',
    'Today - 06:00 PM',
    'Today - 07:30 PM',
    'Tomorrow - 10:00 AM',
    'Tomorrow - 11:30 AM',
    'Tomorrow - 03:00 PM',
  ];

  const selectedOpt = OPTIONS.find(o => o.type === activeType)!;

  // Scheduling a FUTURE slot needs real infrastructure this app doesn't have
  // yet (a stored booking, a job to actually fire the request at that time,
  // reminders...) — the realtime engine only ever handles "right now"
  // requests. This used to fake a success (an alert + navigate) without
  // charging anything or creating any real booking at all, which is exactly
  // the "booked without payment" bug — replaced with an honest notice
  // instead of pretending it worked.
  const handleConfirm = () => setScheduleNotice(true);

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
      // Booking itself now happens server-side, only after payment clears
      // (see fulfillment.ts's CONSULTATION case) — this redirects the whole
      // browser to the gateway and never resolves here on success; reaching
      // the catch below means it failed before that redirect even happened.
      await paymentService.pay({ purpose: 'CONSULTATION', astrologerId: astrologer.id, category, type: activeType, durationMinutes });
    } catch (e) {
      setError(e instanceof PaymentApiError ? e.message : (e as Error).message);
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
                      <span className={styles.optionPrice}>
                        {opt.type === activeType && effectivePrice && effectivePrice.appliedOfferPercent > 0 ? (
                          <>
                            <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: 4 }}>₹{astrologer.price}</span>
                            ₹{effectivePrice.pricePerMin}/min
                          </>
                        ) : (
                          <>₹{astrologer.price}/min</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {effectivePrice && effectivePrice.appliedOfferPercent > 0 && (
                  <p className={styles.reviewCount} style={{ marginTop: '4px', color: 'var(--color-gold)' }}>
                    {effectivePrice.isLoyal ? `Loyalty discount applied — ${effectivePrice.appliedOfferPercent}% off` : `Offer applied — ${effectivePrice.appliedOfferPercent}% off`}
                  </p>
                )}
                <h3 className={styles.contentSectionTitle} style={{ border: 'none', marginTop: '20px' }}>Select Duration</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '8px 0' }}>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    style={{ width: '40px', height: '40px', padding: 0, fontSize: '18px', lineHeight: 1 }}
                    disabled={durationMinutes <= DURATION_MIN}
                    onClick={() => setDurationMinutes(m => Math.max(DURATION_MIN, m - DURATION_STEP))}
                  >
                    −
                  </button>
                  <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-gold)', minWidth: '110px', textAlign: 'center' }}>
                    {durationMinutes} min
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-light btn-sm"
                    style={{ width: '40px', height: '40px', padding: 0, fontSize: '18px', lineHeight: 1 }}
                    disabled={durationMinutes >= DURATION_MAX}
                    onClick={() => setDurationMinutes(m => Math.min(DURATION_MAX, m + DURATION_STEP))}
                  >
                    +
                  </button>
                </div>
                <p className={styles.reviewCount} style={{ marginTop: '16px' }}>
                  This connects you to the astrologer's real-time queue — if they're busy, you'll see your position and estimated wait instead of a fixed appointment slot. Your chat/call runs for the duration you picked; you'll get an option to extend about a minute before it ends, and you can end it yourself any time.
                </p>
              </div>
            </div>

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
                <span>Duration</span>
                <span style={{ color: 'var(--color-text-light)' }}>{durationMinutes} min</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(184,138,59,0.15)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--color-gold)' }}>
                <span>Estimated Total</span>
                <span>₹{(effectivePrice?.pricePerMin ?? astrologer.price) * durationMinutes}</span>
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: '12px', marginTop: '12px' }}>{error}</p>}
              {isUnavailable && <p style={{ color: '#c0392b', fontSize: '12px', marginTop: '12px' }}>This astrologer appears to be unavailable right now.</p>}
              <button className="btn btn-gold" style={{ width: '100%', marginTop: '20px' }} disabled={starting || isUnavailable} onClick={handleStartNow}>
                {starting ? 'Redirecting to payment…' : 'Pay & Start Consultation'}
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

              {scheduleNotice && (
                <p style={{ color: 'var(--color-text-light)', fontSize: '12px', marginTop: '12px' }}>
                  Scheduling a future slot isn't available yet — please use "Consult Now" for an immediate session instead.
                </p>
              )}
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
  const { userSync, recommendations, queueExpired, clearQueueExpired, cancelMyQueueEntry, endConsultationById, expiringSoon } = useRealtime();
  const [justReviewed, setJustReviewed] = useState(false);
  const [ending, setEnding] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState('');

  // Running elapsed-time display for the user's side, mirroring the
  // astrologer-side one in AstrologistDashboard/sections/Overview.tsx's
  // LiveStatusCard — this app only had it on the astrologer's side before.
  useEffect(() => {
    const startedAt = userSync?.consultation?.startedAt;
    if (!startedAt) { setElapsed(''); return; }
    const tick = () => {
      const ms = Date.now() - startedAt;
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setElapsed(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [userSync?.consultation?.startedAt]);

  // expiringSoon starts at a fixed 60s from the server (see
  // realtimeStore.ts's scheduleExpiry) — ticked down client-side just for
  // a live-feeling countdown; the server's own end-timer is the real clock.
  useEffect(() => {
    if (!expiringSoon || expiringSoon.consultationId !== userSync?.consultation?.id) { setCountdown(null); return; }
    setCountdown(expiringSoon.remainingSeconds);
    const id = window.setInterval(() => setCountdown(s => (s !== null && s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [expiringSoon, userSync?.consultation?.id]);

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
    const showTopUp = countdown !== null && expiringSoon?.consultationId === consultation.id;
    const handleEnd = async () => {
      setEnding(true);
      try { await endConsultationById(consultation.id); } finally { setEnding(false); }
    };
    const handleExtend = async (extraMinutes: number) => {
      setExtending(true);
      setExtendError('');
      try {
        // Same pattern as booking: pay first, real minutes only get added by
        // fulfillment.ts's CONSULTATION_EXTEND case once payment clears — a
        // full gateway redirect away and back (this page is already
        // `pending_payment_return`'s stashed page, so AppContext lands the
        // visitor right back here; the modal is skipped for this purpose so
        // it doesn't pop up over an active chat/call).
        await paymentService.pay({ purpose: 'CONSULTATION_EXTEND', consultationId: consultation.id, extraMinutes });
      } catch (e) {
        setExtendError(e instanceof PaymentApiError ? e.message : (e as Error).message);
        setExtending(false);
      }
    };
    return (
      <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
        <div className={styles.container} style={{ maxWidth: '600px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2>Your consultation with {astrologer?.name} is now active</h2>
            <p className={styles.reviewCount} style={{ marginTop: '8px' }}>{consultation.category} · {consultation.type} · {consultation.durationMinutes + consultation.extendedMinutes} min</p>
            {elapsed && (
              <p style={{ marginTop: '8px', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gold)' }}>{elapsed}</p>
            )}
          </div>

          {showTopUp && (
            <div style={{ border: '1px solid var(--color-gold)', background: 'rgba(184,138,59,0.08)', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px', fontSize: '14px' }}>
                Your session ends in <strong>{countdown}s</strong> — want more time?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[5, 10, 15].map(mins => (
                  <button key={mins} className="btn btn-gold btn-sm" disabled={extending} onClick={() => handleExtend(mins)}>
                    {extending ? 'Redirecting…' : `+${mins} min`}
                  </button>
                ))}
              </div>
              {extendError && <p style={{ color: '#c0392b', fontSize: '12px', marginTop: '10px' }}>{extendError}</p>}
            </div>
          )}

          {consultation.type === 'voice' ? (
            <CallWindow consultationId={consultation.id} otherPartyName={astrologer?.name || 'your astrologer'} isInitiator />
          ) : (
            <ChatWindow consultationId={consultation.id} otherPartyName={astrologer?.name || 'your astrologer'} allowMediaUpload />
          )}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <button className="btn btn-outline-light" disabled={ending} onClick={handleEnd}>{ending ? 'Ending…' : 'End Consultation'}</button>
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
  const { isLoggedIn, setShowLoginModal } = useAppContext();
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
      await paymentService.pay({ purpose: 'REPORT_PURCHASE', reportId: report.id, bundle: bundle.key });
    } catch (err) {
      setBuyError(err instanceof PaymentApiError ? err.message : 'Could not start payment. Please try again.');
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
                <div className={styles.manuscriptSeal}>TREDEVAASTRO GRANTH</div>
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
                      {buying === b.key ? 'Redirecting…' : 'Select'}
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
  const { cart, currentUser } = useAppContext();
  const [formData, setFormData] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', address: '', city: '', zip: '' });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // On success this redirects the whole tab to the gateway's hosted payment
  // page (which one — Cashfree vs Razorpay — is decided server-side from the
  // visitor's IP, never a client choice, see payments.routes.ts) and never
  // returns here — the cart is only cleared, and the result shown, once the
  // browser comes back and AppContext's bootstrap effect confirms the
  // outcome (see PaymentResultModal). Anything caught below happened BEFORE
  // that redirect (e.g. the intent couldn't be created).
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length || placing) return;
    setPlacing(true);
    setError('');
    try {
      await paymentService.pay({
        purpose: 'STORE_ORDER',
        items: cart.map(item => ({ productId: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        shipping: { name: formData.name, address: formData.address, city: formData.city, zip: formData.zip },
      });
    } catch (err) {
      setError(err instanceof PaymentApiError ? err.message : 'Could not start payment. Please try again.');
      setPlacing(false);
    }
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
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gold-dark)' }}>🔒 Secured Payment Gateway</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--color-text-dark-2)' }}>Pujas are scheduled dynamically under auspicious nakshatras.</p>
            </div>
            <div className={styles.totalRow} style={{ borderTop: 'none', marginTop: 0, paddingTop: 0, marginBottom: '20px' }}>
              <span>Total Fees</span>
              <span>₹{total}</span>
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: '12px', marginBottom: '12px' }}>{error}</p>}
            <button type="submit" className="btn btn-gold" style={{ width: '100%' }} disabled={placing || !cart.length}>
              {placing ? 'Redirecting…' : 'Place Sacred Order'}
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
  const { setPage, currentUser, saveBirthDetails } = useAppContext();
  const [saveMsg, setSaveMsg] = useState('');
  // The real logged-in account's name — this used to read from
  // `birthProfile`, a browser-local, account-independent "whichever Kundli
  // was last generated on this browser" value (plain localStorage, not tied
  // to any user), which is why it stayed stuck on a previous account's name
  // after signing in as someone else. Same fix as ProfileDashboardPage.
  const displayName = currentUser?.name || 'Yajamana';

  const handleSave = async (details: BirthDetailsSubmitValue) => {
    setSaveMsg('');
    const ok = await saveBirthDetails({
      birthDate: details.date,
      birthTime: details.time,
      birthPlace: details.placeName,
      birthLatitude: details.latitude,
      birthLongitude: details.longitude,
      birthTimezoneOffsetMinutes: details.timezoneOffsetMinutes,
    });
    setSaveMsg(ok ? 'Birth details updated successfully.' : 'Could not save your birth details. Please try again.');
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
                {displayName.charAt(0)}
              </div>
              <h3 className={styles.sidebarName} style={{ color: 'var(--color-text-dark)', fontSize: '1.2rem', marginTop: '10px' }}>{displayName}</h3>
              <p className={styles.reviewCount} style={{ margin: '0 0 20px 0' }}>{currentUser?.email}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                <button className={styles.toolItemLink} onClick={() => setPage('my-reports')}>My Granth Reports</button>
                <button className={styles.toolItemLink} onClick={() => setPage('my-consultations')}>My Consultations</button>
                <button className={styles.toolItemLink} onClick={() => setPage('my-orders')}>My Remedy Orders</button>
              </div>
            </div>
          </div>

          {/* Profile Form — the account's own saved birth details (backend
              `users.birth_*` columns), not the shared local `birthProfile`
              mock other tools use for a quick one-off Kundli lookup. */}
          <div className={styles.partnerFormCard}>
            <h3 className={styles.partnerTitle}>✦ Edit Birth Coordinates</h3>
            <BirthDetailsForm
              onSubmit={handleSave}
              submitLabel="Save Birth Coordinates"
              idPrefix="account-birth"
              showNameField={false}
              initialValues={toSavedBirthDetails(currentUser)}
            />
            {saveMsg && <p className={styles.reviewCount} style={{ marginTop: '12px' }}>{saveMsg}</p>}
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
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    orderService.listMine()
      .then(rows => { if (!cancelled) setOrders(rows); })
      .catch(err => { if (!cancelled) setError(err instanceof OrderApiError ? err.message : 'Could not load your orders.'); });
    return () => { cancelled = true; };
  }, []);

  const STATUS_LABEL: Record<Order['deliveryStatus'], string> = { PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered' };

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

        {error && <p style={{ color: '#c0392b', textAlign: 'center' }}>{error}</p>}
        {!error && orders && orders.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-dark-2)' }}>No orders yet.</p>}

        <div className={styles.cartList}>
          {orders?.map(o => (
            <div key={o.id} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <h3 className={styles.cartItemName}>Order #{o.id}</h3>
                <span className={styles.cartItemCat}>
                  {o.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')} · Ordered: {new Date(o.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div style={{ paddingRight: '20px', fontWeight: 600 }}>₹{o.amount}</div>
              <span className="badge" style={{ background: o.deliveryStatus === 'DELIVERED' ? 'rgba(80,200,120,0.1)' : 'rgba(184,138,59,0.08)', color: o.deliveryStatus === 'DELIVERED' ? '#50C878' : 'var(--color-gold-dark)', border: '1px solid' }}>
                {STATUS_LABEL[o.deliveryStatus]}
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
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>About TredevaAstro</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 1.75, color: 'var(--color-text-dark)' }}>
          <p>TredevaAstro was founded to bridge ancient Vedic wisdom with modern digital clarity. Rather than generating generic commercial predictions, our platform is built on classical Indian astronomical observations (Jyotish Shastra).</p>
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
    setPage, setSelectedId, isLoggedIn, setShowLoginModal, setPendingAction,
    currentUser,
  } = useAppContext();
  const [activeTab, setActiveTab] = React.useState('my-jyotish');
  // Same fix as ProfilePage — birthProfile is a local, account-independent
  // "last Kundli generated on this browser" value, not the logged-in
  // account's identity. The real account name always wins when logged in.
  const displayName = currentUser?.name || 'Yajamana';

  React.useEffect(() => {
    if (!isLoggedIn) {
      setPendingAction('profile');
      setShowLoginModal(true);
    }
  }, [isLoggedIn]);

  // "My Kundli" recomputes the real D1 chart from the account's own saved
  // birth details (currentUser.birth_*, precise lat/long/tz — unlike
  // `birthProfile`, which only has display-only sun/moon/ascendant strings)
  // instead of showing the old hardcoded KUNDLI_GRID mock.
  const [myKundli, setMyKundli] = React.useState<KundliFullResult | null>(null);
  const [myKundliLoading, setMyKundliLoading] = React.useState(false);
  const [myKundliError, setMyKundliError] = React.useState('');
  const hasBirthDetails = !!(currentUser?.birthDate && currentUser?.birthTime && currentUser?.birthLatitude != null && currentUser?.birthLongitude != null && currentUser?.birthTimezoneOffsetMinutes != null);
  // Sidebar summary reuses the same real, account-bound `myKundli` result as
  // the tab bodies below — never the hardcoded placeholder signs the mock
  // used to show for every account.
  const sidebarMoonSign = myKundli ? toChartPlanets(myKundli.kundli, myKundli.bhavChalit).find(p => p.id === 'moon')?.sign : undefined;
  const sidebarSummary = myKundli
    ? `${cap(myKundli.kundli.ascendant.rashi)} Lagna · ${cap(sidebarMoonSign ?? '—')} Chandra`
    : hasBirthDetails ? 'Loading your chart…' : 'Generate your Kundli to see your Lagna & Chandra';

  React.useEffect(() => {
    if ((activeTab !== 'my-kundli' && activeTab !== 'my-jyotish') || !hasBirthDetails || myKundli || myKundliLoading) return;
    setMyKundliLoading(true);
    setMyKundliError('');
    calculatorService.kundliFull({
      date: currentUser!.birthDate!,
      time: currentUser!.birthTime!,
      latitude: currentUser!.birthLatitude!,
      longitude: currentUser!.birthLongitude!,
      timezoneOffsetMinutes: currentUser!.birthTimezoneOffsetMinutes!,
    })
      .then(setMyKundli)
      .catch(err => setMyKundliError(err instanceof CalculatorApiError ? err.message : 'Could not load your Kundli chart.'))
      .finally(() => setMyKundliLoading(false));
  }, [activeTab, hasBirthDetails, currentUser, myKundli, myKundliLoading]);

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingTop: 'calc(var(--nav-height) + var(--space-8))' }}>
      <div className={styles.profileLayout} style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
        {/* Sidebar */}
        <aside className={styles.profileSidebar}>
          <div className={styles.profileCard}>
            <div className={styles.profileAvatar}>✦</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{displayName}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{sidebarSummary}</div>
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
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Vedic birth chart for {displayName}{hasBirthDetails ? ` · Born ${currentUser?.birthDate}` : ''}</p>
              </div>

              {!hasBirthDetails ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: '3rem', opacity: 0.3 }}>✦</span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>Your Kundli has not been created yet.</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>Generate your birth chart to unlock your Vedic blueprint.</p>
                  <button className="btn btn-gold" onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Generate My Kundli</button>
                </div>
              ) : myKundliError ? (
                <p style={{ textAlign: 'center', color: '#c0392b' }}>{myKundliError}</p>
              ) : !myKundli ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading your Kundli chart…</p>
              ) : (() => {
                const chartPlanets = toChartPlanets(myKundli.kundli, myKundli.bhavChalit);
                const grahaRows = chartPlanets.filter(p => p.id !== 'asc');
                const moonSign = chartPlanets.find(p => p.id === 'moon')?.sign || '—';
                const activeIdx = myKundli.mahadashaTimeline.findIndex(m => m.active);
                const activeMahadasha = activeIdx >= 0 ? myKundli.mahadashaTimeline[activeIdx] : undefined;
                const nextMahadasha = activeIdx >= 0 ? myKundli.mahadashaTimeline[activeIdx + 1] : undefined;
                const now = Date.now();
                const activeAntardasha = activeMahadasha?.antardashas.find(a => {
                  const s = Date.parse(a.startsAt), e = Date.parse(a.endsAt);
                  return !Number.isNaN(s) && !Number.isNaN(e) && now >= s && now <= e;
                }) ?? activeMahadasha?.antardashas[0];
                const dashaCards = [
                  activeMahadasha && { label: 'Current Mahadasha', value: `${cap(activeMahadasha.lord)}`, period: `${activeMahadasha.startsAt} – ${activeMahadasha.endsAt}`, active: true },
                  activeAntardasha && { label: 'Current Antardasha', value: `${cap(activeAntardasha.lord)}`, period: `${activeAntardasha.startsAt} – ${activeAntardasha.endsAt}`, active: true },
                  nextMahadasha && { label: 'Next Mahadasha', value: `${cap(nextMahadasha.lord)}`, period: `${nextMahadasha.startsAt} – ${nextMahadasha.endsAt}`, active: false },
                ].filter((d): d is { label: string; value: string; period: string; active: boolean } => !!d);

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                      {[
                        { label: 'Janma Rashi', value: moonSign, icon: '☽' },
                        { label: 'Lagna (Ascendant)', value: myKundli.kundli.ascendant.rashi, icon: '↑' },
                        { label: 'Nakshatra', value: `${myKundli.kundli.moonNakshatra.name} (${ordinal(myKundli.kundli.moonNakshatra.pada)} Pada)`, icon: '✦' },
                      ].map(item => (
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
                      {grahaRows.map((p, i) => (
                        <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1.4fr) minmax(0, 1.6fr) auto', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-6)', borderBottom: i < grahaRows.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.1rem', color: 'var(--gold-primary)', textAlign: 'center' }}>{p.symbol}</span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{p.name}{p.retrograde ? ' ℞' : ''}</span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{p.sign} · {ordinal(p.house)} Bhava</span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'right' }}>{p.degree}</span>
                        </div>
                      ))}
                    </div>
                    {dashaCards.length > 0 && (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
                        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', fontWeight: 400, color: 'var(--text-primary)', marginBottom: 'var(--space-5)' }}>Vimshottari Dasha</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                          {dashaCards.map(d => (
                            <div key={d.label} style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: `1px solid ${d.active ? 'rgba(181,138,59,0.3)' : 'var(--border-subtle)'}`, background: d.active ? 'rgba(181,138,59,0.05)' : 'transparent' }}>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: d.active ? 'var(--gold-primary)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{d.label}</div>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{d.value}</div>
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{d.period}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'my-kundli' && (
            <div>
              <div style={{ marginBottom: 'var(--space-8)' }}>
                <span className="section-eyebrow">Your Birth Blueprint</span>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 300, color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>My Kundli Chart</h1>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                  Janam Kundli for {displayName}{hasBirthDetails ? ` · Born ${currentUser?.birthDate}` : ''}
                </p>
              </div>

              {!hasBirthDetails ? (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <span style={{ fontSize: '3rem', opacity: 0.3 }}>☉</span>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>Your Kundli has not been created yet.</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>Generate your birth chart to unlock your Vedic blueprint.</p>
                  <button className="btn btn-gold" onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Generate My Kundli</button>
                </div>
              ) : myKundliError ? (
                <p style={{ textAlign: 'center', color: '#c0392b' }}>{myKundliError}</p>
              ) : !myKundli ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading your Kundli chart…</p>
              ) : (
                <div className={styles.chartPageGrid} style={{ gridTemplateColumns: '1fr' }}>
                  <div className={styles.ancientCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={styles.chartVisualSection} style={{ width: '100%', maxWidth: '420px' }}>
                      <NorthIndianChart
                        planets={toChartPlanets(myKundli.kundli, myKundli.bhavChalit)}
                        ascendantRashi={myKundli.kundli.ascendant.rashi}
                        onPlanetHover={() => {}}
                        onPlanetLeave={() => {}}
                        onHouseHover={() => {}}
                        onHouseLeave={() => {}}
                      />
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
