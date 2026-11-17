import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { GUIDANCE_INFO } from '../../data/guidanceInfo';
import pageStyles from '../PageRenderer.module.css';
import styles from './GuidanceInfoPage.module.css';

// The destination for SeekGuidance.tsx's concern cards (except Vastu, which
// keeps its own calculator). Generic per-category content — see
// data/guidanceInfo.ts's header comment for why this isn't personalized to
// the visitor's own chart.
const ASTROLOGER_CATEGORY: Record<string, string> = {
  marriage: 'Marriage',
  career: 'Career',
  money: 'Finance',
  family: 'Family',
  spirituality: 'Spirituality',
  growth: 'All',
};

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

export default function GuidanceInfoPage({ id }: { id: unknown }) {
  const { setPage, setAstrologerFilter, language } = useAppContext();
  const content = GUIDANCE_INFO[String(id)];

  if (!content) {
    return (
      <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
        <div className={pageStyles.container} style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>Page not found.</h2>
          <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={() => setPage('home')}>Back to Home</button>
        </div>
      </div>
    );
  }

  // This page carries its own hand-written Hindi copy, so Hindi visitors get
  // that rather than a machine translation of the English — but then the page
  // has to opt out of the browser's own translate feature (see the wrapper
  // below), since that treats the page as English and would otherwise
  // re-translate this real Hindi as if it were garbled English. Every other
  // language falls back to English here, same as the rest of the site.
  const lang: 'en' | 'hi' = language === 'hi' ? 'hi' : 'en';
  const name = lang === 'hi' ? content.nameHi : content.nameEn;

  const goToAstrologers = () => {
    setAstrologerFilter(ASTROLOGER_CATEGORY[content.id] || 'All');
    setPage('astrologers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} translate={lang === 'hi' ? 'no' : undefined}>
      <div className={pageStyles.container}>
        <motion.div className={pageStyles.pageHeader} {...fadeUp} transition={{ duration: 0.6 }}>
          <span className="section-eyebrow-gold">{content.sanskrit}</span>
          <h1 className={pageStyles.pageTitle}>{name}</h1>
          <div className={pageStyles.divider}>✦ ❖ ✦</div>
          <p className={pageStyles.pageSubtitle}>{content.intro[lang]}</p>
        </motion.div>

        <div className={styles.sections}>
          <motion.div className={pageStyles.contentSection} {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }}>
            <h3 className={pageStyles.contentSectionTitle}>
              {lang === 'hi' ? 'कारक ग्रह और भाव' : 'Governing Planets & Houses'}
            </h3>
            <p className={pageStyles.contentText}>{content.planets[lang]}</p>
          </motion.div>

          <motion.div className={pageStyles.contentSection} {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }}>
            <h3 className={pageStyles.contentSectionTitle}>
              {lang === 'hi' ? 'यह कमज़ोर या रुका हुआ क्यों महसूस होता है' : 'Why It Can Feel Weak or Stuck'}
            </h3>
            <p className={pageStyles.contentText}>{content.whyWeak[lang]}</p>
          </motion.div>

          <motion.div className={pageStyles.contentSection} {...fadeUp} transition={{ duration: 0.55, delay: 0.19 }}>
            <h3 className={pageStyles.contentSectionTitle}>
              {lang === 'hi' ? 'इसे कैसे मज़बूत करें' : 'How To Strengthen It'}
            </h3>
            <p className={pageStyles.contentText}>{content.remedies[lang]}</p>
          </motion.div>
        </div>

        <motion.div className={styles.ctaBlock} {...fadeUp} transition={{ duration: 0.55, delay: 0.26 }}>
          <p className={styles.ctaNote}>
            {lang === 'hi'
              ? 'यह सामान्य जानकारी है — आपकी अपनी कुंडली में यह वास्तव में कैसे लागू होता है, यह जानने के लिए हमारे ज्योतिषियों से बात करें।'
              : 'This is general guidance — to see exactly how it plays out in your own chart, talk to one of our astrologers.'}
          </p>
          <div className={styles.ctaButtons}>
            <button className="btn btn-gold" onClick={goToAstrologers}>
              {lang === 'hi' ? 'ज्योतिषी से बात करें' : 'Consult an Astrologer'}
            </button>
            <button className="btn btn-outline-light" onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              {lang === 'hi' ? 'मुफ़्त कुंडली बनवाएं' : 'Generate Free Kundli'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
