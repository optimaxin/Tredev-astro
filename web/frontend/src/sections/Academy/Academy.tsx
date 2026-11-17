import React from 'react';
import { motion } from 'framer-motion';
import { EXTERNAL_COURSES, ACADEMY_BASE_URL, courseUrl } from '../../data/externalAcademyCourses';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './Academy.module.css';

const ROADMAP_STEPS = ['Shastri Basics', 'Kundli Analysis', 'Grahas & Rashis', 'Bhavas & Lords', 'Vimshottari Dasha', 'Gochara Transits', 'Phaladeepika'];

// A curated subset of the real catalog from TredevaAstro's sister learning
// platform (Tredeva Learn) — not every course, just a hand-picked few.
// Every card links straight to that course's real page there; there's no
// enrollment/checkout here, by design. "Explore Gurukul" goes to the full
// site for everything else. Same approach as sections/Store/Store.tsx.
export default function Academy({ featured = false }: { featured?: boolean }) {
  const { t, language } = useAppContext();
  const isHindi = language === 'hi';
  const courses = featured ? EXTERNAL_COURSES.slice(0, 3) : EXTERNAL_COURSES;

  return (
    <section className={styles.section} id="academy">
      <CelestialBackdrop variant="mandala" intensity="low" />
      <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('section_academy_title')}</h2>
            <p className="section-desc-sans">
              {t('section_academy_desc')}
            </p>
          </div>
          {featured && (
            <a className="section-explore-link" href={ACADEMY_BASE_URL} target="_blank" rel="noopener noreferrer">
              {t('cta_explore_courses')} →
            </a>
          )}
        </div>

        {/* Courses Grid */}
        <div className={`${styles.coursesGrid} ${featured ? styles.coursesGridFeatured : ''}`}>
          {courses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
            >
              <CourseCard course={course} isHindi={isHindi} />
            </motion.div>
          ))}
        </div>

        {/* Learning Roadmap — shown only on full Academy page */}
        {!featured && (
          <div className={styles.roadmap}>
            <h3 className={styles.roadmapTitle}>{t('roadmap_title')}</h3>
            <div className={styles.roadmapSteps}>
              {ROADMAP_STEPS.map((step, i) => (
                <div key={step} className={styles.step}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <span className={styles.stepLabel}>{t(`roadmap_step${i + 1}`)}</span>
                  {i < ROADMAP_STEPS.length - 1 && <div className={styles.stepLine} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore All — shown in featured mode */}
        {featured && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <a className="btn btn-outline-light" href={ACADEMY_BASE_URL} target="_blank" rel="noopener noreferrer">
              {t('cta_explore_gurukul')} →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

function CourseCard({ course: c, isHindi }: { course: typeof EXTERNAL_COURSES[0]; isHindi: boolean }) {
  const { t } = useAppContext();
  const url = courseUrl(c.id);
  // Several Learn-platform entries just duplicate the English string into
  // title_hi/subtitle_hi rather than actually translating it — showing
  // that verbatim would look like a broken translation, so only use the
  // Hindi field when it's genuinely different from the English one.
  const title = isHindi && c.titleHi !== c.title ? c.titleHi : c.title;
  const subtitle = isHindi && c.subtitleHi !== c.subtitle ? c.subtitleHi : c.subtitle;

  return (
    <a
      className={styles.courseCard}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none' }}
    >
      <div className={styles.courseTop} style={{ padding: 0, aspectRatio: '16 / 9' }}>
        <img src={c.image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      </div>

      <div className={styles.courseBody}>
        <div className={styles.courseCategory}>{t('cat_astrology')}</div>
        <h3 className={styles.courseName}>{title}</h3>
        {subtitle && <p className={styles.courseSubtitle}>{subtitle}</p>}

        {c.duration && (
          <div className={styles.courseLevel}>
            <span>{c.duration}</span>
          </div>
        )}

        <div className={styles.courseBottom}>
          <div className={styles.coursePrice}>
            {c.price > 0 ? `₹${c.price.toLocaleString()}` : t('lbl_free')}
          </div>
          <span className="btn btn-gold btn-sm">{t('btn_view_course')}</span>
        </div>
      </div>
    </a>
  );
}
