import type { ReactNode } from 'react';
import { INK, MUTED, FAINT, GOLD, LINE, TINT, FONT, PAGE_BG, COVER_BANNER_SRC } from '../KundliSection/printTheme';
import { MiniChart, SectionHeader, SubHeading, Table, Td } from '../KundliSection/printPrimitives';
import type { PremiumReport, ReportSection } from '../../services/premiumReportService';
import { VARGA_LABELS } from '../../services/calculatorService';
import { renderReportMarkdown } from '../../utils/reportMarkdown';
import { availableVargas, formatDms, getVarga, hasD1, positionRows, sectionVisualKind, toD1ChartPlanets, toVargaChartPlanets } from './charts/chartModel';
import { SectionVisual } from './charts/ChartVisuals';
import chartStyles from './charts/charts.module.css';
import { buildReportEntries } from './reportEntries';
import styles from './PremiumReportPrintLayout.module.css';

// The downloadable Premium Report, laid out as the main site's Kundli PDF is
// (KundliPrintLayout.tsx — the "Sparsh bansal_ENG_Kundli" template): a cover
// with the festive banner, logo and gold "generated" badge; numbered gold
// section badges, each section starting a fresh page; the Kundli charts in
// the same frames; and the same closing "thank you" page. The running header
// (logo, tagline, title, Acharya portrait) and footer are drawn onto every
// page by utils/brandedPdf.ts — the one PDF engine both reports share.
//
// Rendered off-screen only while a PDF is being generated, and only from the
// report already loaded in the viewer: it fetches nothing, so producing (or
// failing to produce) a PDF can never touch the report or start a new run.
//
// Content is rendered exactly as the viewer renders it — same sections, same
// order, same sanitized Markdown. Each section's prose is split at its own
// top-level blocks (paragraphs, lists, tables) so page breaks fall between
// paragraphs instead of through a line of text.

const READABLE_STATUS: Record<string, string> = {
  pending: 'Not yet written',
  generating: 'Being written now',
  invalid: 'Held back for review',
  failed: 'Could not be written',
  skipped: 'Not applicable to this chart',
};

const isReadable = (s: ReportSection) => s.status === 'completed' && !!s.content?.trim();

// Groups a section's sanitized top-level HTML nodes into page-packable
// chunks. A heading always travels with the block after it, so it is never
// stranded at the foot of a page.
function proseChunks(markdown: string | null): string[] {
  const html = renderReportMarkdown(markdown);
  if (!html) return [];
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const nodes = Array.from(doc.body.firstElementChild?.children ?? []);
  const chunks: string[] = [];
  let cur: string[] = [];
  let curLen = 0;
  let holdHeading = false;
  const flush = () => { if (cur.length) { chunks.push(cur.join('')); cur = []; curLen = 0; } };
  for (const n of nodes) {
    const isHeading = /^H[1-6]$/.test(n.tagName);
    if (isHeading) { flush(); cur.push(n.outerHTML); holdHeading = true; continue; }
    const len = n.textContent?.length ?? 0;
    if (!holdHeading && curLen + len > 900) flush();
    cur.push(n.outerHTML);
    curLen += len;
    holdHeading = false;
  }
  flush();
  return chunks;
}

function Block({ children, newPage, weight }: { children: ReactNode; newPage?: boolean; weight?: number }) {
  return (
    <div data-pdf-block data-pdf-newpage={newPage ? 'true' : undefined} data-pdf-weight={weight} style={{ marginBottom: 14, breakBefore: newPage ? 'page' : undefined }}>
      {children}
    </div>
  );
}

function fmtGenerated(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  return (Number.isNaN(d.getTime()) ? new Date() : d).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function PremiumReportPrintLayout({ report, name }: { report: PremiumReport; name: string }) {
  const chart = report.chart;
  const entries = buildReportEntries(report);
  const birth = chart?.birth;
  const coverLine = [birth?.date ?? report.subject?.date, birth?.time, birth?.place ?? report.subject?.place].filter(Boolean).join(' · ');

  return (
    // data-theme="light" + lightScope: the chart SVG and every chart visual
    // render in the light palette even if the viewer is browsing in dark mode.
    <div data-theme="light" className={chartStyles.lightScope} style={{ width: 800, position: 'relative', background: PAGE_BG }}>
      <div style={{ position: 'relative', zIndex: 1, color: INK, fontFamily: 'DM Sans, sans-serif', padding: 40 }}>

        {/* ── Cover ── */}
        <div data-pdf-block data-pdf-cover="true" style={{ minHeight: 960, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '50px 20px', breakAfter: 'page' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src={COVER_BANNER_SRC} style={{ width: '100%', height: 'auto', borderRadius: 14, marginBottom: 34, boxShadow: '0 10px 28px rgba(122, 44, 20, 0.16)' }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src="/logo.png" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 10 }} />
          <div style={{ fontSize: FONT.label, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', fontWeight: 700 }}>TredevaAstro</div>
          <div style={{ fontSize: FONT.label, letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', margin: '8px 0 14px', fontWeight: 700 }}>Premium Astrology Report</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 40, color: INK, margin: '0 0 10px', maxWidth: 620 }}>{name ? `${name}’s Premium Report` : 'Your Premium Report'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 40, height: 1, background: GOLD }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
            <span style={{ width: 40, height: 1, background: GOLD }} />
          </div>
          {coverLine && <div style={{ fontSize: FONT.body, color: MUTED, marginBottom: 20 }}>{coverLine}</div>}
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: FONT.label, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Generated {fmtGenerated(report.created_at)}
          </span>
          {report.status !== 'completed' && (
            <div style={{ marginTop: 14, fontSize: FONT.label, color: '#A85B2D', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
              Partly complete — {report.sections.filter(isReadable).length} of {report.sections.length} sections written
            </div>
          )}
          <div style={{ fontSize: 8.5, letterSpacing: '0.2em', color: FAINT, textTransform: 'uppercase', marginTop: 22 }}>TredevaAstro · Your Sky. Your Story.</div>
        </div>

        {/* ── Contents ── */}
        <Block newPage>
          <SectionHeader num="✦" title="Contents" />
          <div style={{ columnCount: 2, columnGap: 32 }}>
            {entries.map(e => (
              <div key={e.key} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: `1px dotted ${LINE}`, breakInside: 'avoid', fontSize: FONT.body }}>
                <span style={{ width: 22, color: GOLD, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{e.number ?? '✦'}</span>
                <span style={{ color: e.kind === 'section' && !isReadable(e.section!) ? FAINT : INK }}>{e.title}</span>
              </div>
            ))}
          </div>
        </Block>

        {entries.map(e => {
          if (e.kind === 'birth-chart') {
            return (
              <div key={e.key}>
                <Block newPage>
                  <SectionHeader num="✦" title="Birth Chart" />
                  <p style={{ fontSize: FONT.body, color: MUTED, lineHeight: 1.6, margin: '0 0 12px' }}>The chart every section of this report is read from, exactly as the Kundli Engine calculated it.</p>
                </Block>
                {hasD1(chart) ? (
                  <Block weight={3}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                      <MiniChart title="Lagna Chart (D1)" planets={toD1ChartPlanets(chart)} ascendantRashi={chart.lagna.rashi} />
                      {getVarga(chart, 'D9')
                        ? <MiniChart title="Navamsa Chart (D9)" planets={toVargaChartPlanets(getVarga(chart, 'D9')!)} ascendantRashi={getVarga(chart, 'D9')!.ascendant_rashi} />
                        : <div style={{ alignSelf: 'center', textAlign: 'center', color: FAINT, fontSize: FONT.body }}>Navamsa (D9) data is not available for this report.</div>}
                    </div>
                  </Block>
                ) : (
                  <Block><div style={{ color: FAINT, fontSize: FONT.body }}>The birth chart is not available for this report.</div></Block>
                )}
                {hasD1(chart) && (
                  <Block>
                    <SubHeading>Planetary positions</SubHeading>
                    {/* The template's own compact table (its "PLANETARY
                        POSITIONS" page), so the two charts and this table
                        share one page as they do in the Kundli PDF. */}
                    <Table head={['Planet', 'Sign', 'Degree', 'House', 'Nakshatra', 'Pada', 'Naksh lord', 'Retro']}>
                      <tr style={{ borderTop: `1px solid ${LINE}` }}>
                        <Td><b>Ascendant</b></Td><Td>{chart.lagna.rashi}</Td><Td>{formatDms(chart.lagna.degree_in_sign)}</Td><Td>1</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td>
                      </tr>
                      {positionRows(chart).map(p => (
                        <tr key={p.planet} style={{ borderTop: `1px solid ${LINE}` }}>
                          <Td><b>{p.planet}</b></Td><Td>{p.rashi}</Td><Td>{formatDms(p.degree_in_sign)}</Td><Td>{p.house}</Td>
                          <Td>{p.nakshatra ?? '—'}</Td><Td>{p.nakshatra_pada ?? '—'}</Td><Td>{p.nakshatra_lord ?? '—'}</Td>
                          <Td>{p.retrograde === true ? 'Yes' : p.retrograde === false ? 'No' : '—'}</Td>
                        </tr>
                      ))}
                    </Table>
                  </Block>
                )}
              </div>
            );
          }

          if (e.kind === 'appendix') {
            const codes = availableVargas(chart).filter(c => c !== 'D9');
            const pages: string[][] = [];
            for (let i = 0; i < codes.length; i += 4) pages.push(codes.slice(i, i + 4));
            return (
              <div key={e.key}>
                <Block newPage>
                  <SectionHeader num="✦" title="Divisional Charts" />
                  <p style={{ fontSize: FONT.body, color: MUTED, lineHeight: 1.6, margin: 0 }}>Every divisional (varga) chart the Kundli Engine computed for this birth.</p>
                </Block>
                {pages.map((group, gi) => (
                  <Block key={gi} weight={3}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, rowGap: 28 }}>
                      {group.map(code => {
                        const v = getVarga(chart, code)!;
                        return <MiniChart key={code} title={VARGA_LABELS[code] ?? code} planets={toVargaChartPlanets(v)} ascendantRashi={v.ascendant_rashi} />;
                      })}
                    </div>
                  </Block>
                ))}
              </div>
            );
          }

          const s = e.section!;
          const readable = isReadable(s);
          // The section's content as separate page-packable pieces, in order.
          const pieces: { node: ReactNode; weight?: number }[] = [];
          // Same real-data visual the viewer shows for this section. (None at
          // all when there is no visual — an empty block would hand the PDF
          // engine a zero-size capture.)
          if (readable && sectionVisualKind(s.section_id, report.chart)) {
            pieces.push({ node: <SectionVisual sectionId={s.section_id} chart={report.chart} />, weight: 2 });
          }
          if (readable) {
            for (const html of proseChunks(s.content)) {
              // Already sanitized by renderReportMarkdown (DOMPurify allowlist).
              pieces.push({ node: <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} /> });
            }
          } else {
            pieces.push({
              node: (
                <div style={{ border: `1px dashed ${LINE}`, borderRadius: 10, padding: '14px 18px', color: FAINT, fontSize: FONT.body }}>
                  <b style={{ color: GOLD, textTransform: 'uppercase', fontSize: FONT.label, letterSpacing: '0.06em' }}>{READABLE_STATUS[s.status] ?? s.status}</b>
                  <div style={{ marginTop: 4 }}>
                    {s.status === 'skipped' ? 'This section doesn’t apply to your chart, so it was not written.' : 'This section isn’t available in this copy of your report.'}
                  </div>
                </div>
              ),
            });
          }
          if (readable && s.key_points && s.key_points.length > 0) {
            pieces.push({
              node: (
                <div style={{ background: TINT, borderLeft: `3px solid ${GOLD}`, borderRadius: 6, padding: '12px 16px' }}>
                  <div style={{ fontSize: FONT.label, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Key points</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: FONT.body, lineHeight: 1.6, color: MUTED }}>
                    {s.key_points.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              ),
            });
          }

          // Interpretive sections each open a fresh page, like the template's
          // numbered chapters. The short structured tables (Birth Details,
          // Panchang, Positions, Dasha tables, Disclaimer) flow on instead of
          // leaving near-empty pages — with their heading in the SAME block
          // as their first piece, so a heading can never be stranded at the
          // foot of a page with its table on the next.
          const header = <SectionHeader num={String(e.number).padStart(2, '0')} title={s.title} />;
          const flows = s.kind === 'structured';
          return (
            <div key={e.key} data-section-id={s.section_id}>
              {flows ? (
                <Block weight={pieces[0]?.weight}>{header}{pieces[0]?.node}</Block>
              ) : (
                <Block newPage>{header}</Block>
              )}
              {pieces.slice(flows ? 1 : 0).map((p, i) => <Block key={i} weight={p.weight}>{p.node}</Block>)}
            </div>
          );
        })}

        {/* ── Closing page (same as the Kundli PDF's) ── */}
        <div data-pdf-block data-pdf-closing="true" style={{ minHeight: 880, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', breakBefore: 'page', breakInside: 'avoid' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src="/logo.png" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 20, opacity: 0.9 }} />
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Thank you for reading</div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: TINT, padding: '28px 36px', maxWidth: 460 }}>
            <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 26, color: INK, margin: '0 0 12px' }}>Your journey continues{name ? `, ${name}` : ''}</div>
            <p style={{ fontSize: FONT.body, lineHeight: 1.6, color: MUTED, margin: '0 0 16px' }}>
              Want to talk any of this through? Chat with a verified TredevaAstro astrologer for one-on-one guidance on your chart.
            </p>
            <div style={{ width: 48, height: 2, background: GOLD, margin: '0 auto 14px' }} />
            <div style={{ fontSize: FONT.label, color: FAINT, letterSpacing: '0.08em' }}>TredevaAstro · Your Sky. Your Story.</div>
            <div style={{ fontSize: 8.5, color: FAINT, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10 }}>— End of report —</div>
          </div>
        </div>
      </div>
    </div>
  );
}
