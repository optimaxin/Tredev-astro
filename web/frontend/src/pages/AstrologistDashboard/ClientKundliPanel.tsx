import React from 'react';
import { chatService, ChatApiError } from '../../services/chatService';
import type { ClientKundliContext } from '../../services/chatService';
import { NorthIndianChart, toChartPlanets, cap, CHART_KEYS, chartLabel, resolveChart } from '../../sections/KundliSection/KundliCharts';
import { ordinal } from '../calculators/CalculatorPages';
import { EmptyState } from './sections/shared';
import styles from './sections/sections.module.css';

function shortChartLabel(key: string): string {
  if (key === 'BHAV_CHALIT') return 'Bhav';
  if (key === 'CHANDRA') return 'Chandra';
  return key;
}

// A condensed, single-page reference PDF — deliberately NOT a reuse of
// KundliSection.tsx's full consumer report (a ~5-minute, every-divisional-
// chart-on-its-own-page capture tuned for that exact job). An astrologer
// mid-consultation needs a quick printable summary of what's already in
// this sidebar, captured in seconds, not the full report pipeline.
async function downloadClientKundliPdf(node: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 32;
  const usableWidth = pageWidth - margin * 2;
  const usableHeight = pageHeight - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  if (imgHeight <= usableHeight) {
    pdf.addImage(imgData, 'JPEG', margin, margin, usableWidth, imgHeight);
  } else {
    // Taller than one page — same repeated-negative-offset technique
    // KundliSection.tsx's generator uses: draw the whole image at a Y
    // offset that slides it up by one page's worth each time, clipped by
    // the page boundary, until it's all been shown once.
    let remaining = imgHeight;
    let offset = 0;
    while (remaining > 0) {
      pdf.addImage(imgData, 'JPEG', margin, margin - offset, usableWidth, imgHeight);
      remaining -= usableHeight;
      offset += usableHeight;
      if (remaining > 0) pdf.addPage();
    }
  }
  pdf.save(fileName);
}

// The astrologer's live "what does this person's chart actually say" sidebar
// — sits next to ChatWindow/CallWindow (Overview.tsx / ChatInbox.tsx) so the
// astrologer isn't asking the client to repeat birth details mid-session.
// Reuses the exact same chart data/components as the user's own "My Kundli"
// page (PageRenderer.tsx) — no separate rendering logic to keep in sync.
export default function ClientKundliPanel({ consultationId, fallbackName }: { consultationId: string; fallbackName: string }) {
  const [data, setData] = React.useState<ClientKundliContext | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [chartKey, setChartKey] = React.useState<string>('D1');
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    setChartKey('D1');
    chatService.getClientKundli(consultationId)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e instanceof ChatApiError ? e.message : "Could not load this client's Kundli."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [consultationId]);

  // The printable layout below only mounts while pdfGenerating is true (not
  // permanently, off-screen) — this effect fires once that mount has
  // actually committed and printRef.current exists, same gating pattern
  // KundliSection.tsx's own generator uses and for the same reason (a
  // permanently-mounted hidden capture target is a wall of sub-12px text
  // accessibility scanners flag).
  React.useEffect(() => {
    if (!pdfGenerating || !printRef.current || !data?.hasBirthDetails) return;
    let cancelled = false;
    downloadClientKundliPdf(printRef.current, `${data.userName.replace(/[^a-z0-9]+/gi, '-')}-kundli.pdf`)
      .catch(() => { if (!cancelled) setError('Could not generate the PDF. Please try again.'); })
      .finally(() => { if (!cancelled) setPdfGenerating(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfGenerating]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>Client's Kundli</h3>
      </div>

      {loading ? (
        <div className={styles.tableMuted}>Loading chart…</div>
      ) : error ? (
        <div className={styles.tableMuted} style={{ color: 'var(--danger, #e05252)' }}>{error}</div>
      ) : !data?.hasBirthDetails ? (
        <EmptyState icon="✦" title="No saved birth details" desc={`${data?.userName || fallbackName} hasn't generated a Kundli yet, so there's nothing to show here.`} />
      ) : (() => {
        const k = data.kundliFull!;
        const moonSign = toChartPlanets(k.kundli, k.bhavChalit).find(p => p.id === 'moon')?.sign || '—';
        const { planets: chartPlanets, ascendantRashi } = resolveChart(k, chartKey);
        const activeMahadasha = k.mahadashaTimeline.find(m => m.active);
        const flags = [
          k.doshas.kaalSarp.isKaalSarp && 'Kaal Sarp Dosha',
          k.doshas.sadeSati.active && 'Sade Sati',
        ].filter((f): f is string => !!f);

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div className={styles.tablePrimary}>{data.userName}</div>
                <div className={styles.tableMuted}>Born {data.birthDate}{data.birthPlace ? ` · ${data.birthPlace}` : ''}</div>
              </div>
              <button
                type="button"
                className={styles.btnSm}
                disabled={pdfGenerating}
                onClick={() => setPdfGenerating(true)}
              >
                {pdfGenerating ? 'Preparing…' : 'Download PDF'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontFamily: 'var(--font-sans)', fontSize: 12 }}>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px' }}>
                <div className={styles.tableMuted}>Lagna</div>
                <div className={styles.tablePrimary}>{cap(k.kundli.ascendant.rashi)}</div>
              </div>
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px' }}>
                <div className={styles.tableMuted}>Chandra Rashi</div>
                <div className={styles.tablePrimary}>{cap(moonSign)}</div>
              </div>
              <div style={{ gridColumn: 'span 2', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px' }}>
                <div className={styles.tableMuted}>Nakshatra</div>
                <div className={styles.tablePrimary}>{k.kundli.moonNakshatra.name} ({ordinal(k.kundli.moonNakshatra.pada)} Pada)</div>
              </div>
              {activeMahadasha && (
                <div style={{ gridColumn: 'span 2', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 10px' }}>
                  <div className={styles.tableMuted}>Current Mahadasha</div>
                  <div className={styles.tablePrimary}>{cap(activeMahadasha.lord)}</div>
                </div>
              )}
            </div>

            <div className={styles.chipRow} style={{ marginBottom: 10 }}>
              {CHART_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.chip} ${chartKey === key ? styles.chipActive : ''}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  title={chartLabel(key)}
                  onClick={() => setChartKey(key)}
                >
                  {shortChartLabel(key)}
                </button>
              ))}
            </div>
            <div className={styles.tableMuted} style={{ marginBottom: 6 }}>{chartLabel(chartKey)}</div>

            <div style={{ width: '100%', maxWidth: 280, margin: '0 auto 14px' }}>
              <NorthIndianChart
                planets={chartPlanets}
                ascendantRashi={ascendantRashi}
                onPlanetHover={() => {}}
                onPlanetLeave={() => {}}
                onHouseHover={() => {}}
                onHouseLeave={() => {}}
              />
            </div>

            {flags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {flags.map(f => (
                  <span key={f} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(181,138,59,0.4)', color: 'var(--gold-primary)' }}>{f}</span>
                ))}
              </div>
            )}

            {/* Printable capture target — only mounted while generating (see
                this component's own useEffect), never sitting permanently
                off-screen. Plain black-on-white regardless of the dashboard's
                current theme, since a PDF has no "dark mode." */}
            {pdfGenerating && (
              <div style={{ position: 'fixed', left: -9999, top: 0, width: 560 }} data-theme="light">
                <div ref={printRef} style={{ background: '#fff', color: '#1a1a1a', padding: 32, fontFamily: 'var(--font-sans)', width: 560 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 4 }}>{data.userName}'s Kundli</div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 18 }}>
                    Born {data.birthDate}{data.birthPlace ? ` · ${data.birthPlace}` : ''} · Prepared for consultation
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, fontSize: 13 }}>
                    <div><strong>Lagna:</strong> {cap(k.kundli.ascendant.rashi)}</div>
                    <div><strong>Chandra Rashi:</strong> {cap(moonSign)}</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Nakshatra:</strong> {k.kundli.moonNakshatra.name} ({ordinal(k.kundli.moonNakshatra.pada)} Pada)</div>
                    {activeMahadasha && <div style={{ gridColumn: 'span 2' }}><strong>Current Mahadasha:</strong> {cap(activeMahadasha.lord)}</div>}
                    {flags.length > 0 && <div style={{ gridColumn: 'span 2' }}><strong>Doshas:</strong> {flags.join(', ')}</div>}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>{chartLabel(chartKey)}</div>
                  <div style={{ width: 460, margin: '0 auto' }}>
                    <NorthIndianChart
                      planets={chartPlanets}
                      ascendantRashi={ascendantRashi}
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
        );
      })()}
    </div>
  );
}
