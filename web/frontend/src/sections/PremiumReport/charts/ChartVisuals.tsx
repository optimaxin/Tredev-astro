import React, { useState } from 'react';
import { NorthIndianChart, SouthIndianChart } from '../../KundliSection/KundliCharts';
import type { ChartPlanet } from '../../KundliSection/KundliCharts';
import { VARGA_LABELS } from '../../../services/calculatorService';
import type { ChartView, MahadashaView, PeriodView, YoginiView } from '../../../services/premiumReportService';
import {
  PLANET_SECTION, SECTION_VARGA, availableVargas, cleanPeriods, currentPeriod, formatDms, getVarga, groupByHouse, hasD1,
  periodYears, phaseOf, positionRows, sectionVisualKind, strengthRows, timelineSegments, toD1ChartPlanets, toVargaChartPlanets, todayIso,
  todayMarkerPct, vimshottari,
} from './chartModel';
import styles from './charts.module.css';

// Every visual here draws ONLY what the backend's ChartView contains (the
// Kundli Engine chart Stage 6 wrote the report from). When a piece is
// missing it says so, in place — nothing is estimated or filled in.

const noop = () => {};

const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function Unavailable({ what, reason }: { what: string; reason?: string }) {
  return (
    <div className={styles.unavailable} role="note">
      <strong>{what} isn’t available for this report.</strong>{' '}
      {reason ?? 'The Kundli Engine did not return the data needed to draw it, so nothing is shown in its place.'}
    </div>
  );
}

// ── Kundli (D1 / D9 / any varga) ───────────────────────────────────────────

// A plain-text reading of the chart for screen readers: the SVG's own text
// nodes are positioned glyphs, not a meaningful reading order.
function chartDescription(planets: ChartPlanet[], ascendantRashi: string): string {
  const byHouse = groupByHouse(planets);
  const name = new Map(planets.map(p => [p.id, p.id === 'asc' ? 'Lagna' : p.name]));
  const houses = Object.entries(byHouse)
    .filter(([, ids]) => ids.length)
    .map(([h, ids]) => `house ${h}: ${ids.map(id => name.get(id)).join(', ')}`);
  return `Lagna in ${ascendantRashi}. ${houses.join('; ')}.`;
}

export function KundliFigure({
  title, kicker, caption, planets, ascendantRashi, allowStyleToggle = false, compact = false, testId,
}: {
  title: string; kicker?: string; caption?: string; planets: ChartPlanet[]; ascendantRashi: string;
  allowStyleToggle?: boolean; compact?: boolean; testId?: string;
}) {
  const [style, setStyle] = useState<'north' | 'south'>('north');
  const description = chartDescription(planets, ascendantRashi);
  return (
    <figure className={styles.figure} data-testid={testId} data-ascendant={ascendantRashi}>
      <div className={styles.figureHeader}>
        <div>
          {kicker && <span className={styles.figureKicker}>{kicker}</span>}
          <h3 className={styles.figureTitle}>{title}</h3>
        </div>
        {allowStyleToggle && (
          <div className={styles.toggle} role="group" aria-label="Chart style">
            <button type="button" className={styles.toggleBtn} aria-pressed={style === 'north'} onClick={() => setStyle('north')}>North Indian</button>
            <button type="button" className={styles.toggleBtn} aria-pressed={style === 'south'} onClick={() => setStyle('south')}>South Indian</button>
          </div>
        )}
      </div>
      <div className={styles.chartBox} role="img" aria-label={`${title}. ${description}`} style={compact ? { maxWidth: 280 } : undefined}>
        {style === 'north'
          ? <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} />
          : <SouthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={noop} onPlanetLeave={noop} />}
      </div>
      {!compact && (
        <div className={styles.legend} aria-hidden="true">
          <span><b>As</b> Lagna</span><span><b>Su</b> Sun</span><span><b>Mo</b> Moon</span><span><b>Ma</b> Mars</span>
          <span><b>Me</b> Mercury</span><span><b>Ju</b> Jupiter</span><span><b>Ve</b> Venus</span><span><b>Sa</b> Saturn</span>
          <span><b>Ra</b> Rahu</span><span><b>Ke</b> Ketu</span><span><b>℞</b> retrograde</span>
        </div>
      )}
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

export function D1Figure({ chart, allowStyleToggle, compact }: { chart: ChartView | null; allowStyleToggle?: boolean; compact?: boolean }) {
  if (!hasD1(chart)) return <Unavailable what="The birth chart (D1)" />;
  return (
    <KundliFigure
      testId="chart-d1"
      kicker="Rashi chart · D1"
      title="Birth Kundli (Lagna Chart)"
      planets={toD1ChartPlanets(chart)}
      ascendantRashi={chart.lagna.rashi}
      allowStyleToggle={allowStyleToggle}
      compact={compact}
      caption={compact ? undefined : 'Numbers mark each house’s rashi (Aries = 1 … Pisces = 12); the top diamond is the 1st house. Degrees are within the sign. Placements are the Kundli Engine’s, unchanged.'}
    />
  );
}

export function VargaFigure({ chart, code, compact, caption }: { chart: ChartView | null; code: string; compact?: boolean; caption?: string }) {
  const v = getVarga(chart, code);
  const label = VARGA_LABELS[code] ?? (code === 'D9' ? 'Navamsa (D9) — Marriage & Dharma' : code);
  if (!v) return <Unavailable what={label} />;
  return (
    <KundliFigure
      testId={`chart-${code.toLowerCase()}`}
      kicker={`Divisional chart · ${code}`}
      title={code === 'D9' ? 'Navamsa (D9)' : label}
      planets={toVargaChartPlanets(v)}
      ascendantRashi={v.ascendant_rashi}
      compact={compact}
      caption={caption}
    />
  );
}

// ── Planetary positions ────────────────────────────────────────────────────

export function PlanetaryPositionsTable({ chart }: { chart: ChartView | null }) {
  if (!hasD1(chart)) return <Unavailable what="The planetary positions table" />;
  const rows = positionRows(chart);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="positions-table">
        <caption>Planetary positions</caption>
        <thead>
          <tr><th scope="col">Planet</th><th scope="col">Sign</th><th scope="col">Degree</th><th scope="col">House</th><th scope="col">Nakshatra</th><th scope="col">Pada</th><th scope="col">Nakshatra lord</th><th scope="col">Motion</th></tr>
        </thead>
        <tbody>
          <tr>
            <td className={styles.name}>Ascendant</td><td>{chart.lagna.rashi}</td><td>{formatDms(chart.lagna.degree_in_sign)}</td>
            <td>1st</td><td>—</td><td>—</td><td>—</td><td>—</td>
          </tr>
          {rows.map(p => (
            <tr key={p.planet} data-planet={p.planet}>
              <td className={styles.name}>{p.planet}</td>
              <td>{p.rashi}</td>
              <td>{formatDms(p.degree_in_sign)}</td>
              <td>{ordinal(p.house)}</td>
              <td>{p.nakshatra ?? '—'}</td>
              <td>{p.nakshatra_pada ?? '—'}</td>
              <td>{p.nakshatra_lord ?? '—'}</td>
              <td>{p.retrograde === true ? <span className={styles.retro}>℞ Retrograde</span> : p.retrograde === false ? 'Direct' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Dasha timelines ────────────────────────────────────────────────────────

// The chart's own two-letter planet abbreviations (Su, Mo, Ra...), so the
// timeline reads the same way the Kundli does; other labels (Yogini names)
// are cut to their first three letters.
const PLANET_ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
const short = (label: string) => PLANET_ABBR[label] ?? label.slice(0, 3);

function PeriodBar<T extends PeriodView>({ periods, today, label }: { periods: T[]; today: string; label: (p: T) => string }) {
  const segs = timelineSegments(periods, today);
  const marker = todayMarkerPct(periods, today);
  if (!segs.length) return null;
  return (
    <div className={styles.timeline}>
      <div className={styles.bar} role="img" aria-label={`Timeline from ${fmtDay(periods[0].starts_at)} to ${fmtDay(periods[periods.length - 1].ends_at)}`}>
        {segs.map(s => (
          <div
            key={`${s.period.lord}-${s.period.starts_at}`}
            className={`${styles.segment} ${styles[`seg_${s.phase}`]}`}
            style={{ left: `${s.leftPct}%`, width: `${s.widthPct}%` }}
            title={`${label(s.period)}: ${fmtDay(s.period.starts_at)} – ${fmtDay(s.period.ends_at)}`}
            data-phase={s.phase}
          >
            {s.widthPct > 12 ? label(s.period) : s.widthPct > 4 ? short(label(s.period)) : ''}
          </div>
        ))}
        {marker !== null && <div className={styles.todayMarker} style={{ left: `${marker}%` }} aria-hidden="true" />}
      </div>
      <div className={styles.axis}>
        <span>{periods[0].starts_at.slice(0, 4)}</span>
        {marker !== null && <span>Today: {fmtDay(today)}</span>}
        <span>{periods[periods.length - 1].ends_at.slice(0, 4)}</span>
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: 'past' | 'current' | 'future' }) {
  return <span className={`${styles.phase} ${styles[`phase_${phase}`]}`}>{phase === 'current' ? 'Current' : phase === 'past' ? 'Past' : 'Upcoming'}</span>;
}

export function VimshottariTimeline({ chart, today = todayIso() }: { chart: ChartView | null; today?: string }) {
  const periods = vimshottari(chart);
  if (!periods.length) return <Unavailable what="The Vimshottari Dasha timeline" />;
  const current = currentPeriod(periods, today);
  return (
    <figure className={styles.figure} data-testid="dasha-vimshottari">
      <div className={styles.figureHeader}>
        <div><span className={styles.figureKicker}>Vimshottari Dasha</span><h3 className={styles.figureTitle}>Mahadasha timeline</h3></div>
      </div>
      <PeriodBar periods={periods} today={today} label={p => p.lord} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">Mahadasha</th><th scope="col">Starts</th><th scope="col">Ends</th><th scope="col">Length</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {periods.map(p => {
              const ph = phaseOf(p, today);
              return (
                <tr key={`${p.lord}-${p.starts_at}`} className={ph === 'current' ? styles.rowCurrent : undefined} data-phase={ph}>
                  <td className={styles.name}>{p.lord}</td><td>{fmtDay(p.starts_at)}</td><td>{fmtDay(p.ends_at)}</td>
                  <td>{periodYears(p).toFixed(1)} yrs</td><td><PhaseBadge phase={ph} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {current && current.antardashas.length > 0 && <AntardashaTable md={current} today={today} />}
      <figcaption className={styles.caption}>
        Dates are the Kundli Engine’s. “Current” is worked out from those dates against today’s date ({fmtDay(today)}), so it stays correct whenever you open the report.
      </figcaption>
    </figure>
  );
}

function AntardashaTable({ md, today }: { md: MahadashaView; today: string }) {
  return (
    <>
      <h4 className={styles.subTitle}>Antardashas within the current {md.lord} Mahadasha</h4>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="dasha-antardasha">
          <thead><tr><th scope="col">Antardasha</th><th scope="col">Starts</th><th scope="col">Ends</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {md.antardashas.map(a => {
              const ph = phaseOf(a, today);
              return (
                <tr key={`${a.lord}-${a.starts_at}`} className={ph === 'current' ? styles.rowCurrent : undefined} data-phase={ph}>
                  <td className={styles.name}>{md.lord} – {a.lord}</td><td>{fmtDay(a.starts_at)}</td><td>{fmtDay(a.ends_at)}</td><td><PhaseBadge phase={ph} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function YoginiTimeline({ chart, today = todayIso() }: { chart: ChartView | null; today?: string }) {
  const periods = cleanPeriods<YoginiView>(chart?.yogini);
  if (!periods.length) return <Unavailable what="The Yogini Dasha timeline" />;
  const label = (p: YoginiView) => p.yogini ?? p.lord;
  return (
    <figure className={styles.figure} data-testid="dasha-yogini">
      <div className={styles.figureHeader}>
        <div><span className={styles.figureKicker}>Yogini Dasha</span><h3 className={styles.figureTitle}>Yogini timeline</h3></div>
      </div>
      <PeriodBar periods={periods} today={today} label={label} />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th scope="col">Yogini</th><th scope="col">Lord</th><th scope="col">Starts</th><th scope="col">Ends</th><th scope="col">Status</th></tr></thead>
          <tbody>
            {periods.map(p => {
              const ph = phaseOf(p, today);
              return (
                <tr key={`${label(p)}-${p.starts_at}`} className={ph === 'current' ? styles.rowCurrent : undefined} data-phase={ph}>
                  <td className={styles.name}>{label(p)}</td><td>{p.lord}</td><td>{fmtDay(p.starts_at)}</td><td>{fmtDay(p.ends_at)}</td><td><PhaseBadge phase={ph} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

// ── Strength / doshas / per-planet facts ──────────────────────────────────

export function StrengthChart({ chart }: { chart: ChartView | null }) {
  const rows = strengthRows(chart);
  if (!rows.length) return <Unavailable what="Planetary strength (Shadbala)" />;
  const max = Math.max(...rows.map(r => Math.max(r.shadbala_rupas, r.min_required_rupas))) * 1.08;
  return (
    <figure className={styles.figure} data-testid="shadbala">
      <div className={styles.figureHeader}>
        <div><span className={styles.figureKicker}>Shadbala</span><h3 className={styles.figureTitle}>Planetary strength</h3></div>
      </div>
      <div className={styles.strengthList}>
        {rows.map(r => (
          <div key={r.planet} className={styles.strengthRow}>
            <span className={styles.strengthName}>{r.planet}</span>
            <div className={styles.strengthTrack} role="img" aria-label={`${r.planet}: ${r.shadbala_rupas.toFixed(2)} rupas, ${r.min_required_rupas.toFixed(2)} required`}>
              <div className={`${styles.strengthFill} ${r.is_strong === false ? styles.strengthFillWeak : ''}`} style={{ width: `${(r.shadbala_rupas / max) * 100}%` }} />
              <div className={styles.strengthReq} style={{ left: `${(r.min_required_rupas / max) * 100}%` }} />
            </div>
            <span className={styles.strengthValue}>
              {r.shadbala_rupas.toFixed(2)} / {r.min_required_rupas.toFixed(2)}
              {r.is_strong !== null && <> · {r.is_strong ? 'Strong' : 'Weak'}</>}
            </span>
          </div>
        ))}
      </div>
      <figcaption className={styles.caption}>
        Bar = total Shadbala in rupas; the dark tick = the classical minimum required for that planet. “Strong/Weak” is the Kundli Engine’s own verdict.
      </figcaption>
    </figure>
  );
}

function Status({ value, yes, no }: { value: boolean | null | undefined; yes: string; no: string }) {
  if (value === true) return <span className={`${styles.status} ${styles.statusYes}`}>{yes}</span>;
  if (value === false) return <span className={`${styles.status} ${styles.statusNo}`}>{no}</span>;
  return <span className={`${styles.status} ${styles.statusUnknown}`}>Not available</span>;
}

export function DoshaStatus({ chart }: { chart: ChartView | null }) {
  const d = chart?.doshas;
  if (!d) return <Unavailable what="The dosha summary" />;
  const phase = d.sade_sati?.phase;
  return (
    <figure className={styles.figure} data-testid="doshas">
      <div className={styles.figureHeader}>
        <div><span className={styles.figureKicker}>Dosha analysis</span><h3 className={styles.figureTitle}>Status in your chart</h3></div>
      </div>
      <div className={styles.doshaList}>
        <div className={styles.doshaRow}><span>Kaal Sarp Dosha</span><Status value={d.kaal_sarp?.present} yes="Present" no="Not present" /></div>
        <div className={styles.doshaRow}><span>Pitra Dosha</span><Status value={d.pitra?.present} yes="Present" no="Not present" /></div>
        <div className={styles.doshaRow}>
          <span>Sade Sati</span>
          <Status value={d.sade_sati?.active} yes={phase ? `Active — ${phase}` : 'Active'} no="Not active" />
        </div>
      </div>
      {chart?.as_of && (
        <figcaption className={styles.caption}>
          Sade Sati depends on Saturn’s transit, so it was computed as of {fmtDay(chart.as_of)}, when this report was prepared.
        </figcaption>
      )}
    </figure>
  );
}

export function PlanetFacts({ chart, planet }: { chart: ChartView | null; planet: string }) {
  const p = chart?.planets.find(x => x.planet === planet);
  if (!p) return <Unavailable what={`${planet}’s placement`} />;
  const s = chart?.planet_strength?.find(x => x.planet === planet);
  const facts: [string, string][] = [
    ['Sign', p.rashi],
    ['House', ordinal(p.house)],
    ['Degree', formatDms(p.degree_in_sign)],
    ['Nakshatra', p.nakshatra ? `${p.nakshatra}${p.nakshatra_pada ? `, pada ${p.nakshatra_pada}` : ''}` : '—'],
    ['Nakshatra lord', p.nakshatra_lord ?? '—'],
    ['Motion', p.retrograde === true ? 'Retrograde' : p.retrograde === false ? 'Direct' : '—'],
  ];
  if (s && Number.isFinite(s.shadbala_rupas)) facts.push(['Shadbala', `${s.shadbala_rupas.toFixed(2)} rupas`]);
  return (
    <dl className={styles.facts} data-testid={`facts-${planet.toLowerCase()}`} aria-label={`${planet} placement`}>
      {facts.map(([k, v]) => <div key={k} className={styles.fact}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

// ── Composites placed in the report ────────────────────────────────────────

export function BirthChartPlate({ chart, id = 'birth-chart', allowStyleToggle = true }: { chart: ChartView | null; id?: string; allowStyleToggle?: boolean }) {
  return (
    <section id={id} className={styles.plate} aria-labelledby={`${id}-title`} data-testid="birth-chart-plate">
      <header className={styles.plateHeader}>
        <span className={styles.figureKicker}>Your chart</span>
        <h2 id={`${id}-title`} className={styles.plateTitle}>Birth Chart</h2>
        <p className={styles.plateIntro}>
          The chart every section of this report is read from: your Lagna chart, your Navamsa, and where each planet stood at your birth.
        </p>
      </header>
      {hasD1(chart) && (
        <div className={styles.summaryChips}>
          <span className={styles.chip}>Lagna <b>{chart.lagna.rashi}</b></span>
          {(() => { const moon = chart.planets.find(p => p.planet === 'Moon'); return moon ? <span className={styles.chip}>Moon sign <b>{moon.rashi}</b></span> : null; })()}
          {chart.moon_nakshatra?.name && (
            <span className={styles.chip}>Birth nakshatra <b>{chart.moon_nakshatra.name}{chart.moon_nakshatra.pada ? `, pada ${chart.moon_nakshatra.pada}` : ''}</b></span>
          )}
        </div>
      )}
      <div className={styles.chartPair}>
        <D1Figure chart={chart} allowStyleToggle={allowStyleToggle} />
        {getVarga(chart, 'D9')
          ? <VargaFigure chart={chart} code="D9" caption="The 9th divisional chart, drawn from the Kundli Engine’s own Navamsa placements — not derived from the text." />
          : <Unavailable what="The Navamsa (D9) chart" />}
      </div>
      <PlanetaryPositionsTable chart={chart} />
    </section>
  );
}

export function VargaAppendix({ chart, id = 'divisional-charts' }: { chart: ChartView | null; id?: string }) {
  const codes = availableVargas(chart).filter(c => c !== 'D9'); // D9 is on the Birth Chart plate
  if (!codes.length) return null; // nothing real to show — don't add an empty appendix
  return (
    <section id={id} className={styles.plate} aria-labelledby={`${id}-title`} data-testid="varga-appendix">
      <header className={styles.plateHeader}>
        <span className={styles.figureKicker}>Appendix</span>
        <h2 id={`${id}-title`} className={styles.plateTitle}>Divisional Charts</h2>
        <p className={styles.plateIntro}>Every divisional (varga) chart the Kundli Engine computed for this birth, for reference.</p>
      </header>
      <div className={styles.vargaGrid}>
        {codes.map(code => <VargaFigure key={code} chart={chart} code={code} compact />)}
      </div>
    </section>
  );
}

/** The real-data visual at the top of a section (see sectionVisualKind), or nothing. */
export function SectionVisual({ sectionId, chart }: { sectionId: string; chart: ChartView | null }) {
  const kind = sectionVisualKind(sectionId, chart);
  if (!kind) return null;
  const code = SECTION_VARGA[sectionId];
  return (
    <div className={styles.sectionVisual} data-section-visual={sectionId}>
      {kind === 'strength' && <StrengthChart chart={chart} />}
      {kind === 'planet' && <PlanetFacts chart={chart} planet={PLANET_SECTION[sectionId]} />}
      {kind === 'doshas' && <DoshaStatus chart={chart} />}
      {kind === 'vimshottari' && <VimshottariTimeline chart={chart} />}
      {kind === 'yogini' && <YoginiTimeline chart={chart} />}
      {kind === 'varga' && (
        <VargaFigure chart={chart} code={code} caption={`${VARGA_LABELS[code] ?? code}, shown for reference beside this reading. Placements are the Kundli Engine’s.`} />
      )}
    </div>
  );
}

