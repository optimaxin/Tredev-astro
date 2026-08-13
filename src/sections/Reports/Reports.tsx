import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { REPORTS } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import Lightweight3DViewer from '../../components/Lightweight3DViewer/Lightweight3DViewer';
import { 
  CareerIcon, 
  MarriageIcon, 
  PanchangIcon, 
  VastuIcon 
} from '../../components/Icons/Icons';
import styles from './Reports.module.css';

const BUNDLES = [
  { title: 'Report Only', price: 499, desc: 'Full written report delivered in 48 hours', features: ['In-depth analysis', 'PDF format', '40+ pages'] },
  { title: 'Report + Expert Q&A', price: 799, desc: 'Report plus 2 written questions to an astrologer', features: ['Full report', '2 expert questions', '48hr response'], popular: true },
  { title: 'Report + Consultation', price: 1499, desc: 'Full report plus a 20-minute live consultation', features: ['Full report', '20-min video call', 'Recorded session'] },
];

export default function Reports({ featured = false }: { featured?: boolean }) {
  const { setPage, setSelectedId } = useAppContext();
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoveredReport, setHoveredReport] = useState<typeof REPORTS[0] | null>(null);

  const handleReportClick = (id: number) => {
    setSelectedId(id);
    setPage('report-detail');
  };

  const activeColor = hoveredReport ? hoveredReport.color : '#C8A96B';

  return (
    <section className={styles.section} id="reports">
      <div className={styles.container}>
        {/* Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">Personalized Jyotish Reports</span>
            <h2 className="section-title-serif">{featured ? 'Go Deeper with Jyotish' : 'Jyotish Reports'}</h2>
            <p className="section-desc-sans">
              Detailed, manuscript-grade Kundli readings translating cosmic alignment into direct life direction.
            </p>
          </div>
          {featured ? (
            <button
              className="section-explore-link"
              onClick={() => { setPage('reports'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore All Reports →
            </button>
          ) : (
            <div className={styles.sphereWrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Lightweight3DViewer type="report" color={activeColor} />
              <span className={styles.sphereLabel}>Vedic Chart Engine</span>
            </div>
          )}
        </div>


        {/* Report Cards */}
        <div className={styles.reportsGrid}>
          {(featured ? REPORTS.slice(0, 4) : REPORTS).map((report, i) => (
            <motion.div
              key={report.id}
              className={`${styles.reportCard} ${hovered === report.id ? styles.cardHovered : ''} ${report.popular ? styles.cardPopular : ''}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.55 }}
              onMouseEnter={() => {
                setHovered(report.id);
                setHoveredReport(report);
              }}
              onMouseLeave={() => {
                setHovered(null);
                setHoveredReport(null);
              }}
              onClick={() => handleReportClick(report.id)}
              style={{
                '--card-color': report.color,
                cursor: 'pointer',
              } as React.CSSProperties}
            >
              {report.popular && <div className={styles.popularBadge}>Most Popular</div>}

              <div className={styles.reportIcon} style={{ color: report.color, display: 'inline-flex', alignItems: 'center' }}>
                {report.id === 1 && <CareerIcon size={24} />}
                {report.id === 2 && <MarriageIcon size={24} />}
                {report.id === 3 && <PanchangIcon size={24} />}
                {report.id === 4 && <VastuIcon size={24} />}
              </div>

              <div className={styles.reportMeta}>
                <div className={styles.reportCategory}>{report.category}</div>
              </div>

              <h3 className={styles.reportTitle}>{report.title}</h3>
              <p className={styles.reportSubtitle}>{report.subtitle}</p>
              <p className={styles.reportDesc}>{report.description}</p>

              <div className={styles.reportStats}>
                <span>{report.pages} pages</span>
                <span>·</span>
                <span>{report.sections} sections</span>
              </div>

              <div className={styles.reportBottom}>
                <div className={styles.priceWrap}>
                  <span className={styles.price}>₹{report.price}</span>
                  {report.originalPrice && (
                    <span className={styles.originalPrice}>₹{report.originalPrice}</span>
                  )}
                </div>
                <button
                  className={`btn btn-sm ${report.popular ? 'btn-gold' : 'btn-dark'}`}
                  id={`report-get-${report.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportClick(report.id);
                  }}
                >
                  Get Report
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bundles — hidden in featured mode */}
        {!featured && (
          <motion.div
            className={styles.bundlesSection}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className={styles.bundlesHeader}>
              <h3 className={styles.bundlesTitle}>Choose Your Experience</h3>
              <p className={styles.bundlesSubtitle}>Every report can be enhanced with expert access</p>
            </div>

            <div className={styles.bundlesGrid}>
              {BUNDLES.map((bundle, i) => (
                <div
                  key={bundle.title}
                  className={`${styles.bundle} ${bundle.popular ? styles.bundlePopular : ''}`}
                >
                  {bundle.popular && <div className={styles.bundlePopularLabel}>Recommended</div>}
                  <h4 className={styles.bundleName}>{bundle.title}</h4>
                  <p className={styles.bundlePrice}>₹{bundle.price}</p>
                  <p className={styles.bundleDesc}>{bundle.desc}</p>
                  <ul className={styles.bundleFeatures}>
                    {bundle.features.map(f => (
                      <li key={f}>
                        <span className={styles.checkIcon}>✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn btn-full ${bundle.popular ? 'btn-gold' : 'btn-outline-gold'}`}
                    style={{ marginTop: 'auto' }}
                    id={`bundle-${i}`}
                  >
                    Choose This
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}


      </div>
    </section>
  );
}
