import React from 'react';
import { chatService, ChatApiError } from '../../services/chatService';
import type { ClientKundliContext } from '../../services/chatService';
import { NorthIndianChart, toChartPlanets, cap, CHART_KEYS, chartLabel, resolveChart } from '../../sections/KundliSection/KundliCharts';
import { ordinal } from '../calculators/CalculatorPages';
import { EmptyState } from './sections/shared';
import styles from './sections/sections.module.css';
import { useAppContext } from '../../context/AppContext';
import KundliPrintLayout from '../../sections/KundliSection/KundliPrintLayout';
import { generateKundliPdf } from '../../sections/KundliSection/kundliPdfGenerator';

function shortChartLabel(key: string): string {
  if (key === 'BHAV_CHALIT') return 'Bhav';
  if (key === 'CHANDRA') return 'Chandra';
  return key;
}

// The astrologer's live "what does this person's chart actually say" sidebar
// — sits next to ChatWindow/CallWindow (Overview.tsx / ChatInbox.tsx) so the
// astrologer isn't asking the client to repeat birth details mid-session.
// Reuses the exact same chart data/components as the user's own "My Kundli"
// page (PageRenderer.tsx) — no separate rendering logic to keep in sync.
export default function ClientKundliPanel({ consultationId, fallbackName }: { consultationId: string; fallbackName: string }) {
  const { currentUser, language } = useAppContext();
  const astrologerName = currentUser?.name || 'Astrologer';

  const [data, setData] = React.useState<ClientKundliContext | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [chartKey, setChartKey] = React.useState<string>('D1');
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const [pdfProgress, setPdfProgress] = React.useState<{ weightDone: number; totalWeight: number } | null>(null);
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

  // Generates the actual full multi-page consumer Kundli report matching
  // the user's downloaded PDF, attributed with "for (astrologer name)" on
  // every page (cover, headers, footers, closing).
  React.useEffect(() => {
    if (!pdfGenerating || !printRef.current || !data?.hasBirthDetails || !data?.kundliFull) return;
    let cancelled = false;
    const sanitizedUserName = data.userName.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Client';
    const sanitizedAstroName = astrologerName.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'Astrologer';
    const fileName = `${sanitizedUserName}_Kundli_for_${sanitizedAstroName}.pdf`;

    generateKundliPdf({
      root: printRef.current,
      subjectName: data.userName,
      fileName,
      preparedForAstrologer: astrologerName,
      onProgress: p => {
        if (!cancelled) setPdfProgress(p);
      },
      isCancelled: () => cancelled,
    })
      .catch(err => {
        if (!cancelled) {
          console.error('Astrologer Kundli PDF generation failed:', err);
          setError('Could not generate the full Kundli PDF. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPdfGenerating(false);
          setPdfProgress(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pdfGenerating, data, astrologerName]);

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
                {pdfGenerating
                  ? (pdfProgress && pdfProgress.totalWeight > 0
                      ? `Preparing (${Math.round((pdfProgress.weightDone / pdfProgress.totalWeight) * 100)}%)…`
                      : 'Preparing…')
                  : 'Download PDF'}
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

            {/* Printable capture target — mounts the full Kundli report offscreen
                with data-pdf-block elements, captured via generateKundliPdf.
                Attribute 'preparedForAstrologer' writes 'for (astrologer name)' on every page. */}
            {pdfGenerating && data.kundliFull && (
              <div style={{ position: 'fixed', left: -9999, top: 0, width: 800, overflow: 'visible', zIndex: -1 }} data-theme="light">
                <div ref={printRef}>
                  <KundliPrintLayout
                    name={data.userName}
                    dob={data.birthDate || ''}
                    tob={data.birthTime || '12:00'}
                    timeUnknown={!data.birthTime}
                    place={data.birthPlace || 'India'}
                    timezoneOffsetMinutes={data.birthTimezoneOffsetMinutes ?? 330}
                    latitude={data.birthLatitude}
                    longitude={data.birthLongitude}
                    result={data.kundliFull}
                    language={language === 'hi' ? 'hi' : 'en'}
                    preparedForAstrologer={astrologerName}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
