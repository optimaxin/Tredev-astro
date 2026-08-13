import React from 'react';
import { motion } from 'framer-motion';
import { COURSES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import styles from './Academy.module.css';

export default function Academy({ featured = false }: { featured?: boolean }) {
  const { setPage, setSelectedId } = useAppContext();

  const handleCourseClick = (id: number) => {
    setSelectedId(id);
    setPage('course-detail');
  };

  return (
    <section className={styles.section} id="academy">
      <div className={styles.container}>
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">Vedic Academy</span>
            <h2 className="section-title-serif">TredevAstro Gurukul</h2>
            <p className="section-desc-sans">
              Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.
            </p>
          </div>
          {featured && (
            <button
              className="section-explore-link"
              onClick={() => { setPage('academy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore All Courses →
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div className={`${styles.coursesGrid} ${featured ? styles.coursesGridFeatured : ''}`}>

          {(featured ? COURSES.slice(0, 3) : COURSES).map((course, i) => (
            <motion.div
              key={course.id}
              className={styles.courseCard}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
              onClick={() => handleCourseClick(course.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Course Visual */}
              <div className={styles.courseTop} style={{ '--course-color': course.color } as React.CSSProperties}>
                <div className={styles.courseIcon} style={{ color: course.color }}>
                  {course.icon}
                </div>
                <div className={styles.courseBadges}>
                  {course.certificate && (
                    <span className={styles.certBadge}>✦ Certificate</span>
                  )}
                </div>
              </div>

              {/* Course Info */}
              <div className={styles.courseBody}>
                <div className={styles.courseCategory}>{course.category}</div>
                <h3 className={styles.courseName}>{course.title}</h3>
                <p className={styles.courseSubtitle}>{course.subtitle}</p>

                {/* Topics */}
                <div className={styles.topics}>
                  {course.topics.slice(0, 3).map(t => (
                    <span key={t} className={styles.topic}>{t}</span>
                  ))}
                </div>

                {/* Stats */}
                <div className={styles.courseStats}>
                  <span className={styles.stars}>★ {course.rating}</span>
                  <span className={styles.statDot} />
                  <span>{course.lessons} lessons</span>
                  <span className={styles.statDot} />
                  <span>{course.weeks} weeks</span>
                </div>

                <div className={styles.courseLevel}>
                  <span>{course.level}</span>
                </div>

                <div className={styles.courseBottom}>
                  <div>
                    <div className={styles.coursePrice}>₹{course.price.toLocaleString()}</div>
                    {course.originalPrice && (
                      <div className={styles.courseOriginal}>₹{course.originalPrice.toLocaleString()}</div>
                    )}
                  </div>
                  <button 
                    className="btn btn-gold btn-sm" 
                    id={`course-enroll-${course.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course.id);
                    }}
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Learning Roadmap — shown only on full Academy page */}
        {!featured && (
          <div className={styles.roadmap}>
            <h3 className={styles.roadmapTitle}>Gurukul Learning Path</h3>
            <div className={styles.roadmapSteps}>
              {['Shastri Basics', 'Kundli Analysis', 'Grahas & Rashis', 'Bhavas & Lords', 'Vimshottari Dasha', 'Gochara Transits', 'Phaladeepika'].map((step, i) => (
                <div key={step} className={styles.step}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <span className={styles.stepLabel}>{step}</span>
                  {i < 6 && <div className={styles.stepLine} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explore All — shown in featured mode */}
        {featured && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <button
              className="btn btn-outline-light"
              onClick={() => { setPage('academy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore Gurukul →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
