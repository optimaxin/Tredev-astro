import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import {
  ASTROLOGERS,
  PRODUCTS,
  COURSES,
  REPORTS,
  BLOG_POSTS,
  PANCHANG
} from '../data/mockData';
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
          <GuidanceBanner />
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
          
          <Testimonials />
          <WhyTredevAstro />
        </>
      );

    case 'free-kundli':
      return (
        <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
          <div className={styles.container}>
            <KundliSection />
          </div>
        </div>
      );

    case 'kundli-result':
      return <KundliResultPage />;

    case 'my-jyotish':
    case 'profile':
      return <ProfileDashboardPage />;

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

    case 'kundli-matching':
      return <KundliMatchingPage />;

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

    case 'profile':
      return <ProfilePage />;

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
function HoroscopePage() {
  const [activeRashi, setActiveRashi] = useState(0);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const RASHIS = [
    { name: 'Mesha', eng: 'Aries', symbol: '♈', element: 'Fire', graha: 'Mars', index: 1 },
    { name: 'Vrishabha', eng: 'Taurus', symbol: '♉', element: 'Earth', graha: 'Venus', index: 2 },
    { name: 'Mithuna', eng: 'Gemini', symbol: '♊', element: 'Air', graha: 'Mercury', index: 3 },
    { name: 'Karka', eng: 'Cancer', symbol: '♋', element: 'Water', graha: 'Moon', index: 4 },
    { name: 'Simha', eng: 'Leo', symbol: '♌', element: 'Fire', graha: 'Sun', index: 5 },
    { name: 'Kanya', eng: 'Virgo', symbol: '♍', element: 'Earth', graha: 'Mercury', index: 6 },
    { name: 'Tula', eng: 'Libra', symbol: '♎', element: 'Air', graha: 'Venus', index: 7 },
    { name: 'Vrischika', eng: 'Scorpio', symbol: '♏', element: 'Water', graha: 'Mars', index: 8 },
    { name: 'Dhanu', eng: 'Sagittarius', symbol: '♐', element: 'Fire', graha: 'Jupiter', index: 9 },
    { name: 'Makara', eng: 'Capricorn', symbol: '♑', element: 'Earth', graha: 'Saturn', index: 10 },
    { name: 'Kumbha', eng: 'Aquarius', symbol: '♒', element: 'Air', graha: 'Saturn', index: 11 },
    { name: 'Meena', eng: 'Pisces', symbol: '♓', element: 'Water', graha: 'Jupiter', index: 12 },
  ];

  const current = RASHIS[activeRashi];

  const getPrediction = (rashi: string, tab: string) => {
    return `Today's astrological alignments indicate strong support for the ${rashi} native. Surya in your solar house signals key shifts in career trajectory and dharmic focus. Align your actions to your ruling deity and seek timing alignments. Under this transit, remain reflective regarding significant relationships, especially with Chandra aspecting your house of communication. Use this ${tab} window to strengthen personal foundations.`;
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Rashi Rashiphal</span>
          <h1 className={styles.pageTitle}>Free Horoscopes</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle}>
            Read daily, weekly and monthly predictions aligned to the Vedic position of your Moon Sign.
          </p>
        </div>

        <div className={styles.horoscopeLayout}>
          {/* Wheel Selector */}
          <div className={styles.wheelColumn}>
            <div className={styles.rashiWheelWrap}>
              <div className={styles.wheelCenter}>
                <span className={styles.centerGlyph}>❂</span>
              </div>
              {RASHIS.map((r, i) => {
                const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
                const radius = 160; // radius of circle layout
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <button
                    key={r.name}
                    className={`${styles.rashiNode} ${activeRashi === i ? styles.rashiNodeActive : ''}`}
                    style={{
                      left: `calc(50% + ${x}px - 21px)`,
                      top: `calc(50% + ${y}px - 21px)`,
                    }}
                    onClick={() => setActiveRashi(i)}
                  >
                    <span className={styles.nodeIndex}>{r.index}</span>
                    <span className={styles.nodeSymbol}>{r.symbol}</span>
                  </button>
                );
              })}
            </div>
            <p className={styles.reviewText}>✦ Select a Moon Sign Node to view forecast ✦</p>
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
                <span className={styles.specVal}>{current.symbol} Rashi</span>
              </div>
            </div>

            <div className={styles.tabButtons}>
              {['daily', 'weekly', 'monthly'].map(tab => (
                <button
                  key={tab}
                  className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab(tab as any)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            <div className={styles.horoscopeText}>
              <p>{getPrediction(current.name, activeTab)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Kundli Matching (Guna Milan) Page
function KundliMatchingPage() {
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(false);
  const [boy, setBoy] = useState({ name: 'Rohit', dob: '1992-04-14', tob: '08:30', place: 'Mumbai' });
  const [girl, setGirl] = useState({ name: 'Meera', dob: '1993-07-20', tob: '14:45', place: 'Pune' });

  const handleMatch = (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setTimeout(() => {
      setCalculating(false);
      setResult(true);
    }, 1800);
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
            {/* Boy Side */}
            <div className={styles.partnerFormCard}>
              <h3 className={styles.partnerTitle}>✦ Partner 1 (Boy)</h3>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={boy.name}
                  onChange={e => setBoy({ ...boy, name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="input-field input-cosmos"
                  value={boy.dob}
                  onChange={e => setBoy({ ...boy, dob: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Time of Birth</label>
                <input
                  type="time"
                  className="input-field input-cosmos"
                  value={boy.tob}
                  onChange={e => setBoy({ ...boy, tob: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Birth</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={boy.place}
                  onChange={e => setBoy({ ...boy, place: e.target.value })}
                />
              </div>
            </div>

            {/* Girl Side */}
            <div className={styles.partnerFormCard}>
              <h3 className={styles.partnerTitle}>✦ Partner 2 (Girl)</h3>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={girl.name}
                  onChange={e => setGirl({ ...girl, name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="input-field input-cosmos"
                  value={girl.dob}
                  onChange={e => setGirl({ ...girl, dob: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Time of Birth</label>
                <input
                  type="time"
                  className="input-field input-cosmos"
                  value={girl.tob}
                  onChange={e => setGirl({ ...girl, tob: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Place of Birth</label>
                <input
                  type="text"
                  className="input-field input-cosmos"
                  value={girl.place}
                  onChange={e => setGirl({ ...girl, place: e.target.value })}
                />
              </div>
            </div>

            <div style={{ gridColumn: 'span 2', textAlign: 'center', marginTop: '16px' }}>
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
                    Match between {boy.name} &amp; {girl.name}
                  </p>
                </div>
                <div className={styles.scoreCircle}>
                  <span className={styles.scoreVal}>28</span>
                  <span className={styles.scoreLabel}>Out of 36</span>
                </div>
              </div>

              <div className={styles.compatGrid}>
                <div className={styles.compatBox}>
                  <span className={styles.compatLabel}>Nadi</span>
                  <span className={styles.compatVal}>8 / 8</span>
                </div>
                <div className={styles.compatBox}>
                  <span className={styles.compatLabel}>Bhakoot</span>
                  <span className={styles.compatVal}>7 / 7</span>
                </div>
                <div className={styles.compatBox}>
                  <span className={styles.compatLabel}>Gana</span>
                  <span className={styles.compatVal}>5 / 6</span>
                </div>
                <div className={styles.compatBox}>
                  <span className={styles.compatLabel}>Maitri</span>
                  <span className={styles.compatVal}>4 / 5</span>
                </div>
                <div className={styles.compatBox}>
                  <span className={styles.compatLabel}>Yoni</span>
                  <span className={styles.compatVal}>3 / 4</span>
                </div>
              </div>

              <div className={styles.compatVerdict}>
                <strong>Vedic Verdict:</strong> Excellent Match Compatibility. {boy.name} and {girl.name} share auspicious moon positions indicating stable mutual understanding, harmonious family integration and strong emotional support. Both birth charts indicate favorable planetary transits with no severe Kuja Dosha (Manglik) blockages detected.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 3. Astrologer Profile Page
function AstrologerProfilePage({ id }: { id: any }) {
  const { setPage } = useAppContext();
  const astrologer = ASTROLOGERS.find(a => a.id === Number(id)) || ASTROLOGERS[0];

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.profileGrid}>
          {/* Sidebar */}
          <div className={styles.profileSidebar}>
            <div className={styles.profileAvatar}>
              {astrologer.name.charAt(0)}
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
          </div>

          {/* Content Card */}
          <div className={styles.profileContentCard}>
            <div className={styles.contentSection}>
              <h3 className={styles.contentSectionTitle}>About Acharya</h3>
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
              <div className={styles.reviewList}>
                <div className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>Kiran K.</span>
                    <span className={styles.starRating}>★ 5</span>
                  </div>
                  <p className={styles.reviewText}>"Incredibly insightful. The Acharya detailed my Saturn transit blockages so clearly and suggested simple mantra corrections. Felt very supported."</p>
                </div>
                <div className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewUser}>Nalini S.</span>
                    <span className={styles.starRating}>★ 5</span>
                  </div>
                  <p className={styles.reviewText}>"Accurate timeline forecasts for my marriage Muhurat. Strongly recommended."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Consultation Booking Page
function ConsultationBookingPage({ id }: { id: any }) {
  const { setPage } = useAppContext();
  const [activeType, setActiveType] = useState<'chat' | 'voice' | 'video'>('chat');
  const [activeSlot, setActiveSlot] = useState(0);

  const astrologer = ASTROLOGERS.find(a => a.id === Number(id)) || ASTROLOGERS[0];

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

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Secure Consultation Scheduler</span>
          <h1 className={styles.pageTitle}>Choose Your Guidance</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle}>
            Configure your consultation format and select an available time window.
          </p>
        </div>

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
              <span>Acharya</span>
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
      </div>
    </div>
  );
}

// 5. Report Detail Page
function ReportDetailPage({ id }: { id: any }) {
  const { addToCart, setPage } = useAppContext();
  const report = REPORTS.find(r => r.id === Number(id)) || REPORTS[0];

  const BUNDLES = [
    { title: 'Digital Manuscript Only', price: report.price, desc: 'Vedic report delivered as dynamic dashboard + PDF' },
    { title: 'Manuscript + 2 Acharya Qs', price: report.price + 300, desc: 'Add 2 direct questions to our Acharyas' },
    { title: 'Manuscript + 15-min Consult', price: report.price + 900, desc: 'Includes direct video consultation regarding transits' },
  ];

  const handleBuy = (bundle: typeof BUNDLES[0]) => {
    addToCart({
      id: report.id,
      name: `${report.title} (${bundle.title})`,
      price: bundle.price,
      quantity: 1,
      category: 'Reports'
    });
    setPage('cart');
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
                  key={b.title}
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
                    <button className="btn btn-gold btn-sm" onClick={() => handleBuy(b)}>Select</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Product Detail Page
function ProductDetailPage({ id }: { id: any }) {
  const { addToCart, setPage } = useAppContext();
  const product = PRODUCTS.find(p => p.id === Number(id)) || PRODUCTS[0];

  const handleAdd = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category
    });
    alert(`${product.name} added to cart.`);
    setPage('cart');
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
            <p className={styles.contentText} style={{ color: 'rgba(245, 241, 232, 0.8)', marginBottom: '24px' }}>
              Traditional association: {product.benefit}. Resourced responsibly, all remedies are purified, verified for dimensional coordinates, and energized through authentic Vedic pran-pratishtha pujas at specific chart-matching muhurtas.
            </p>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                <span>Planet Alignment</span>
                <span style={{ color: '#fff' }}>{product.planet}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                <span>Responsibly Sourced</span>
                <span style={{ color: '#fff' }}>Certified Authentic</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 500, color: 'var(--color-gold)' }}>
                ₹{product.price}
              </div>
              <button className="btn btn-gold" onClick={handleAdd}>
                Add to Cart
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
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
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
                  <input
                    type="date"
                    className="input-field input-cosmos"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
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
    </div>
  );
}

// 12. Kundli Result Page
function KundliResultPage() {
  const { birthProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'lagna' | 'interpretation'>('lagna');

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
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your Birth Blueprint</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Janam Kundli Chart</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>
            Vedic Chart generated for {birthProfile.name} based on birth coordinates: {birthProfile.dob} · {birthProfile.tob} · {birthProfile.place}.
          </p>
        </div>

        <div className={styles.chartPageGrid}>
          {/* Left Chart visual */}
          <div className={styles.ancientCard}>
            <div className={styles.tabButtons}>
              <button className={`${styles.tabBtn} ${activeTab === 'lagna' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('lagna')}>
                Lagna Chart (D1)
              </button>
              <button className={`${styles.tabBtn} ${activeTab === 'interpretation' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('interpretation')}>
                Grahas Placements
              </button>
            </div>

            {activeTab === 'lagna' ? (
              <div className={styles.chartVisualSection}>
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
                <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', margin: 0 }}>✦ Hover houses to view planetary alignments &amp; lord aspects ✦</p>
              </div>
            ) : (
              <div className={styles.syllabusList}>
                {[
                  { planet: 'Surya (Sun)', rashi: 'Vrischika (Scorpio)', degree: '14°32\'', house: '4th Bhava', details: 'Atma, authority, maternal connections' },
                  { planet: 'Chandra (Moon)', rashi: 'Vrishabha (Taurus)', degree: '23°11\'', house: '10th Bhava (Exalted)', details: 'Emotion, mental clarity, career status' },
                  { planet: 'Lagna (Ascendant)', rashi: 'Simha (Leo)', degree: '06°45\'', house: '1st Bhava', details: 'Self, vitality, physical appearance' },
                  { planet: 'Guru (Jupiter)', rashi: 'Meena (Pisces)', degree: '11°18\'', house: '8th Bhava', details: 'Wisdom, occult knowledge, expansions' },
                ].map(p => (
                  <div key={p.planet} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px', paddingTop: '10px' }}>
                    <div>
                      <strong style={{ color: 'var(--color-text-dark)' }}>{p.planet}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-dark-2)' }}>{p.details}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px' }}>
                      <span style={{ display: 'block', fontWeight: 600, color: 'var(--color-gold-dark)' }}>{p.rashi}</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-dark-2)' }}>{p.degree} · {p.house}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right interpretation sidebar */}
          <div className={styles.interpretCard}>
            <h3 className={styles.sidebarName} style={{ borderBottom: '1px solid rgba(184,138,59,0.15)', paddingBottom: '8px' }}>Bhava Analysis</h3>
            <div style={{ marginTop: '16px' }}>
              <div className={styles.interpretTitle}>Surya in 4th Bhava</div>
              <p className={styles.interpretBody}>Surya (Sun) aspecting your 10th house from the 4th house brings strong energy toward professional focus and leadership, yet signals a need for inner peace. Your emotional happiness is directly tied to the respect you command at work.</p>
            </div>
            <div style={{ marginTop: '16px' }}>
              <div className={styles.interpretTitle}>Chandra in 10th Bhava</div>
              <p className={styles.interpretBody}>An exalted Moon (Chandra) in your house of career signifies peak emotional stability when leading business projects. You approach commerce with nurturing instincts and high clarity.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 13. My Reports Page
function MyReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('Your Kundli Granth manuscript has been compiled and downloaded as PDF.');
    }, 1500);
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your generated files</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Reports</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.cartList}>
          <div className={styles.cartItem}>
            <div className={styles.cartItemInfo}>
              <h3 className={styles.cartItemName}>Career Intelligence Granth</h3>
              <span className={styles.cartItemCat}>Generated: 12 August 2026</span>
            </div>
            <button className="btn btn-gold btn-sm" disabled={downloading} onClick={handleDownload}>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
          <div className={styles.cartItem}>
            <div className={styles.cartItemInfo}>
              <h3 className={styles.cartItemName}>120-Page Premium Kundli Granth</h3>
              <span className={styles.cartItemCat}>Generated: 11 August 2026</span>
            </div>
            <button className="btn btn-gold btn-sm" disabled={downloading} onClick={handleDownload}>
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 14. My Consultations Page
function MyConsultationsPage() {
  const CONSULTATIONS = [
    { acharya: 'Acharya Rahul Shastri', date: '12 August 2026 - 06:30 PM', format: 'Live Video Consultation', status: 'Scheduled' },
    { acharya: 'Pandit Meera Devi', date: '04 July 2026 - 10:00 AM', format: 'Live Chat Guidance', status: 'Completed' },
  ];

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Your bookings history</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>My Consultations</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
        </div>

        <div className={styles.cartList}>
          {CONSULTATIONS.map(c => (
            <div key={c.acharya} className={styles.cartItem}>
              <div className={styles.cartItemInfo}>
                <h3 className={styles.cartItemName}>{c.acharya}</h3>
                <span className={styles.cartItemCat}>{c.format} · {c.date}</span>
              </div>
              <span className="badge" style={{ background: c.status === 'Scheduled' ? 'rgba(80,200,120,0.1)' : 'rgba(0,0,0,0.05)', color: c.status === 'Scheduled' ? '#50C878' : 'var(--color-text-dark-2)', border: '1px solid' }}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 15. My Orders Page
function MyOrdersPage() {
  const ORDERS = [
    { orderId: 'TA-98384', items: 'Natural Colombian Emerald Gemstone', total: 2499, date: '12 August 2026', status: 'Puja Energization Scheduled' },
    { orderId: 'TA-83748', items: 'Shri Yantra (Brass)', total: 1299, date: '02 July 2026', status: 'Delivered' },
  ];

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
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
    </div>
  );
}

// 16. Blog Detail Page
function BlogDetailPage({ id }: { id: any }) {
  const post = BLOG_POSTS.find(p => p.id === Number(id)) || BLOG_POSTS[0];

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader} style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto var(--space-8)' }}>
          <span className="section-eyebrow">{post.tag}</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)', fontSize: '2.75rem', lineHeight: 1.2 }}>{post.title}</h1>
          <div className={styles.blogFooter} style={{ marginTop: '12px' }}>
            <span>By Acharya Writers · {post.date}</span>
            <span>{post.readTime}</span>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-base)', lineHeight: 1.75, color: 'var(--color-text-dark)' }}>
          <div className={styles.blogCover} style={{ marginBottom: '32px' }}>
            ❂
          </div>
          <p><strong>{post.excerpt}</strong></p>
          <p style={{ marginTop: '16px' }}>Vedic calculations rely on the sidereal zodiac where planetary positions align directly to the fixed constellations. When investigating Sade Sati or transits, traditional shastras detail several remedial protocols to balance the energies of Saturn, Mars or Rahu.</p>
          <p style={{ marginTop: '16px' }}>Acharyas suggest establishing daily disciplines (Sadhana), meditating on ruling deities, and deploying energized Yantras to bring focus, alignment and emotional groundedness.</p>
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
// Profile Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
function ProfileDashboardPage() {
  const { birthProfile, setPage, isLoggedIn, setShowLoginModal, setPendingAction, kundliGenerated } = useAppContext();
  const [activeTab, setActiveTab] = React.useState('my-jyotish');

  React.useEffect(() => {
    if (!isLoggedIn) {
      setPendingAction('profile');
      setShowLoginModal(true);
    }
  }, [isLoggedIn]);

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
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
                  <div key={p.planet} style={{ display: 'grid', gridTemplateColumns: '40px 180px 1fr 100px', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-6)', borderBottom: i < PLANETARY_PLACEMENTS.length - 1 ? '1px solid var(--border-subtle)' : 'none', alignItems: 'center' }}>
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

          {activeTab !== 'my-jyotish' && activeTab !== 'my-kundli' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-16)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <span style={{ fontSize: '3rem', opacity: 0.3 }}>{SIDEBAR_ITEMS.find(s => s.key === activeTab)?.icon}</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>{SIDEBAR_ITEMS.find(s => s.key === activeTab)?.label}</h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '300px' }}>Generate your Kundli first to unlock this section.</p>
              <button className="btn btn-gold" onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Generate Kundli</button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
