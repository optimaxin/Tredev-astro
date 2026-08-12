import React from 'react';
import { motion } from 'framer-motion';
import { COURSES } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import styles from './Academy.module.css';

export default function Academy() {
  const { setPage, setSelectedId } = useAppContext();

  const handleCourseClick = (id: number) => {
    setSelectedId(id);
    setPage('course-detail');
  };

  return (
    <section className={styles.section} id="academy">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Vedic Academy</span>
          <h2 className={styles.title}>TredevAstro Gurukul</h2>
          <p className={styles.subtitle}>
            Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.
          </p>
        </motion.div>

        {/* Courses Grid */}
        <div className={styles.coursesGrid}>
          {COURSES.map((course, i) => (
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

        {/* Learning Roadmap */}
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
      </div>
    </section>
  );
}
