import React, { useEffect, useMemo, useRef, useState } from 'react';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import type { PremiumReport, ReportSection } from '../../services/premiumReportService';
import { renderReportMarkdown } from '../../utils/reportMarkdown';
import { generateBrandedPdf } from '../../utils/brandedPdf';
import { BirthChartPlate, SectionVisual, VargaAppendix } from './charts/ChartVisuals';
import { buildReportEntries } from './reportEntries';
import PremiumReportPrintLayout from './PremiumReportPrintLayout';
import styles from './PremiumReportViewer.module.css';

// The Premium Report as a reader sees it, shared by the main site's viewer
// and the standalone Premium app. It takes an already-loaded, already-
// authorised report and has no app context of its own: loading, sign-in and
// navigation belong to whichever app hosts it (passed in as callbacks).
//
// Content rules (unchanged from the original viewer): sections render in the
// order the backend returned them, with their own titles and sanitized
// Markdown; nothing is summarized, rewritten or hidden; an unfinished
// section says so in place. Charts are drawn only from report.chart — the
// Kundli Engine chart Stage 6 wrote the report from — and sit beside the
// reading they relate to, never instead of it.

const READABLE_STATUS: Record<string, string> = {
  pending: 'Not yet written',
  generating: 'Being written now',
  invalid: 'Held back for review',
  failed: 'Could not be written',
  skipped: 'Not applicable to this chart',
};

function isReadable(section: ReportSection): boolean {
  return section.status === 'completed' && !!section.content && section.content.trim().length > 0;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

const sanitizeFileName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '').trim() || 'Premium';

export interface PremiumReportDocumentProps {
  report: PremiumReport;
  /** Used when the report's own ledger has no subject name. */
  fallbackName?: string;
  onOpenList: () => void;
  onOpenStatus: () => void;
  /** Where "Back to TredevaAstro" goes: an internal page or an external link. */
  home: { label: string; onClick?: () => void; href?: string };
}

type PdfState = { phase: 'idle' } | { phase: 'generating'; pct: number } | { phase: 'error'; message: string };

export default function PremiumReportDocument({ report, fallbackName, onOpenList, onOpenStatus, home }: PremiumReportDocumentProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [pdf, setPdf] = useState<PdfState>({ phase: 'idle' });
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const printRef = useRef<HTMLDivElement | null>(null);

  const sections = useMemo(() => report.sections ?? [], [report]);
  const entries = useMemo(() => buildReportEntries(report), [report]);
  const readableCount = useMemo(() => sections.filter(isReadable).length, [sections]);
  const subjectName = report.subject?.name || fallbackName || '';
  const incomplete = report.status !== 'completed';

  // Active-entry tracking: the "active" line sits near the top of the
  // viewport so the highlighted entry is the one being read.
  useEffect(() => {
    if (!entries.length) return;
    const observer = new IntersectionObserver(
      list => {
        const visible = list.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.getAttribute('data-entry-key'));
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  const goTo = (key: string) => {
    setTocOpen(false);
    const el = sectionRefs.current[key];
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
    setActiveId(key);
  };

  // ── PDF ─────────────────────────────────────────────────────────────────
  // Generated in the browser from the report already on screen, by the same
  // engine as the free Kundli PDF. It reads only the off-screen layout below
  // — no request is made — so a failure here leaves the report untouched and
  // can be retried freely; it can never start a new (paid) generation run.
  useEffect(() => {
    if (pdf.phase !== 'generating') return;
    let cancelled = false;
    (async () => {
      try {
        // Let the off-screen layout mount, and its web fonts and images
        // finish loading, before the first capture.
        await new Promise(r => requestAnimationFrame(() => r(null)));
        if (document.fonts?.ready) await document.fonts.ready;
        const root = printRef.current;
        if (!root) throw new Error('print layout did not mount');
        await Promise.all(Array.from(root.querySelectorAll('img')).map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = () => r(null); })));
        if (cancelled) return;
        const title = subjectName ? `${subjectName.length > 28 ? `${subjectName.slice(0, 27)}…` : subjectName}'s Premium Report` : 'Premium Report';
        const result = await generateBrandedPdf({
          root,
          headerTitle: title,
          fileName: `${sanitizeFileName(subjectName)}_Premium_Report.pdf`,
          onProgress: (done, total) => { if (!cancelled) setPdf({ phase: 'generating', pct: total ? Math.round((done / total) * 100) : 0 }); },
          isCancelled: () => cancelled,
        });
        if (!cancelled && result === 'saved') setPdf({ phase: 'idle' });
      } catch (e) {
        console.error('Premium Report PDF failed:', e);
        if (!cancelled) setPdf({ phase: 'error', message: 'Couldn’t create the PDF. Your report is unaffected — please try again.' });
      }
    })();
    return () => { cancelled = true; };
    // Re-run only on a fresh request, not on every progress tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf.phase === 'generating']);

  const generating = pdf.phase === 'generating';
  const pdfButton = (
    <button type="button" className="btn btn-outline-gold btn-sm" onClick={() => setPdf({ phase: 'generating', pct: 0 })} disabled={generating} aria-busy={generating} data-testid="download-pdf">
      {generating ? `Preparing PDF… ${pdf.pct}%` : 'Download PDF'}
    </button>
  );
  const homeButton = home.href
    ? <a className="btn btn-outline-gold btn-sm" href={home.href}>{home.label}</a>
    : <button type="button" className="btn btn-outline-gold btn-sm" onClick={home.onClick}>{home.label}</button>;

  return (
    <div className={styles.viewer}>
      {/* ── Cover ───────────────────────────────────────────────────── */}
      <header className={styles.cover}>
        <CelestialOrnament type="mandala" className={styles.coverOrnament} animate />
        <p className={styles.coverBrand}>TredevaAstro</p>
        <p className={styles.coverKicker}>Premium Astrology Report</p>
        <h1 className={styles.coverTitle}>{subjectName ? `${subjectName}’s Birth Chart Reading` : 'Your Birth Chart Reading'}</h1>

        <dl className={styles.coverMeta}>
          {(report.chart?.birth?.date || report.subject?.date) && <div><dt>Born</dt><dd>{report.chart?.birth?.date ?? report.subject?.date}</dd></div>}
          {report.chart?.birth?.time && <div><dt>Time</dt><dd>{report.chart.birth.time}</dd></div>}
          {(report.chart?.birth?.place || report.subject?.place) && <div><dt>Place</dt><dd>{report.chart?.birth?.place ?? report.subject?.place}</dd></div>}
          {report.chart?.lagna?.rashi && <div><dt>Lagna</dt><dd>{report.chart.lagna.rashi}</dd></div>}
          <div><dt>Sections</dt><dd>{readableCount} of {sections.length}</dd></div>
          {report.created_at && <div><dt>Prepared</dt><dd>{formatDate(report.created_at)}</dd></div>}
        </dl>

        <div className={styles.coverActions}>
          {pdfButton}
          <button type="button" className="btn btn-outline-gold btn-sm" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn btn-outline-gold btn-sm" onClick={onOpenList}>My Premium Reports</button>
          {homeButton}
        </div>
        {pdf.phase === 'error' && <p className={styles.pdfError} role="alert">{pdf.message}</p>}
      </header>

      {incomplete && (
        <div className={styles.incompleteBanner} role="status">
          <strong>{report.status === 'partial' ? 'This report is partly complete.' : `This report is ${report.status}.`}</strong>
          <span>{readableCount} of {sections.length} sections are written. Sections that aren’t finished are marked below rather than left out.</span>
          <button type="button" className={styles.inlineLink} onClick={onOpenStatus}>View generation status</button>
        </div>
      )}

      <div className={styles.body}>
        {/* ── Table of contents ─────────────────────────────────────── */}
        <nav className={`${styles.toc} ${tocOpen ? styles.tocOpen : ''}`} aria-label="Report sections">
          <div className={styles.tocHeader}>
            <h2 className={styles.tocTitle}>Contents</h2>
            <button type="button" className={styles.tocClose} onClick={() => setTocOpen(false)} aria-label="Close contents">×</button>
          </div>
          <ol className={styles.tocList}>
            {entries.map(e => (
              <li key={e.key}>
                <button
                  type="button"
                  className={`${styles.tocLink} ${activeId === e.key ? styles.tocLinkActive : ''} ${e.kind === 'section' && !isReadable(e.section) ? styles.tocLinkMuted : ''}`}
                  onClick={() => goTo(e.key)}
                  aria-current={activeId === e.key ? 'true' : undefined}
                  data-entry-kind={e.kind}
                >
                  <span className={styles.tocNumber}>{e.number !== null ? String(e.number).padStart(2, '0') : '✦'}</span>
                  <span className={styles.tocText}>{e.title}</span>
                  {e.kind === 'section' && !isReadable(e.section) && <span className={styles.tocBadge}>{READABLE_STATUS[e.section.status] ?? e.section.status}</span>}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* ── Entries, in reading order ─────────────────────────────── */}
        <main className={styles.content}>
          {entries.map(e => {
            if (e.kind === 'birth-chart') {
              return (
                <div key={e.key} data-entry-key={e.key} ref={el => { sectionRefs.current[e.key] = el; }} className={styles.plateAnchor}>
                  <BirthChartPlate chart={report.chart} />
                </div>
              );
            }
            if (e.kind === 'appendix') {
              return (
                <div key={e.key} data-entry-key={e.key} ref={el => { sectionRefs.current[e.key] = el; }} className={styles.plateAnchor}>
                  <VargaAppendix chart={report.chart} />
                </div>
              );
            }
            const section = e.section;
            return (
              <article
                key={e.key}
                id={`section-${section.section_id}`}
                data-entry-key={e.key}
                ref={el => { sectionRefs.current[e.key] = el; }}
                className={styles.section}
              >
                <header className={styles.sectionHeader}>
                  <span className={styles.sectionNumber}>{String(e.number).padStart(2, '0')}</span>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                </header>

                {isReadable(section) ? (
                  <>
                    {/* Real chart data for this reading, above its prose. */}
                    <SectionVisual sectionId={section.section_id} chart={report.chart} />
                    {/* Sanitized in reportMarkdown.ts — parsed as Markdown, then DOMPurify with a tag allowlist. */}
                    <div className={styles.prose} dangerouslySetInnerHTML={{ __html: renderReportMarkdown(section.content) }} />
                    {section.key_points && section.key_points.length > 0 && (
                      <aside className={styles.keyPoints}>
                        <h3 className={styles.keyPointsTitle}>Key points</h3>
                        <ul>{section.key_points.map((p, k) => <li key={k}>{p}</li>)}</ul>
                      </aside>
                    )}
                    {section.unavailable_factors && section.unavailable_factors.length > 0 && (
                      <aside className={styles.unavailable}>
                        <h3 className={styles.unavailableTitle}>Not available for this chart</h3>
                        <ul>{section.unavailable_factors.map((f, k) => <li key={k}>{f}</li>)}</ul>
                      </aside>
                    )}
                  </>
                ) : (
                  <div className={styles.sectionPlaceholder}>
                    <span className={styles.sectionPlaceholderBadge}>{READABLE_STATUS[section.status] ?? section.status}</span>
                    <p>
                      {section.status === 'skipped'
                        ? 'This section doesn’t apply to your chart, so it was not written.'
                        : section.status === 'generating' || section.status === 'pending'
                          ? 'This section hasn’t been written yet.'
                          : 'This section could not be completed. The rest of your report is unaffected.'}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          <footer className={styles.reportFooter}>
            <p className={styles.footerNote}>
              This report is a traditional astrological reading prepared from your birth chart. It is offered for reflection and
              guidance, and is not a substitute for professional medical, legal or financial advice.
            </p>
            <div className={styles.footerActions}>
              {pdfButton}
              {homeButton}
            </div>
          </footer>
        </main>
      </div>

      <button type="button" className={styles.tocFab} onClick={() => setTocOpen(o => !o)} aria-expanded={tocOpen} aria-label={tocOpen ? 'Hide contents' : 'Show contents'}>
        Contents
      </button>
      {tocOpen && <div className={styles.tocScrim} onClick={() => setTocOpen(false)} aria-hidden="true" />}

      {/* Off-screen PDF layout — mounted only while a PDF is being made.
          Laid out at normal (0,0) coordinates inside a zero-size clipping
          wrapper, the same technique KundliSection uses: html2canvas
          misbehaves with content pushed far off-screen. */}
      {generating && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
          <div ref={printRef}>
            <PremiumReportPrintLayout report={report} name={subjectName} />
          </div>
        </div>
      )}
    </div>
  );
}
