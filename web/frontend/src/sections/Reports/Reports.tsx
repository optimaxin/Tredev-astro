import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { contentService } from '../../services/contentService';
import type { AstrologyReport } from '../../services/contentService';
import { useAppContext } from '../../context/AppContext';

// three.js is a heavy dependency (500KB+) needed only for this decorative
// sphere — split it into its own chunk instead of shipping it in the main bundle.
const Lightweight3DViewer = lazy(() => import('../../components/Lightweight3DViewer/Lightweight3DViewer'));
import { 
  CareerIcon, 
  MarriageIcon, 
  PanchangIcon, 
  VastuIcon 
} from '../../components/Icons/Icons';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './Reports.module.css';

// Preset background patterns a staff/admin can pick for a report's cover
// without uploading an image — plain CSS gradients, same keys the admin
// editor's dropdown writes to `coverPattern` (see ReportsPage.tsx).
export const COVER_PATTERNS: Record<string, string> = {
  dots: 'radial-gradient(rgba(199,161,90,0.35) 1.5px, transparent 1.5px)',
  stripes: 'repeating-linear-gradient(45deg, rgba(199,161,90,0.18) 0 10px, transparent 10px 20px)',
  grid: 'linear-gradient(rgba(199,161,90,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(199,161,90,0.2) 1px, transparent 1px)',
  waves: 'repeating-radial-gradient(circle at 0 0, transparent 0, rgba(199,161,90,0.15) 18px)',
};

const BUNDLES = [
  { id: 1, price: 499 },
  { id: 2, price: 799, popular: true },
  { id: 3, price: 1499 },
];

export default function Reports({ featured = false }: { featured?: boolean }) {
  const { setPage, setSelectedId, t } = useAppContext();
  const [REPORTS, setReports] = useState<AstrologyReport[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoveredReport, setHoveredReport] = useState<AstrologyReport | null>(null);

  useEffect(() => {
    contentService.listReports().then(setReports).catch(() => setReports([]));
  }, []);

  const handleReportClick = (id: number) => {
    setSelectedId(id);
    setPage('report-detail');
  };

  const activeColor = hoveredReport ? hoveredReport.color : '#C8A96B';

  if (!REPORTS.length) return null;

  return (
    <section className={styles.section} id="reports">
      <CelestialBackdrop variant="rashi" intensity="medium" parallax />
      <div className={styles.container}>
        {/* Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('section_reports_title')}</h2>
            <p className="section-desc-sans">
              {t('section_reports_desc')}
            </p>
          </div>
          {featured ? (
            <button
              className="section-explore-link"
              onClick={() => { setPage('reports'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              {t('cta_explore_reports')} →
            </button>
          ) : (
            <div className={styles.sphereWrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Suspense fallback={null}>
                <Lightweight3DViewer type="report" color={activeColor} />
              </Suspense>
              <span className={styles.sphereLabel}>Vedic Chart Engine</span>
            </div>
          )}
        </div>


        {/* Premium Report entry point. Lives on the Reports page because
            that is where someone looking for a report already is — not as a
            separate destination competing with the catalogue below. */}
        <button
          type="button"
          className={styles.premiumBanner}
          onClick={() => { setPage('premium-report'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        >
          <span className={styles.premiumBannerBody}>
            <span className={styles.premiumBannerEyebrow}>{t('premium_banner_eyebrow')}</span>
            <span className={styles.premiumBannerTitle}>{t('premium_banner_title')}</span>
            <span className={styles.premiumBannerText}>
              {t('premium_banner_text')}
            </span>
          </span>
          <span className={styles.premiumBannerCta}>{t('premium_banner_cta')} →</span>
        </button>

        {/* Report Cards */}
        <div className={styles.reportsGrid} id="reports-grid">
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
                '--card-color': report.coverColor || report.color,
                cursor: 'pointer',
                ...(report.coverImage ? {
                  backgroundImage: `linear-gradient(rgba(17,23,44,0.55), rgba(17,23,44,0.55)), url(${report.coverImage})`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                } : report.coverPattern && report.coverPattern !== 'none' ? {
                  backgroundImage: COVER_PATTERNS[report.coverPattern],
                } : {}),
              } as React.CSSProperties}
            >
              {report.popular && <div className={styles.popularBadge}>{t('badge_most_popular')}</div>}

              <div className={styles.reportIcon} style={{ color: report.coverColor || report.color, display: 'inline-flex', alignItems: 'center' }}>
                {report.id === 1 && <CareerIcon size={42} />}
                {report.id === 2 && <MarriageIcon size={42} />}
                {report.id === 3 && <PanchangIcon size={42} />}
                {report.id === 4 && <VastuIcon size={42} />}
              </div>

              <div className={styles.reportMeta}>
                <div className={styles.reportCategory}>
                  {t('cat_' + report.category.toLowerCase().replace(' ', '_')) || report.category}
                </div>
              </div>

              <h3 className={styles.reportTitle}>{t('report_' + report.id + '_title') || report.title}</h3>
              <p className={styles.reportSubtitle}>{t('report_' + report.id + '_sub') || report.subtitle}</p>
              <p className={styles.reportDesc}>{t('report_' + report.id + '_desc') || report.description}</p>

              <div className={styles.reportStats}>
                <span>{report.pages} {t('lbl_pages')}</span>
                <span>·</span>
                <span>{report.sections} {t('lbl_sections')}</span>
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
                  {t('btn_view_details')}
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
              <h3 className={styles.bundlesTitle}>{t('bundles_title')}</h3>
              <p className={styles.bundlesSubtitle}>{t('bundles_subtitle')}</p>
            </div>

            <div className={styles.bundlesGrid}>
              {BUNDLES.map((bundle, i) => (
                <div
                  key={bundle.id}
                  className={`${styles.bundle} ${bundle.popular ? styles.bundlePopular : ''}`}
                >
                  {bundle.popular && <div className={styles.bundlePopularLabel}>{t('label_recommended')}</div>}
                  <h4 className={styles.bundleName}>{t(`bundle_${bundle.id}_title`)}</h4>
                  <p className={styles.bundlePrice}>₹{bundle.price}</p>
                  <p className={styles.bundleDesc}>{t(`bundle_${bundle.id}_desc`)}</p>
                  <ul className={styles.bundleFeatures}>
                    {[1, 2, 3].map(n => (
                      <li key={n}>
                        <span className={styles.checkIcon}>✓</span> {t(`bundle_${bundle.id}_feature${n}`)}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn btn-full ${bundle.popular ? 'btn-gold' : 'btn-outline-gold'}`}
                    style={{ marginTop: 'auto' }}
                    id={`bundle-${i}`}
                    onClick={() => {
                      // These tiers aren't tied to one specific report — the
                      // actual report-only/+Q&A/+consult purchase (with real,
                      // report-specific pricing) happens on ReportDetailPage,
                      // so a mere in-page scroll never felt like it "did"
                      // anything. This opens that flow directly on the
                      // catalog's first report, same as clicking any report
                      // card — a real navigation, not just a scroll.
                      handleReportClick(REPORTS[0].id);
                    }}
                  >
                    {t('btn_choose_this')}
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
