import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { HOUSE_MEANINGS } from '../../data/mockData';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { toSavedBirthDetails } from '../../utils/birthDetails';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { KundliFullResult, KundliResult, DailyHoroscopeResult } from '../../services/calculatorService';
import { VARGA_LABELS } from '../../services/calculatorService';
import { kundliHistoryService } from '../../services/kundliHistoryService';
import type { KundliHistoryEntry } from '../../services/kundliHistoryService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import { PLANET_META } from '../../data/planetMeta';
import PlanetIcon from '../../components/PlanetIcon/PlanetIcon';
import {
  RashiChakraIcon, ConstellationIcon, AcharyaIcon, WealthIcon, VastuIcon, ClockIcon,
  SunIcon, MoonIcon, SunsetIcon, LotusIcon, CheckCircleIcon, DoshaShieldIcon,
} from '../../components/Icons/Icons';
import { NorthIndianChart, SouthIndianChart, cap, ordinal, teaser, toChartPlanets, toSimpleChartPlanets, toChandraChartPlanets } from './KundliCharts';
import type { ChartPlanet } from './KundliCharts';
import KundliPrintLayout from './KundliPrintLayout';
import styles from './KundliSection.module.css';

// Every chart selectable in the Charts tab — D1/Chandra carry real ecliptic
// degrees (they're the same underlying placements, just re-housed); the
// D2-D60 varga charts only ever resolve to a final sign, so no degree is
// shown for those rather than fabricating one.
// Main 8 first (this exact order is the highlighted quick-pick row below),
// then the rest of the divisional charts in ascending order, with the
// alternate Bhav Chalit chart last. D1 stays positioned by whole-sign house
// (matching every real reference chart, this app's own AstroTalk comparison
// included) — a real Bhav-repositioned D1 was tried and reverted, since two
// planets sharing a sign can have different real bhav numbers, so a single
// wedge can't consistently represent "one bhav." The separate Bhav Chalit
// tile is where wedges are actually positioned by real cuspal house.
const CHART_KEYS = ['D1', 'CHANDRA', 'D9', 'D4', 'D6', 'D7', 'D10', 'D60', 'D2', 'D3', 'D5', 'D8', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'BHAV_CHALIT'] as const;
const CHART_LABELS: Record<string, string> = {
  D1: 'D1 — Rashi (Birth Chart)', BHAV_CHALIT: 'Bhav Chalit (Real KP Cusps)', CHANDRA: 'Chandra (Moon) Chart', D9: 'D9 — Navamsa (Marriage)',
};

// Consolidated from an earlier 9-tab layout (Overview/Charts/Dasha/
// Strength/KP/Ashtakvarga/Predictions/Remedies/Doshas) — 9 top-level tabs
// read as overwhelming/confusing, and 3 of them (Strength/KP/Ashtakvarga)
// are dense classical-scoring detail most casual users never need. Timeline
// absorbs Dasha+Doshas (both are "what's happening/will happen in life");
// Advanced absorbs the 3 technical tabs behind one clearly-labeled, opt-in
// destination instead of competing for attention in the main tab bar.
const TABS = [
  { key: 'overview', label: 'Kundli' },
  { key: 'charts', label: 'Charts' },
  { key: 'gochar', label: 'Gochar' },
  { key: 'timeline', label: 'Timeline & Doshas' },
  { key: 'predictions', label: 'Predictions' },
  { key: 'remedies', label: 'Remedies' },
  { key: 'advanced', label: 'Advanced' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TAB_ICONS: Record<TabKey, React.ComponentType<{ size?: number }>> = {
  overview: RashiChakraIcon,
  gochar: ConstellationIcon,
  charts: ConstellationIcon,
  timeline: ClockIcon,
  predictions: AcharyaIcon,
  remedies: WealthIcon,
  advanced: VastuIcon,
};

// Fixed classical sign-lord assignments — same universal fact used
// throughout Vedic astrology, safe to keep as a static lookup here (not
// computed logic that could drift from the backend's own copy).
const RASHI_LORD_BY_NAME: Record<string, string> = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury',
  Libra: 'venus', Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

// Panchang sunrise/sunset come back as UTC ISO instants — shift by the
// birth's timezone offset to show the actual local clock time, matching how
// a printed Panchang always states sunrise/sunset in local time.
function formatLocalTime(isoUtc: string, timezoneOffsetMinutes: number): string {
  const utcMs = new Date(isoUtc).getTime();
  const localMs = utcMs - timezoneOffsetMinutes * 60_000;
  const d = new Date(localMs);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Converts any divisional-chart shape (Navamsa or the D2-D60 varga charts —
// which only carry a final sign + house, not the birth-degree D1 tracks)
// into the same ChartPlanet shape the visual chart renders, so every
// divisional chart gets an actual diagram, not just a text list.
export default function KundliSection() {
  const { birthProfile, setBirthProfile, setKundliGenerated, currentUser, isLoggedIn, saveBirthDetails, setPage, pendingAction, setPendingAction, setShowLoginModal } = useAppContext();
  const [fullResult, setFullResult] = useState<KundliFullResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<BirthDetailsSubmitValue | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [zoomedChart, setZoomedChart] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [pdfState, setPdfState] = useState<'idle' | 'generating'>('idle');
  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(null);
  const [autoDownloadPending, setAutoDownloadPending] = useState(false);
  const [history, setHistory] = useState<KundliHistoryEntry[]>([]);
  const [gocharLagna, setGocharLagna] = useState<DailyHoroscopeResult | null>(null);
  const [gocharMoon, setGocharMoon] = useState<DailyHoroscopeResult | null>(null);
  const [gocharError, setGocharError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const kundliResult = fullResult?.kundli ?? null;
  const chartPlanets = kundliResult ? toChartPlanets(kundliResult, fullResult?.bhavChalit) : [];

  // Shared by the D1/D9 featured row, the "all charts" tile grid, and the
  // zoom modal — one place that knows how to turn any chart key into
  // {planets, ascendantRashi}, instead of duplicating that branch 3 times.
  function resolveChart(key: string): { planets: ChartPlanet[]; ascendantRashi: string } {
    if (!fullResult) return { planets: [], ascendantRashi: '' };
    if (key === 'D1') return { planets: chartPlanets, ascendantRashi: kundliResult?.ascendant.rashi ?? '' };
    if (key === 'CHANDRA') return { planets: toChandraChartPlanets(fullResult.chandraChart), ascendantRashi: fullResult.chandraChart.moonRashi };
    if (key === 'BHAV_CHALIT') {
      const planets = toSimpleChartPlanets(fullResult.bhavChalit);
      return { planets, ascendantRashi: planets.find(p => p.id === 'asc')?.sign ?? '' };
    }
    if (key === 'D9') return { planets: toSimpleChartPlanets(fullResult.navamsaChart), ascendantRashi: fullResult.navamsaChart.ascendant.rashi };
    const varga = fullResult.vargaCharts[key];
    if (varga) return { planets: toSimpleChartPlanets(varga), ascendantRashi: varga.ascendant.rashi };
    return { planets: [], ascendantRashi: '' };
  }

  const savedBirthDetails = toSavedBirthDetails(currentUser);
  const alreadySavedThisProfile = !!(currentUser?.birthDate && submittedDetails && currentUser.birthDate === submittedDetails.date);

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    try {
      const result = await calculatorService.kundliFull(details);
      setFullResult(result);
      setSubmittedDetails(details);
      setSaveState('idle');
      setBirthProfile({ ...birthProfile, name: details.name, dob: details.date, tob: details.time, place: details.placeName });
      setKundliGenerated(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Logged-in users get every generated kundli saved to their history
      // automatically — only the birth-detail inputs, never the computed
      // result (see kundliHistoryService.ts header comment for why).
      // Fire-and-forget: a failed save shouldn't block showing the chart.
      const accessToken = localStorage.getItem('auth_access_token');
      if (accessToken) {
        kundliHistoryService
          .save(accessToken, { name: details.name, date: details.date, time: details.time, timezoneOffsetMinutes: details.timezoneOffsetMinutes, latitude: details.latitude, longitude: details.longitude, placeLabel: details.placeName })
          .then(entry => setHistory(prev => [entry, ...prev]))
          .catch(() => {});
      }
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not generate your Kundli. Please try again.');
    }
  };

  // Load the logged-in user's saved kundlis for the "My Kundlis" picker on
  // the form view.
  useEffect(() => {
    if (!isLoggedIn) { setHistory([]); return; }
    const accessToken = localStorage.getItem('auth_access_token');
    if (!accessToken) return;
    kundliHistoryService.list(accessToken).then(setHistory).catch(() => {});
  }, [isLoggedIn]);

  // Resume a PDF download after an anonymous user was sent to log in (see
  // handleDownloadPdfClick below) — the exact submitted birth details are
  // stashed in sessionStorage since AuthPage clears `pendingAction` in the
  // same tick it navigates back here, before this component could read it.
  useEffect(() => {
    if (!isLoggedIn) return;
    const raw = sessionStorage.getItem('kundliPdfResume');
    if (!raw) return;
    sessionStorage.removeItem('kundliPdfResume');
    try {
      const details = JSON.parse(raw) as BirthDetailsSubmitValue;
      setAutoDownloadPending(true);
      handleSubmit(details);
    } catch {
      // Malformed/stale payload — nothing to resume.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Once the resumed generation lands, actually trigger the download.
  useEffect(() => {
    if (autoDownloadPending && fullResult) {
      setAutoDownloadPending(false);
      setPdfState('generating');
    }
  }, [autoDownloadPending, fullResult]);

  // Gochar tab — real current transits for THIS person's own chart, read
  // both ways classical Gochar predictions are conventionally done: from
  // the natal Lagna and from the natal Moon. Reuses the same real,
  // already-verified daily-transit endpoint the Horoscope page uses —
  // no new computation, just anchored to this person's actual placements
  // instead of a manually-picked rashi. Fetched lazily on first visit to
  // the tab, not on every kundli generation.
  useEffect(() => {
    if (activeTab !== 'gochar' || !kundliResult || gocharLagna) return;
    setGocharError('');
    const moonRashi = kundliResult.planets.find(p => p.id === 'moon')?.rashi;
    Promise.all([
      calculatorService.dailyHoroscope(kundliResult.ascendant.rashi),
      moonRashi ? calculatorService.dailyHoroscope(moonRashi) : Promise.resolve(null),
    ])
      .then(([lagna, moon]) => { setGocharLagna(lagna); setGocharMoon(moon); })
      .catch(err => setGocharError(err instanceof CalculatorApiError ? err.message : 'Could not load today\'s Gochar.'));
  }, [activeTab, kundliResult, gocharLagna]);

  const handleDownloadPdfClick = () => {
    setError('');
    if (!isLoggedIn) {
      if (submittedDetails) sessionStorage.setItem('kundliPdfResume', JSON.stringify(submittedDetails));
      setPendingAction('kundli-pdf');
      setShowLoginModal(true);
      return;
    }
    setPdfState('generating');
  };

  const handleHistorySelect = (entry: KundliHistoryEntry) => {
    handleSubmit({
      name: entry.name,
      date: entry.date,
      time: entry.time,
      timezoneOffsetMinutes: entry.timezoneOffsetMinutes,
      latitude: entry.latitude,
      longitude: entry.longitude,
      placeName: entry.placeLabel || '',
    });
  };

  const handleSaveBirthDetails = async () => {
    if (!submittedDetails) return;
    setSaveState('saving');
    const ok = await saveBirthDetails({
      birthDate: submittedDetails.date,
      birthTime: submittedDetails.time,
      birthPlace: submittedDetails.placeName,
      birthLatitude: submittedDetails.latitude,
      birthLongitude: submittedDetails.longitude,
      birthTimezoneOffsetMinutes: submittedDetails.timezoneOffsetMinutes,
    });
    setSaveState(ok ? 'saved' : 'error');
  };

  // Client-side capture of the hidden KundliPrintLayout (see that file's
  // header comment for why this reuses the same NorthIndianChart component
  // rather than a server-side renderer). html2canvas/jsPDF are dynamically
  // imported so their ~250-300KB never loads for users who never click this.
  //
  // The print layout is only mounted (below, gated on pdfState==='generating')
  // for this brief capture window, not permanently whenever a kundli is
  // shown — it used to sit in the DOM at all times, which a page-usability
  // scan flagged as a wall of sub-12px hidden text (aria-hidden isn't
  // respected by every such tool). This effect fires once printRef.current
  // actually exists, i.e. after that transient mount has committed.
  //
  // Captures each top-level block (marked data-pdf-block in
  // KundliPrintLayout) as its OWN canvas and places each as a whole onto the
  // PDF, starting a fresh page whenever the next block wouldn't fit in what's
  // left of the current one. The previous version captured the entire
  // flowing document as ONE giant image and mechanically sliced it into
  // fixed-height page chunks — with zero awareness of where a table row or
  // paragraph actually was, so content routinely got cut in half right at
  // the slice boundary. Also adds a hard timeout: if generation ever hangs
  // (whatever the cause), the button unstucks itself instead of needing a
  // manual page refresh.
  useEffect(() => {
    if (pdfState !== 'generating' || !fullResult || !printRef.current) return;
    let settled = false;
    // The print layout now runs to ~20 chart pages plus dozens of prediction
    // cards (a full report, not a condensed summary) — 70-90 individual
    // html2canvas captures. 60s was tuned for the old ~15-block version and
    // is now a real risk of firing on a slow machine before a legitimately
    // still-running capture finishes.
    const safetyTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setPdfState('idle');
      setPdfProgress(null);
      setError('PDF generation took too long — please try again.');
    }, 180000);

    (async () => {
      try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

        // Loaded once and drawn directly by jsPDF on every page (rather than
        // as an HTML overlay behind the content) — an HTML watermark only
        // ever covered one page when the whole document was one big capture,
        // and disappears entirely now that each section is captured on its
        // own (see the block loop below): an absolutely-positioned overlay
        // living outside a block's own DOM subtree is never included in
        // that block's capture. Drawing it straight onto the PDF guarantees
        // exactly one per page regardless of how sections fall across pages.
        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = '/logo.png';
        }).catch(() => null);

        const root = printRef.current!;
        const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-block]'));
        setPdfProgress({ done: 0, total: blocks.length });

        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 28;
        const footerSpace = 24;
        const usableWidth = pageWidth - margin * 2;
        const contentBottom = pageHeight - margin - footerSpace;
        const blockGap = 14;

        let cursorY = margin;
        let pageNum = 1;

        // A faint mark anchored at the top of the page (a letterhead-style
        // watermark, not a full-page tile) — drawn first, so every block
        // placed afterward sits visually "on top of" it. Wrapped in its own
        // try/catch: this is a cosmetic nice-to-have, and it must never be
        // able to take down PDF generation as a whole if the opacity/GState
        // call or the image draw fails for any reason.
        const drawWatermark = () => {
          if (!logoImg) return;
          try {
            const size = 210;
            pdf.saveGraphicsState();
            pdf.setGState(pdf.GState({ opacity: 0.055 }));
            pdf.addImage(logoImg, 'PNG', (pageWidth - size) / 2, margin + 6, size, size);
            pdf.restoreGraphicsState();
          } catch (e) {
            console.error('Watermark draw failed, continuing without it:', e);
          }
        };

        const drawFooter = () => {
          pdf.setFontSize(8);
          pdf.setTextColor(150, 140, 120);
          pdf.text('TredevAstro — Your Sky. Your Story.', margin, pageHeight - margin + 12);
          pdf.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - margin + 12, { align: 'right' });
        };

        drawWatermark();

        // Charts and prediction cards are batched several-per-block (a grid
        // captured as one image) rather than one-per-block — brings this
        // down to ~25-35 captures for the full report instead of ~70-90.
        // scale:1.5 (still print-crisp — a block isn't meaningfully sharper
        // at 2x once placed at print size on an A4 page) and logging:false
        // trim per-capture cost further.
        //
        // Each block's capture is wrapped on its own: one block throwing
        // (a chart with a rendering quirk, a transient canvas failure) used
        // to abort the entire PDF after however much time had already been
        // spent on everything before it. Now it's logged and skipped —
        // worst case, one section is missing from an otherwise-complete PDF
        // instead of the whole generation failing.
        for (let i = 0; i < blocks.length; i++) {
          const el = blocks[i];
          let canvas: HTMLCanvasElement;
          try {
            canvas = await html2canvas(el, { scale: 1.5, backgroundColor: '#FAF7F0', logging: false });
          } catch (e) {
            console.error(`PDF block ${i + 1}/${blocks.length} failed to capture, skipping:`, e);
            setPdfProgress({ done: i + 1, total: blocks.length });
            continue;
          }
          const imgHeight = (canvas.height * usableWidth) / canvas.width;
          const imgData = canvas.toDataURL('image/png');
          setPdfProgress({ done: i + 1, total: blocks.length });

          if (imgHeight <= contentBottom - margin) {
            // Normal case: the whole block goes on one page, whole — this is
            // what guarantees nothing is ever cut mid-way through.
            if (cursorY !== margin && cursorY + imgHeight > contentBottom) {
              drawFooter();
              pdf.addPage();
              pageNum += 1;
              cursorY = margin;
              drawWatermark();
            }
            pdf.addImage(imgData, 'PNG', margin, cursorY, usableWidth, imgHeight);
            cursorY += imgHeight + blockGap;
          } else {
            // Rare oversized block (e.g. the full Mahadasha timeline is
            // taller than one whole page on its own) — the one case allowed
            // to split across pages, via jsPDF's own negative-offset
            // repeated-image technique, rather than silently overflowing.
            if (cursorY !== margin) {
              drawFooter();
              pdf.addPage();
              pageNum += 1;
              cursorY = margin;
              drawWatermark();
            }
            let heightLeft = imgHeight;
            let position = margin;
            const pageContentHeight = contentBottom - margin;
            pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
            heightLeft -= pageContentHeight;
            while (heightLeft > 0) {
              position -= pageContentHeight;
              drawFooter();
              pdf.addPage();
              pageNum += 1;
              drawWatermark();
              pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
              heightLeft -= pageContentHeight;
            }
            cursorY = contentBottom; // force the next block onto a fresh page
          }
        }
        drawFooter();
        pdf.save(`${birthProfile.name || 'kundli'}-janam-kundli.pdf`);
      } catch (e) {
        console.error('PDF generation failed:', e);
        setError('Could not generate the PDF — please try again.');
      } finally {
        window.clearTimeout(safetyTimer);
        setPdfProgress(null);
        if (!settled) { settled = true; setPdfState('idle'); }
      }
    })();

    return () => window.clearTimeout(safetyTimer);
  }, [pdfState, fullResult, birthProfile.name]);

  return (
    <section className={styles.section} id="kundli">
      <CelestialBackdrop variant="kundli" intensity="medium" />
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {!fullResult ? (
            <motion.div
              key="form"
              className={styles.formWrap}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {/* Section Header */}
              <div className={styles.header}>
                <span className="section-eyebrow">Janam Kundli</span>
                <h1 className={styles.sectionTitle}>Apni Janam Kundli Banayein</h1>
                <div className={styles.divider}>✦ ❖ ✦</div>
                <p className={styles.subtitle}>
                  Your birth chart is the blueprint of your soul's journey. Enter your exact birth coordinates
                  to map your Grahas, Bhavas, and Nakshatras.
                </p>
              </div>

              {isLoggedIn && history.length > 0 && (
                <div className={styles.overview} style={{ maxWidth: 700, margin: '0 auto var(--space-8)', textAlign: 'left' }}>
                  <h2 className={styles.overviewTitle}>My Kundlis</h2>
                  <div className={styles.timelineList}>
                    {history.slice(0, 5).map(entry => (
                      <button key={entry.id} type="button" className={`${styles.timelineItem} ${styles.timelineItemButton}`} onClick={() => handleHistorySelect(entry)}>
                        <span className={styles.timelineLord}>{entry.name}</span>
                        <span className={styles.timelineDates}>{entry.date} · {entry.placeLabel || `${entry.latitude.toFixed(2)}, ${entry.longitude.toFixed(2)}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Generate My Free Kundli" idPrefix="kundli" initialValues={savedBirthDetails} />
              {savedBirthDetails && (
                <p className={styles.privacy}>✦ Pre-filled from the birth details you gave at sign-up — edit any field if it's wrong.</p>
              )}
              {error && <p className={styles.privacy} style={{ color: '#d64545' }}>{error}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              className={styles.chartWrap}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Chart Header */}
              <div className={styles.chartHeader}>
                <div>
                  <span className={`section-eyebrow ${styles.chartHeaderEyebrow}`}>Birth Chart</span>
                  <h1 className="section-title-cosmos">{birthProfile.name}&apos;s Kundli</h1>
                  <p className={styles.chartMeta}>
                    {birthProfile.dob} · {birthProfile.tob} · {birthProfile.place}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexShrink: 0 }}>
                  <button
                    className="btn btn-gold"
                    onClick={handleDownloadPdfClick}
                    disabled={pdfState === 'generating'}
                    id="kundli-download-pdf-btn"
                  >
                    {pdfState === 'generating'
                      ? (pdfProgress ? `Preparing PDF… ${pdfProgress.done}/${pdfProgress.total}` : 'Preparing PDF…')
                      : isLoggedIn ? 'Download PDF' : 'Download PDF (login required)'}
                  </button>
                  <button
                    className="btn btn-outline-gold"
                    onClick={() => setFullResult(null)}
                    id="kundli-edit-btn"
                  >
                    Edit Details
                  </button>
                </div>
              </div>

              {error && pdfState === 'idle' && <p className={styles.chartNote} style={{ color: '#d64545', marginTop: 'calc(-1 * var(--space-6))', marginBottom: 'var(--space-6)' }}>{error}</p>}

              {pdfState === 'generating' && fullResult && (
                // A large negative left offset (the old approach) is a known
                // trouble spot for html2canvas — some browsers report a huge
                // scrollable viewport when a captured ancestor sits far
                // outside normal page bounds, which can distort or hang the
                // capture. This keeps the content at normal (0,0) coordinates
                // — fully laid out, just visually clipped to nothing by the
                // zero-size overflow:hidden wrapper — instead of pushed off
                // into extreme negative space.
                <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <div ref={printRef}>
                    <KundliPrintLayout name={birthProfile.name} dob={birthProfile.dob} tob={birthProfile.tob} place={birthProfile.place} result={fullResult} />
                  </div>
                </div>
              )}

              {/* Tab bar — swaps content below instead of one long continuous scroll */}
              <div className={styles.tabBar} role="tablist">
                {TABS.map(t => {
                  const TabIcon = TAB_ICONS[t.key];
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={activeTab === t.key}
                      className={`${styles.tabButton} ${activeTab === t.key ? styles.tabButtonActive : ''}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      <TabIcon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'overview' && (
                <>
                  <ChartDisplay
                    title="Planetary Placements"
                    planets={chartPlanets}
                    ascendantRashi={kundliResult?.ascendant.rashi ?? ''}
                    allowPlacementsToggle={false}
                    footer={
                      <>
                        <HighlightChip icon={RashiChakraIcon} label="Ascendant" value={kundliResult?.ascendant.rashi ?? '—'} />
                        <HighlightChip icon={MoonIcon} label="Moon Sign" value={chartPlanets.find(p => p.id === 'moon')?.sign ?? '—'} />
                        <HighlightChip icon={SunIcon} label="Sun Sign" value={chartPlanets.find(p => p.id === 'sun')?.sign ?? '—'} />
                        <HighlightChip icon={ConstellationIcon} label="Nakshatra" value={kundliResult?.moonNakshatra.name ?? '—'} />
                        <HighlightChip icon={LotusIcon} label="Tithi" value={`${fullResult.panchang.tithi.paksha} ${fullResult.panchang.tithi.name}`} />
                        <HighlightChip icon={DoshaShieldIcon} label="Manglik" value={fullResult.doshas.mangal.isManglik ? 'Present' : 'Clear'} />
                      </>
                    }
                  />

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Panchang at Birth</h2>
                    <div className={styles.infoGrid}>
                      <InfoCard icon={RashiChakraIcon} label="Tithi">{fullResult.panchang.tithi.paksha} {fullResult.panchang.tithi.name}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Nakshatra">{kundliResult?.moonNakshatra.name} (Pada {kundliResult?.moonNakshatra.pada})</InfoCard>
                      <InfoCard icon={LotusIcon} label="Yoga">{fullResult.panchang.yoga}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Karana">{fullResult.panchang.karana}</InfoCard>
                      {fullResult.panchang.sunrise && <InfoCard icon={SunIcon} label="Sunrise">{formatLocalTime(fullResult.panchang.sunrise, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.sunset && <InfoCard icon={SunsetIcon} label="Sunset">{formatLocalTime(fullResult.panchang.sunset, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.rahuKaal && <InfoCard icon={ClockIcon} label="Rahu Kalam">{formatLocalTime(fullResult.panchang.rahuKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.rahuKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.yamagandaKaal && <InfoCard icon={ClockIcon} label="Yamaganda">{formatLocalTime(fullResult.panchang.yamagandaKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.yamagandaKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.gulikaKaal && <InfoCard icon={ClockIcon} label="Gulika Kalam">{formatLocalTime(fullResult.panchang.gulikaKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.gulikaKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.abhijitMuhurat && <InfoCard icon={CheckCircleIcon} label="Abhijit Muhurat">{formatLocalTime(fullResult.panchang.abhijitMuhurat.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.abhijitMuhurat.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      <InfoCard icon={ConstellationIcon} label="Vara (Weekday)">{fullResult.panchang.vara}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Nakshatra Lord">{cap(kundliResult?.moonNakshatra.lord ?? '')}</InfoCard>
                      <InfoCard icon={MoonIcon} label="Moon Rashi">{chartPlanets.find(p => p.id === 'moon')?.sign ?? '—'}</InfoCard>
                      {kundliResult && <InfoCard icon={RashiChakraIcon} label="Ascendant Lord">{cap(RASHI_LORD_BY_NAME[kundliResult.ascendant.rashi] || '')}</InfoCard>}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>What This Chart Means</h2>
                    <p className={styles.overviewText}><strong>Ascendant.</strong> {fullResult.analysis.lagna}</p>
                    <p className={styles.overviewText}><strong>Moon.</strong> {fullResult.analysis.moon}</p>
                    {fullResult.analysis.planets.filter(p => p.id !== 'moon').map(p => (
                      <p key={p.id} className={styles.overviewText}><strong>{PLANET_META[p.id]?.name || cap(p.id)}.</strong> {p.text}</p>
                    ))}
                    <p className={styles.chartNote}>
                      To verify: the Ascendant/Moon/Sun signs and houses named above should exactly match what's shown in the chart above — including on any other Kundli tool given the same birth date, time, and place.
                    </p>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Avakhada Chakra</h2>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Varna</div><div className={styles.infoValue}>{fullResult.avakhada.varna}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Vashya</div><div className={styles.infoValue}>{fullResult.avakhada.vashya}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Yoni</div><div className={styles.infoValue}>{fullResult.avakhada.yoni}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Gana</div><div className={styles.infoValue}>{fullResult.avakhada.gana}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nadi</div><div className={styles.infoValue}>{fullResult.avakhada.nadi}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Paya</div><div className={styles.infoValue}>{fullResult.avakhada.paya}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Tatva</div><div className={styles.infoValue}>{fullResult.avakhada.tatva}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Sign Lord</div><div className={styles.infoValue}>{cap(fullResult.avakhada.signLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nakshatra Lord</div><div className={styles.infoValue}>{cap(fullResult.avakhada.nakshatraLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Charan (Pada)</div><div className={styles.infoValue}>{fullResult.avakhada.pada}</div></div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'charts' && (
                <div className={styles.overview}>
                  <p className={styles.chartNote} style={{ textAlign: 'left' }}>D1 (Rashi) and D9 (Navamsa) — the two charts every reading starts with — shown full-size below. Every other divisional chart is right there too, including a separate Bhav Chalit chart; click any of them to open it full-screen. The small number in each wedge's corner is that sign's fixed zodiac index (Aries=1 … Pisces=12) — the "house" a planet is actually in (counted from your Ascendant) is shown per-planet below the chart and in its hover tooltip.</p>

                  {/* D1 + D9, side by side, full detail (diagram + planet list) — no dropdown needed to see either. */}
                  <div className={styles.featuredChartsRow}>
                    <div onClick={() => setZoomedChart('D1')} className={styles.featuredChartClickable}>
                      <ChartDisplay title="D1 — Rashi (Birth Chart) · Planetary Placements" planets={chartPlanets} ascendantRashi={kundliResult?.ascendant.rashi ?? ''} allowPlacementsToggle={false} />
                    </div>
                    <div onClick={() => setZoomedChart('D9')} className={styles.featuredChartClickable}>
                      <ChartDisplay title="D9 — Navamsa (Marriage) · Placements" planets={toSimpleChartPlanets(fullResult.navamsaChart)} ascendantRashi={fullResult.navamsaChart.ascendant.rashi} allowPlacementsToggle={false} />
                    </div>
                  </div>
                  {chartPlanets.some(p => p.bhavHouse !== undefined) && (
                    <p className={styles.chartNote}>
                      The D1 chart above is positioned by whole-sign house (the fixed corner numbers), matching a standard Rashi/Lagna chart. Next to every planet, the gold "Bhav &lt;n&gt;" is its real cuspal house — computed from your exact birth time via Placidus Bhav Chalit, genuinely different person-to-person, and NOT the same as the whole-sign house it's sitting in. Open the separate "Bhav Chalit" chart below to see planets actually positioned by that real cuspal house instead.
                    </p>
                  )}

                  {/* Every other chart — click any tile to open it full-screen. */}
                  <h2 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>All Divisional Charts</h2>
                  <div className={styles.chartTileGrid}>
                    {CHART_KEYS.filter(k => k !== 'D1' && k !== 'D9').map(key => {
                      const { planets, ascendantRashi } = resolveChart(key);
                      return (
                        <button key={key} type="button" className={styles.chartTile} onClick={() => setZoomedChart(key)}>
                          <div className={styles.chartTilePreview}>
                            <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={() => {}} onPlanetLeave={() => {}} onHouseHover={() => {}} onHouseLeave={() => {}} />
                          </div>
                          <span className={styles.chartTileLabel}>{CHART_LABELS[key] || VARGA_LABELS[key] || key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {zoomedChart && (() => {
                const { planets, ascendantRashi } = resolveChart(zoomedChart);
                return (
                  <div className={styles.chartZoomOverlay} onClick={() => setZoomedChart(null)}>
                    <div className={styles.chartZoomPanel} onClick={e => e.stopPropagation()}>
                      <button type="button" className={styles.chartZoomClose} onClick={() => setZoomedChart(null)} aria-label="Close">✕</button>
                      <h2 className={styles.overviewTitle}>{CHART_LABELS[zoomedChart] || VARGA_LABELS[zoomedChart] || zoomedChart}</h2>
                      {zoomedChart === 'D2' && (
                        <p className={styles.chartNote}>
                          Hora (D2) is classically defined so every placement falls in ONLY Cancer or Leo (Moon's Hora / Sun's Hora) — never any other sign.
                          That's why houses here cluster into just 1 and 7 (or 12, depending on your D2 Ascendant) instead of spreading across all 12 — it's the correct classical result for this chart, not a computation error.
                        </p>
                      )}
                      <ChartDisplay title="Placements" planets={planets} ascendantRashi={ascendantRashi} />
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'gochar' && (
                <div className={styles.overview}>
                  <h2 className={styles.overviewTitle}>Gochar — Today's Real Transits on Your Chart</h2>
                  <p className={styles.chartNote} style={{ textAlign: 'left' }}>
                    Where every planet is actually transiting right now, counted as houses from your own natal Lagna and from your own natal Moon — the two classical reference points Gochar is read from — compared against where it sits in your birth chart.
                  </p>
                  {gocharError && <p style={{ color: '#d64545' }}>{gocharError}</p>}
                  {!gocharLagna && !gocharError && <p className={styles.chartNote} style={{ textAlign: 'left' }}>Loading today's transits...</p>}
                  {fullResult.doshas.sadeSati.active && (
                    <div className={styles.doshaCard}>
                      <h3 className={styles.doshaCardTitle}>Sade Sati is currently active</h3>
                      <p className={styles.doshaCardText}>Saturn is transiting {fullResult.doshas.sadeSati.saturnTransitRashi} — your {fullResult.doshas.sadeSati.phase === 'rising' ? 'rising' : fullResult.doshas.sadeSati.phase === 'peak' ? 'peak' : 'setting'} phase, counted from your natal Moon in {fullResult.doshas.sadeSati.moonRashi}.</p>
                    </div>
                  )}
                  <div className={styles.doshaCard}>
                    <h3 className={styles.doshaCardTitle}>Rahu-Ketu Transit</h3>
                    <p className={styles.doshaCardText}>Rahu is transiting {fullResult.doshas.rahuKetuTransit.rahuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon)} house from your Moon), Ketu is transiting {fullResult.doshas.rahuKetuTransit.ketuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon)} house from your Moon).</p>
                  </div>
                  {gocharLagna && (
                    <div className={styles.infoGrid} style={{ marginTop: 'var(--space-4)' }}>
                      {chartPlanets.filter(p => p.id !== 'asc').map(natal => {
                        const fromLagna = gocharLagna.transits.find(t => t.id === natal.id);
                        const fromMoon = gocharMoon?.transits.find(t => t.id === natal.id);
                        if (!fromLagna) return null;
                        return (
                          <InfoCard key={natal.id} icon={ConstellationIcon} label={natal.name}>
                            Natal: {natal.sign} ({natal.house}H)<br />
                            Transit: {fromLagna.rashi}{fromLagna.retrograde ? ' ℞' : ''} — {ordinal(fromLagna.house)}H from Lagna{fromMoon ? `, ${ordinal(fromMoon.house)}H from Moon` : ''}
                          </InfoCard>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <>
                  <div className={styles.timelinePanel}>
                    <h2 className={styles.overviewTitle}>Your Vimshottari Mahadasha Timeline</h2>
                    <p className={styles.overviewText}>The nine planetary periods of your life, starting from your Moon's nakshatra at birth. Each period's summary below is a preview — see Predictions for the full note on your current period, or consult an astrologer for the complete picture.</p>
                    <div className={styles.timelineList}>
                      {fullResult.mahadashaTimeline.map((period, i) => (
                        <div key={i}>
                          <div className={`${styles.timelineItem} ${period.active ? styles.timelineItemActive : ''}`}>
                            <span className={styles.timelineLord}>{cap(period.lord)} Mahadasha{period.active ? ' (current)' : ''}</span>
                            <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                          </div>
                          {fullResult.dashaPredictions.find(d => d.lord === period.lord) && (
                            <p className={styles.dashaPredictionText}>{teaser(fullResult.dashaPredictions.find(d => d.lord === period.lord)!.text, 100)}</p>
                          )}
                          {period.active && (
                            <div className={styles.antardashaList}>
                              {period.antardashas.map((sub, j) => (
                                <div key={j} className={styles.antardashaItem}>
                                  <span>{cap(sub.lord)} Antardasha</span>
                                  <span>{sub.startsAt} → {sub.endsAt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.timelinePanel}>
                    <h2 className={styles.overviewTitle}>Your Yogini Dasha Timeline</h2>
                    <p className={styles.overviewText}>An alternate 36-year, 8-period dasha cycle, also timed from your Moon's nakshatra at birth.</p>
                    <div className={styles.timelineList}>
                      {fullResult.yoginiDashaTimeline.map((period, i) => (
                        <div key={i} className={`${styles.timelineItem} ${period.active ? styles.timelineItemActive : ''}`}>
                          <span className={styles.timelineLord}>{period.yogini} Yogini ({cap(period.lord)}){period.active ? ' (current)' : ''}</span>
                          <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Doshas</h2>
                    <div className={styles.doshaYogaGrid}>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>Mangal Dosha</span>
                          <span className={`${styles.statusBadge} ${fullResult.doshas.mangal.isManglik ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                            {fullResult.doshas.mangal.isManglik ? 'Present' : 'Clear'}
                          </span>
                        </div>
                        <p className={styles.doshaCardText}>Mars sits in your {ordinal(fullResult.doshas.mangal.marsHouse)} house from the Ascendant.</p>
                      </div>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>Kaal Sarp Dosha</span>
                          <span className={`${styles.statusBadge} ${fullResult.doshas.kaalSarp.isKaalSarp ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                            {fullResult.doshas.kaalSarp.isKaalSarp ? 'Present' : 'Clear'}
                          </span>
                        </div>
                        <p className={styles.doshaCardText}>Rahu in {fullResult.doshas.kaalSarp.rahuRashi}, Ketu in {fullResult.doshas.kaalSarp.ketuRashi}.</p>
                      </div>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>Sade Sati</span>
                          <span className={`${styles.statusBadge} ${fullResult.doshas.sadeSati.active ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                            {fullResult.doshas.sadeSati.active ? `Active · ${fullResult.doshas.sadeSati.phase}` : 'Not active'}
                          </span>
                        </div>
                        <p className={styles.doshaCardText}>Saturn is currently transiting {fullResult.doshas.sadeSati.saturnTransitRashi}; your Moon sign is {fullResult.doshas.sadeSati.moonRashi}.</p>
                      </div>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>Rahu-Ketu Transit</span>
                        </div>
                        <p className={styles.doshaCardText}>Rahu transiting {fullResult.doshas.rahuKetuTransit.rahuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon)} from Moon), Ketu transiting {fullResult.doshas.rahuKetuTransit.ketuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon)} from Moon).</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'predictions' && (
                <>
                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Ascendant Predictions</h2>
                    <p className={styles.overviewText}>{fullResult.ascendantPredictions.description}</p>
                    <p className={styles.chartNote} style={{ marginBottom: 'var(--space-4)' }}>Your Ascendant is {fullResult.ascendantPredictions.ascendant} — a quick preview of each area is below.</p>
                    <div className={styles.predictionGrid}>
                      {([
                        ['Personality', fullResult.ascendantPredictions.personality],
                        ['Physical', fullResult.ascendantPredictions.physical],
                        ['Health', fullResult.ascendantPredictions.health],
                        ['Career', fullResult.ascendantPredictions.career],
                        ['Relationship', fullResult.ascendantPredictions.relationship],
                      ] as const).map(([label, text]) => (
                        <div key={label} className={styles.predictionCard}>
                          <div className={styles.predictionCardTitle}>{label}</div>
                          <p className={styles.doshaCardText}>{teaser(text, 110)}</p>
                        </div>
                      ))}
                    </div>
                    <div className={styles.saveBar} style={{ marginTop: 'var(--space-6)' }}>
                      <span className={styles.saveText}>This is a quick preview based on your chart, not the full reading. For your complete, personalized predictions and guidance, consult an expert astrologer on TredevAstro.</span>
                      <button className="btn btn-gold" onClick={() => setPage('astrologers')}>Consult an Astrologer</button>
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Yoga Combinations</h2>
                    <div className={styles.doshaYogaGrid}>
                      {fullResult.yogas.map(y => (
                        <div key={y.name} className={styles.doshaCard}>
                          <div className={styles.doshaCardHead}>
                            <span className={styles.doshaCardTitle}>{y.name}</span>
                            <span className={`${styles.statusBadge} ${y.present ? styles.statusBadgeClear : styles.statusBadgeActive}`}>
                              {y.present ? 'Present' : 'Not formed'}
                            </span>
                          </div>
                          <p className={styles.doshaCardText}>{y.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-2)' }}>
                    Technical, classical scoring behind your chart — useful if you want to go deeper, not required to understand your reading.
                  </p>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Shadbala (Planetary Strength)</h2>
                    <p className={styles.overviewText}>Six-fold classical strength score per planet, in Rupas — a planet at or above its classical minimum is considered strong enough to deliver its significations well.</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHead}`}>
                        <span>Planet</span><span>Rupas</span><span>Required</span><span>Status</span>
                      </div>
                      {fullResult.shadbala.planets.map(p => (
                        <div key={p.planet} className={styles.dataRow}>
                          <span className={styles.dataRowPlanet}><span className={styles.planetSymbol}><PlanetIcon id={p.planet} size={18} /></span>{PLANET_META[p.planet]?.name || p.planet}</span>
                          <span>{p.rupas.toFixed(2)}</span>
                          <span>{p.minRequiredRupas.toFixed(1)}</span>
                          <span className={`${styles.statusBadge} ${p.isStrong ? styles.statusBadgeClear : styles.statusBadgeActive}`}>{p.isStrong ? 'Strong' : 'Weak'}</span>
                        </div>
                      ))}
                    </div>
                    <p className={styles.chartNote}>Ishta/Kashta Bala and the Sthana/Dig/Kaala/Cheshta/Naisargika/Drik breakdown are computed but not all shown here — ask if you want the full per-component view.</p>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Bhavbala (House Strength)</h2>
                    <div className={styles.infoGrid}>
                      {fullResult.shadbala.houses.map(h => (
                        <div key={h.house} className={styles.infoCard}>
                          <div className={styles.infoLabel}>House {h.house}</div>
                          <div className={styles.infoValue}>{h.total.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>KP Sub-Lord Table</h2>
                    <p className={styles.overviewText}>Each point's Sign, Sign Lord, Star (Nakshatra) Lord, and Sub Lord — the core KP technique, for the Ascendant and every planet.</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                        <span>Point</span><span>Sign</span><span>Star Lord</span><span>Sub Lord</span>
                      </div>
                      {fullResult.kp.table.map(row => (
                        <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                          <span className={styles.dataRowPlanet}>{row.id === 'asc' ? 'Ascendant' : (PLANET_META[row.id]?.name || row.id)}</span>
                          <span>{row.rashi} ({cap(row.signLord)})</span>
                          <span>{cap(row.starLord)}</span>
                          <span>{cap(row.subLord)}</span>
                        </div>
                      ))}
                    </div>

                    <h2 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>KP Cusps (Bhav Chalit)</h2>
                    <p className={styles.overviewText}>Sub-lords of the real Placidus house cusps — the technique's genuine cuspal analysis, computed from Swiss Ephemeris rather than a whole-sign approximation.</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                        <span>Cusp</span><span>Sign</span><span>Star Lord</span><span>Sub Lord</span>
                      </div>
                      {fullResult.kp.cusps.map(row => (
                        <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                          <span className={styles.dataRowPlanet}>House {row.id.replace('cusp', '')}</span>
                          <span>{row.rashi} ({cap(row.signLord)})</span>
                          <span>{cap(row.starLord)}</span>
                          <span>{cap(row.subLord)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Lagna Star Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.lagnaStarLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Lagna Sub Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.lagnaSubLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Moon Star Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.moonStarLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Moon Sub Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.moonSubLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Day Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.dayLord)}</div></div>
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>Sarvashtakavarga (Bindu Strength)</h2>
                    <p className={styles.overviewText}>Total classical strength points (bindus) each sign receives, summed across all 7 grahas — higher means a stronger sign to have planets or transits pass through. The 12 signs always sum to exactly 337.</p>
                    <div className={styles.infoGrid}>
                      {fullResult.ashtakavarga.sarva.map(s => (
                        <div key={s.rashi} className={styles.infoCard}>
                          <div className={styles.infoLabel}>{s.rashi}</div>
                          <div className={styles.infoValue}>{s.bindus} bindus</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'remedies' && (
                /* Gemstone & Rudraksha Remedies — Life/Lucky/Fortune stones plus the
                   nakshatra-lord Rudraksha, each with a self-contained SVG "image",
                   mantra, and how-to-wear detail. No external shop links are used —
                   the CTA below routes to this app's own astrologer consult flow,
                   matching how the reference report itself only ever links to
                   "Chat with Astrologer" rather than any third-party seller. */
                <div className={styles.overview}>
                  <h2 className={styles.overviewTitle}>Gemstone &amp; Rudraksha Remedies</h2>
                  <p className={styles.overviewText}>Three classical gemstone picks — Life (Ascendant lord), Lucky (5th house/Purva Punya lord), and Fortune (9th house/Bhagya lord) — plus the Rudraksha ruled by your birth Nakshatra's lord.</p>
                  <div className={styles.gemGrid}>
                    {[fullResult.gemstones.life, fullResult.gemstones.lucky, fullResult.gemstones.fortune].map(g => (
                      <div key={g.purpose} className={styles.gemCard}>
                        <div className={styles.gemCardHead}>
                          <GemIcon color={g.color} />
                          <div>
                            <div className={styles.gemCardPurpose}>{g.purpose}</div>
                            <div className={styles.gemCardName}>{g.gemstone} ({g.sanskritName})</div>
                          </div>
                        </div>
                        <p className={styles.doshaCardText}>{g.reason}</p>
                        <div className={styles.gemCardMeta}>
                          <span><strong>Metal:</strong> {g.metal}</span>
                          <span><strong>Wear on:</strong> {g.finger}</span>
                        </div>
                        <p className={styles.gemMantra}>{g.mantra}</p>
                      </div>
                    ))}
                    <div className={styles.gemCard}>
                      <div className={styles.gemCardHead}>
                        <RudrakshaIcon mukhi={fullResult.rudraksha.mukhi} />
                        <div>
                          <div className={styles.gemCardPurpose}>Rudraksha</div>
                          <div className={styles.gemCardName}>{fullResult.rudraksha.mukhi} Mukhi ({fullResult.rudraksha.deity})</div>
                        </div>
                      </div>
                      <p className={styles.doshaCardText}>{fullResult.rudraksha.reason}</p>
                      <ul className={styles.gemBenefitList}>
                        {fullResult.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                      <p className={styles.gemMantra}>{fullResult.rudraksha.howToWear}</p>
                    </div>
                  </div>
                  <details className={styles.precautionsBox}>
                    <summary>Precautions before wearing any gemstone or Rudraksha</summary>
                    <ul className={styles.gemBenefitList}>
                      {fullResult.rudraksha.precautions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </details>
                  <p className={styles.chartNote}>These are classical, chart-derived starting points — not a substitute for a full consultation, since remedial choices can shift with other placements in your chart.</p>
                  <button className="btn btn-gold" style={{ marginTop: 'var(--space-4)' }} onClick={() => setPage('astrologers')}>
                    Consult an Astrologer for Remedies
                  </button>
                </div>
              )}

              {/* Save birth details to account, so the next visit prefills automatically */}
              {isLoggedIn && submittedDetails && !alreadySavedThisProfile && (
                <div className={styles.saveBar}>
                  <span className={styles.saveText}>
                    {saveState === 'saved' ? '✓ Saved to your account — this will prefill automatically next time.' : 'Save these birth details to your account so you never have to re-enter them.'}
                  </span>
                  {saveState !== 'saved' && (
                    <button className="btn btn-gold btn-sm" disabled={saveState === 'saving'} onClick={handleSaveBirthDetails}>
                      {saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Retry Save' : 'Save to My Account'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// Icon-badge variant of the plain .infoCard grid cell — used where a small
// visual cue per field (calendar/star/sun icon etc.) helps scanning, like
// the Panchang grid. Plain .infoCard usages elsewhere (Avakhada,
// Ashtakavarga, Bhavbala) are untouched — this doesn't replace that class,
// just gives it an optional icon header.
function InfoCard({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number }>; label: string; children: React.ReactNode }) {
  return (
    <div className={styles.infoCard}>
      <div className={styles.infoCardIconRow}>
        <span className={styles.infoCardIconBadge}><Icon size={15} /></span>
        <span className={styles.infoLabel} style={{ marginBottom: 0 }}>{label}</span>
      </div>
      <div className={styles.infoValue}>{children}</div>
    </div>
  );
}

function HighlightChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className={styles.highlightChip}>
      <span className={styles.infoCardIconBadge}><Icon size={14} /></span>
      <div>
        <div className={styles.highlightChipLabel}>{label}</div>
        <div className={styles.highlightChipValue}>{value}</div>
      </div>
    </div>
  );
}

// ---- Chart + planet-list panel, reused for every chart in the Charts tab
// (D1, Chandra, D9, and every D2-D60 varga chart) — each instance owns its
// own tooltip state and North/South style toggle, so multiple charts can
// sit on the same tab without interfering with each other. ----
function ChartDisplay({ title, subtitle, planets, ascendantRashi, footer, allowPlacementsToggle = true }: { title: string; subtitle?: string; planets: ChartPlanet[]; ascendantRashi: string; footer?: React.ReactNode; allowPlacementsToggle?: boolean }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [style, setStyle] = useState<'north' | 'south'>('north');
  const [showPlacements, setShowPlacements] = useState(false);

  const handlePlanetHover = (planet: ChartPlanet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    const houseLine = planet.bhavHouse !== undefined
      ? `${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House (Rashi) / Bhav ${planet.bhavHouse} (Chalit)`
      : `${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House`;
    const lines = [houseLine, planet.degree, planet.retrograde ? 'Retrograde (℞)' : null, planet.quality].filter(Boolean);
    setTooltip({ text: lines.join('\n'), x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
  };

  return (
    <div className={`${styles.chartLayout} ${!showPlacements ? styles.chartLayoutSingle : ''}`}>
      <div>
        <div className={styles.chartStyleToggle}>
          <button className={`${styles.chartStyleBtn} ${style === 'north' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('north')}>North Indian</button>
          <button className={`${styles.chartStyleBtn} ${style === 'south' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('south')}>South Indian</button>
        </div>
        <div className={styles.svgWrap}>
          {style === 'north' ? (
            <NorthIndianChart
              planets={planets}
              ascendantRashi={ascendantRashi}
              onPlanetHover={handlePlanetHover}
              onPlanetLeave={() => setTooltip(null)}
              onHouseHover={(house, e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
                if (!containerRect) return;
                setHouseTooltip({ text: HOUSE_MEANINGS[house] || '', x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top });
              }}
              onHouseLeave={() => setHouseTooltip(null)}
            />
          ) : (
            <SouthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={handlePlanetHover} onPlanetLeave={() => setTooltip(null)} />
          )}

          {tooltip && (
            <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
              {tooltip.text.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? styles.tooltipTitle : styles.tooltipDeg}>{line}</div>
              ))}
            </div>
          )}

          {houseTooltip && (
            <div className={styles.tooltip} style={{ left: houseTooltip.x, top: houseTooltip.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}>
              <div className={styles.tooltipTitle}>{houseTooltip.text}</div>
            </div>
          )}
        </div>

        {footer && <div className={styles.chartHighlights}>{footer}</div>}

        {/* Only offered once the chart is zoomed full-screen — in the small
            featured/overview view it just added a button that didn't fit
            the space. */}
        {allowPlacementsToggle && !showPlacements && (
          <button
            type="button"
            className={styles.placementsToggle}
            onClick={e => { e.stopPropagation(); setShowPlacements(true); }}
          >
            Show Placements
          </button>
        )}
      </div>

      {allowPlacementsToggle && showPlacements && (
        <div className={styles.planetList}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h3 className={styles.planetListTitle} style={{ marginBottom: 0 }}>{title}</h3>
            <button
              type="button"
              className={styles.placementsToggle}
              style={{ marginTop: 0 }}
              onClick={e => { e.stopPropagation(); setShowPlacements(false); }}
            >
              Hide
            </button>
          </div>
          {subtitle && <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-3)' }}>{subtitle}</p>}
          <div className={styles.planetGrid}>
            {planets.map(p => (
              <div key={p.id} className={styles.planetCard}>
                <span className={styles.planetSymbolBadge}><PlanetIcon id={p.id} size={20} /></span>
                <div className={styles.planetCardText}>
                  <div className={styles.planetCardName}>{p.name}</div>
                  <div className={styles.planetCardMeta}>{p.sign}{p.retrograde ? ' ℞' : ''} · House {p.house}{p.bhavHouse !== undefined ? ` · Bhav ${p.bhavHouse}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.chartNote}>Hover over planets and houses to explore their meanings. ℞ marks a retrograde planet. "House" is the whole-sign house (matches the chart's wedge/corner number); "Bhav" is the real cuspal house computed from your exact birth time via Placidus Bhav Chalit — the two are different classification systems and are expected to disagree for most planets.</div>
        </div>
      )}
    </div>
  );
}

// Simple self-contained SVG "image" for a gemstone — a faceted gem shape
// tinted with that stone's real color, so each recommendation card has a
// visual without depending on any external image/icon library or URL.
function GemIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <polygon points="24,4 40,16 34,44 14,44 8,16" fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <polygon points="24,4 40,16 24,20 8,16" fill="rgba(255,255,255,0.35)" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="rgba(0,0,0,0.15)" strokeWidth="0.75" />
      <line x1="8" y1="16" x2="40" y2="16" stroke="rgba(0,0,0,0.15)" strokeWidth="0.75" />
    </svg>
  );
}

// A Rudraksha bead icon — a round bead with radial facet lines equal to the
// mukhi (face) count, so the count itself is visually legible.
function RudrakshaIcon({ mukhi }: { mukhi: number }) {
  const lines = Array.from({ length: mukhi }, (_, i) => {
    const angle = (i / mukhi) * Math.PI * 2;
    return { x2: 24 + Math.cos(angle) * 18, y2: 24 + Math.sin(angle) * 18 };
  });
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="#5c3a21" stroke="#2e1c0f" strokeWidth="1.5" />
      {lines.map((l, i) => (
        <line key={i} x1="24" y1="24" x2={l.x2} y2={l.y2} stroke="#8d5a35" strokeWidth="1" />
      ))}
      <circle cx="24" cy="24" r="3" fill="#c7a15a" />
    </svg>
  );
}

