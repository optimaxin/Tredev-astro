import type { ReactNode } from 'react';
import { NorthIndianChart, cap, ordinal, teaser, toChartPlanets, toSimpleChartPlanets } from './KundliCharts';
import { VARGA_LABELS } from '../../services/calculatorService';
import type { KundliFullResult } from '../../services/calculatorService';
import chartStyles from './KundliSection.module.css';

// A dedicated, non-interactive, print-styled layout captured via
// html2canvas for the "Download PDF" feature (see handleDownloadPdf in
// KundliSection.tsx). Deliberately plain inline styles rather than the
// site's dark cosmic theme/CSS-module cards — a downloaded report should
// default to a light, ink-friendly page regardless of the viewer's current
// site theme, the same way browser print stylesheets do. The chart
// components (NorthIndianChart) are the one shared piece with the live
// tabs: reusing the exact same, already accuracy-verified component instead
// of re-drawing the chart means a future geometry/data fix never has to be
// applied twice — and the logo watermark baked into that shared component
// (see KundliCharts.tsx's ChartWatermark) shows up here for free.
//
// Rendered off-screen (see the wrapping div in KundliSection.tsx) — never
// shown to the user, only rasterized. "Full detailed" report: every section
// the live 9-tab view has, condensed into one flowing document rather than
// picked-and-chosen highlights.
const INK = '#182333', MUTED = '#68717A', FAINT = '#8C8A84', GOLD = '#B58A3B', LINE = '#E8DEC8', TINT = '#F2EBD9';

// A small, deliberate type scale for the whole document — TITLE for the
// name heading, SECTION for each block's own heading, BODY for every real
// sentence/table cell (never smaller: sub-12px body copy is hard to read),
// and LABEL only for short uppercase micro-labels (field/column headers),
// the one place a smaller size is an established, legible pattern already
// used elsewhere on the site (e.g. .infoLabel/.dataRowHead).
const FONT = { title: 26, section: 14, body: 12, label: 10 };

export default function KundliPrintLayout({ name, dob, tob, place, result }: { name: string; dob: string; tob: string; place: string; result: KundliFullResult }) {
  const chartPlanets = toChartPlanets(result.kundli);
  const navamsaPlanets = toSimpleChartPlanets(result.navamsaChart);
  const noop = () => {};

  const gems = [result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune];
  const presentYogas = result.yogas.filter(y => y.present);
  const varga10 = result.vargaCharts['D10'];

  return (
    <div data-theme="light" style={{ width: 800, position: 'relative', background: '#FAF7F0' }}>
      {/* One faint brand mark repeating only DOWN the page (not a dense
          tiled grid) — roughly one per page's worth of height, so a
          multi-page report still gets a watermark on every page without it
          reading as "logo, logo, logo" wallpaper. Each chart also carries
          its own small watermark (KundliCharts.tsx's ChartWatermark) —
          deliberately not doubled up with a second overlapping mark here. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "url('/logo.png')", backgroundRepeat: 'repeat-y', backgroundPosition: 'center top',
          backgroundSize: '460px 460px', opacity: 0.025, zIndex: 0, pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, color: INK, fontFamily: 'DM Sans, sans-serif', padding: 40 }}>
        <div data-pdf-block style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: `2px solid ${GOLD}`, paddingBottom: 16, marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: FONT.title, color: INK }}>{name}&apos;s Janam Kundli</div>
            <div style={{ fontSize: FONT.body, color: MUTED, marginTop: 4 }}>{dob} · {tob} · {place}</div>
          </div>
          <div style={{ fontSize: FONT.body, color: GOLD, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TredevAstro</div>
        </div>

        {/* Each row is captured as ONE block (chart + its paired text stay
            together) — the two Sections nested inside opt out of also being
            their own block (noPdfBlock) so they aren't captured a second
            time on top of the row that already contains them. */}
        <div data-pdf-block style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
          <div style={{ width: 320, flexShrink: 0 }}>
            <div className={chartStyles.svgWrap} style={{ maxWidth: 320 }}>
              <NorthIndianChart planets={chartPlanets} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} />
            </div>
            <div style={{ fontSize: FONT.label, color: FAINT, textAlign: 'center', marginTop: 4 }}>D1 — Rashi (Birth Chart)</div>
          </div>
          <div style={{ flex: 1 }}>
            <Section title="Ascendant &amp; Moon" noPdfBlock>
              <p style={{ fontSize: FONT.body, lineHeight: 1.7, margin: 0 }}>
                Ascendant (Lagna): <b>{result.kundli.ascendant.rashi}</b> · Moon Sign: <b>{result.kundli.planets.find(p => p.id === 'moon')?.rashi}</b> · Moon Nakshatra: <b>{result.kundli.moonNakshatra.name}</b> (Pada {result.kundli.moonNakshatra.pada})
              </p>
            </Section>
            <Section title="Planetary Positions" noPdfBlock>
              <Table head={['Planet', 'Sign', 'Degree', 'House']}>
                {chartPlanets.map(p => (
                  <tr key={p.id} style={{ borderTop: `1px solid ${LINE}` }}>
                    <Td>{p.name}</Td><Td>{p.sign}</Td><Td>{p.degree}{p.retrograde ? ' ℞' : ''}</Td><Td>{ordinal(p.house)}</Td>
                  </tr>
                ))}
              </Table>
            </Section>
          </div>
        </div>

        <div data-pdf-block style={{ display: 'flex', gap: 24, marginBottom: 4 }}>
          <div style={{ width: 200, flexShrink: 0 }}>
            <div className={chartStyles.svgWrap} style={{ maxWidth: 200 }}>
              <NorthIndianChart planets={navamsaPlanets} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} />
            </div>
            <div style={{ fontSize: FONT.label, color: FAINT, textAlign: 'center', marginTop: 4 }}>D9 — Navamsa (Marriage)</div>
          </div>
          <div style={{ flex: 1 }}>
            <Section title="Avakhada Chakra" noPdfBlock>
              <Grid cols={2}>
                <Field label="Varna">{result.avakhada.varna}</Field>
                <Field label="Vashya">{result.avakhada.vashya}</Field>
                <Field label="Yoni">{result.avakhada.yoni}</Field>
                <Field label="Gana">{result.avakhada.gana}</Field>
                <Field label="Nadi">{result.avakhada.nadi}</Field>
                <Field label="Paya">{result.avakhada.paya}</Field>
                <Field label="Tatva">{result.avakhada.tatva}</Field>
                <Field label="Sign Lord">{cap(result.avakhada.signLord)}</Field>
                <Field label="Nakshatra Lord">{cap(result.avakhada.nakshatraLord)}</Field>
                <Field label="Charan (Pada)">{result.avakhada.pada}</Field>
              </Grid>
            </Section>
            {varga10 && (
              <Section title={VARGA_LABELS.D10} noPdfBlock>
                <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Ascendant: <b style={{ color: INK }}>{varga10.ascendant.rashi}</b></p>
              </Section>
            )}
          </div>
        </div>

        <Section title="Panchang at Birth">
          <Grid cols={3}>
            <Field label="Tithi">{result.panchang.tithi.paksha} {result.panchang.tithi.name}</Field>
            <Field label="Vara (Weekday)">{result.panchang.vara}</Field>
            <Field label="Yoga">{result.panchang.yoga}</Field>
            <Field label="Karana">{result.panchang.karana}</Field>
            <Field label="Nakshatra">{result.panchang.nakshatra.name} (Pada {result.panchang.nakshatra.pada})</Field>
            <Field label="Nakshatra Lord">{cap(result.panchang.nakshatra.lord)}</Field>
            {result.panchang.sunrise && <Field label="Sunrise">{result.panchang.sunrise}</Field>}
            {result.panchang.sunset && <Field label="Sunset">{result.panchang.sunset}</Field>}
            {result.panchang.rahuKaal && <Field label="Rahu Kaal">{result.panchang.rahuKaal.start} – {result.panchang.rahuKaal.end}</Field>}
          </Grid>
        </Section>

        <Section title="Ascendant Predictions">
          <p style={{ fontSize: FONT.body, lineHeight: 1.75, margin: '0 0 10px' }}>{result.ascendantPredictions.description}</p>
          {([
            ['Personality', result.ascendantPredictions.personality],
            ['Physical', result.ascendantPredictions.physical],
            ['Health', result.ascendantPredictions.health],
            ['Career', result.ascendantPredictions.career],
            ['Relationships', result.ascendantPredictions.relationship],
          ] as const).map(([label, text]) => (
            <p key={label} style={{ fontSize: FONT.body, lineHeight: 1.7, margin: '0 0 8px' }}><b>{label}:</b> {teaser(text, 130)}</p>
          ))}
          <p style={{ fontSize: FONT.body, lineHeight: 1.6, margin: '10px 0 0', padding: '8px 10px', background: TINT, borderRadius: 6, color: MUTED }}>
            This is a summary based on your chart, not the complete reading. For your full, personalized predictions, consult an expert astrologer on TredevAstro.
          </p>
        </Section>

        <Section title="Vimshottari Mahadasha (Full Timeline)">
          {result.mahadashaTimeline.map((period, i) => (
            <div key={i} style={{ marginBottom: 6, breakInside: 'avoid' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 6px', background: period.active ? TINT : undefined, borderTop: `1px solid ${LINE}`, fontSize: FONT.body }}>
                <span style={{ fontWeight: period.active ? 700 : 500 }}>{cap(period.lord)} Mahadasha{period.active ? ' (current)' : ''}</span>
                <span style={{ color: MUTED }}>{period.startsAt} → {period.endsAt}</span>
              </div>
              <div style={{ paddingLeft: 14 }}>
                {period.antardashas.map((sub, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', fontSize: FONT.body, color: MUTED, borderBottom: `1px dashed ${LINE}` }}>
                    <span>{cap(sub.lord)} Antardasha</span><span>{sub.startsAt} → {sub.endsAt}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Yogini Dasha">
          <Table head={['Period', 'Dates']}>
            {result.yoginiDashaTimeline.map((period, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${LINE}`, background: period.active ? TINT : undefined }}>
                <Td><b>{period.yogini}</b> Yogini ({cap(period.lord)}){period.active ? ' (current)' : ''}</Td>
                <Td>{period.startsAt} → {period.endsAt}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Dosha Summary">
          <Grid cols={2}>
            <Field label="Manglik Dosha">{result.doshas.mangal.isManglik ? `Yes (Mars in ${ordinal(result.doshas.mangal.marsHouse)} house)` : 'No'}</Field>
            <Field label="Kaal Sarp Dosha">{result.doshas.kaalSarp.isKaalSarp ? `Yes (${result.doshas.kaalSarp.rahuRashi} to ${result.doshas.kaalSarp.ketuRashi})` : 'No'}</Field>
            <Field label="Sade Sati">{result.doshas.sadeSati.active ? `Active — ${result.doshas.sadeSati.phase} phase` : 'Not currently active'}</Field>
            <Field label="Rahu-Ketu Transit">Rahu in {result.doshas.rahuKetuTransit.rahuTransitRashi} ({ordinal(result.doshas.rahuKetuTransit.rahuHouseFromMoon)} from Moon), Ketu in {result.doshas.rahuKetuTransit.ketuTransitRashi} ({ordinal(result.doshas.rahuKetuTransit.ketuHouseFromMoon)} from Moon)</Field>
          </Grid>
        </Section>

        {presentYogas.length > 0 && (
          <Section title="Yogas Present">
            {presentYogas.map(y => (
              <p key={y.name} style={{ fontSize: FONT.body, lineHeight: 1.6, margin: '0 0 6px' }}><b>{y.name}:</b> {y.description}</p>
            ))}
          </Section>
        )}

        <Section title="Sarvashtakavarga (Bindu Strength)">
          <Grid cols={4}>
            {result.ashtakavarga.sarva.map(s => (
              <Field key={s.rashi} label={s.rashi}>{s.bindus} bindus</Field>
            ))}
          </Grid>
        </Section>

        <Section title="Shadbala (Planetary Strength)">
          <Table head={['Planet', 'Total (Rupas)', 'Required', 'Verdict']}>
            {result.shadbala.planets.map(p => (
              <tr key={p.planet} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td>{cap(p.planet)}</Td><Td>{p.rupas.toFixed(2)}</Td><Td>{p.minRequiredRupas.toFixed(2)}</Td>
                <Td><span style={{ color: p.isStrong ? '#2E7D4F' : '#B05A2E' }}>{p.isStrong ? 'Strong' : 'Weak'}</span></Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="KP Sub-Lord Table">
          <Table head={['Point', 'Sign', 'Star Lord', 'Sub Lord']}>
            {result.kp.table.map(row => (
              <tr key={row.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td>{row.id === 'asc' ? 'Ascendant' : cap(row.id)}</Td><Td>{row.rashi} ({cap(row.signLord)})</Td><Td>{cap(row.starLord)}</Td><Td>{cap(row.subLord)}</Td>
              </tr>
            ))}
          </Table>
        </Section>

        <Section title="Recommended Gemstones">
          {gems.map(g => (
            <div key={g.purpose} style={{ borderTop: `1px solid ${LINE}`, padding: '8px 0' }}>
              <div style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', marginBottom: 2 }}>{g.purpose} — ruled by {cap(g.rulingPlanet)}</div>
              <div style={{ fontSize: FONT.section, fontWeight: 600 }}>{g.gemstone} ({g.sanskritName})</div>
              <div style={{ fontSize: FONT.body, color: MUTED, margin: '2px 0' }}>{g.metal} · {g.finger} finger · {g.color}</div>
              <div style={{ fontSize: FONT.body, fontStyle: 'italic', color: GOLD }}>{g.mantra}</div>
            </div>
          ))}
        </Section>

        <Section title="Rudraksha">
          <p style={{ fontSize: FONT.section, fontWeight: 600, margin: '0 0 4px' }}>{result.rudraksha.mukhi} Mukhi Rudraksha — {result.rudraksha.deity}</p>
          <p style={{ fontSize: FONT.body, lineHeight: 1.7, margin: '0 0 8px' }}>{result.rudraksha.reason}</p>
          <p style={{ fontSize: FONT.body, color: MUTED, margin: '0 0 4px' }}><b>How to wear:</b> {result.rudraksha.howToWear}</p>
          <ul style={{ fontSize: FONT.body, color: MUTED, margin: '4px 0', paddingLeft: 18 }}>
            {result.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </Section>

        <div data-pdf-block style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${LINE}`, fontSize: FONT.label, color: FAINT, textAlign: 'center' }}>
          Generated by TredevAstro — log in to your account to revisit this Kundli anytime.
        </div>
      </div>
    </div>
  );
}

// Every Section is its own capture block by default — the PDF-generation
// effect in KundliSection.tsx captures each [data-pdf-block] element
// separately and never splits one across a page boundary, which is what
// stops content being cut off mid-table/mid-paragraph. Pass noPdfBlock for
// a Section nested inside a row that's already its own block (the two chart
// rows above), so it isn't captured a second time.
function Section({ title, children, noPdfBlock }: { title: string; children: ReactNode; noPdfBlock?: boolean }) {
  return (
    <div {...(noPdfBlock ? {} : { 'data-pdf-block': true })} style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: FONT.section, color: GOLD, margin: '0 0 8px' }}>{title}</div>
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table style={{ width: '100%', fontSize: FONT.body, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: FONT.label }}>
          {head.map(h => <th key={h} style={{ padding: '3px 4px' }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: '3px 4px' }}>{children}</td>;
}

function Grid({ cols, children }: { cols: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ background: TINT, borderRadius: 6, padding: '6px 8px' }}>
      <div style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: FONT.body, color: INK }}>{children}</div>
    </div>
  );
}
