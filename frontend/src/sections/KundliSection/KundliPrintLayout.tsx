import type { ReactNode } from 'react';
import { NorthIndianChart, cap, ordinal, toChartPlanets, toSimpleChartPlanets } from './KundliCharts';
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
// Structure/section order modeled directly on a real commercial report
// (Extra/kundli.pdf) at the user's request: numbered section badges (01
// Basic, 02 Kundli, 03 KP, 04 Ashtakvarga, 05 Charts, 06 Dasha, 07 Free
// Report), every divisional chart on its own page, full (not teased)
// prediction text. Every section maps to a REAL field already computed by
// the backend — nothing here is invented text; a handful of columns the
// reference shows (Ascendant's own nakshatra, a Sun-referenced "Surya"
// chart, a second Rudraksha option, an Ascendant bindu grid) aren't
// computed by this app and are simply omitted rather than faked. Where we
// compute MORE than the reference shows (this app has 4 extra divisional
// charts — D5/D6/D8/D11 — that the sample PDF happens to skip), all of it
// is included: more real data, not less.
//
// Rendered off-screen (see the wrapping div in KundliSection.tsx) — never
// shown to the user, only rasterized.
const INK = '#182333', MUTED = '#68717A', FAINT = '#8C8A84', GOLD = '#B58A3B', LINE = '#E8DEC8', TINT = '#F2EBD9';
const FONT = { title: 30, section: 15, sub: 12.5, body: 12, label: 10 };

const DIVISIONAL_ORDER = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

export default function KundliPrintLayout({ name, dob, tob, place, result }: { name: string; dob: string; tob: string; place: string; result: KundliFullResult }) {
  const chartPlanets = toChartPlanets(result.kundli, result.bhavChalit);
  const navamsaPlanets = toSimpleChartPlanets(result.navamsaChart);
  const bhavChalitPlanets = toSimpleChartPlanets(result.bhavChalit);
  const chandraPlanets = result.chandraChart.planets.map(p => ({
    id: p.id, symbol: '', name: '', sign: p.rashi, house: p.house, degree: undefined, decimalDegree: undefined, quality: '', retrograde: p.retrograde,
  }));

  const gems = [result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune];
  const presentYogas = result.yogas.filter(y => y.present);
  const moonSign = result.kundli.planets.find(p => p.id === 'moon')?.rashi ?? '—';
  const bhavHouseById = new Map(result.bhavChalit.planets.map(p => [p.id, p.house]));
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const ASHTAKAVARGA_PLANETS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

  return (
    <div data-theme="light" style={{ width: 800, position: 'relative', background: '#FAF7F0' }}>
      <div style={{ position: 'relative', zIndex: 1, color: INK, fontFamily: 'DM Sans, sans-serif', padding: 40 }}>

        {/* Cover */}
        <div data-pdf-block style={{ textAlign: 'center', padding: '50px 20px 30px', borderBottom: `2px solid ${GOLD}`, marginBottom: 28 }}>
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>TredevAstro · Vedic Astrology Report</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: FONT.title, color: INK, margin: '4px 0 10px' }}>{name}&apos;s Kundli</div>
          <div style={{ fontSize: FONT.body, color: MUTED, marginBottom: 18 }}>{dob} · {tob} · {place}</div>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: FONT.label, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Generated {generatedDate}
          </span>
        </div>

        {/* ── 01 Basic ── */}
        <div data-pdf-block style={{ marginBottom: 24 }}>
          <SectionHeader num="01" title="Basic" />
          <SubHeading>Birth Details</SubHeading>
          <KVGrid cols={2}>
            <KVRow label="Name">{name}</KVRow>
            <KVRow label="Date of Birth">{dob}</KVRow>
            <KVRow label="Time of Birth">{tob}</KVRow>
            <KVRow label="Place of Birth">{place}</KVRow>
          </KVGrid>

          <SubHeading>Panchang</SubHeading>
          <KVGrid cols={2}>
            <KVRow label="Tithi">{result.panchang.tithi.paksha} {result.panchang.tithi.name}</KVRow>
            <KVRow label="Karana">{result.panchang.karana}</KVRow>
            <KVRow label="Yoga">{result.panchang.yoga}</KVRow>
            <KVRow label="Nakshatra">{result.kundli.moonNakshatra.name}</KVRow>
            <KVRow label="Nakshatra Lord">{cap(result.kundli.moonNakshatra.lord)}</KVRow>
            <KVRow label="Ascendant">{result.kundli.ascendant.rashi}</KVRow>
            {result.panchang.sunrise && <KVRow label="Sunrise">{result.panchang.sunrise}</KVRow>}
            {result.panchang.sunset && <KVRow label="Sunset">{result.panchang.sunset}</KVRow>}
          </KVGrid>

          <SubHeading>Avakhada Details</SubHeading>
          <KVGrid cols={3}>
            <KVRow label="Varna">{result.avakhada.varna}</KVRow>
            <KVRow label="Vashya">{result.avakhada.vashya}</KVRow>
            <KVRow label="Yoni">{result.avakhada.yoni}</KVRow>
            <KVRow label="Gan">{result.avakhada.gana}</KVRow>
            <KVRow label="Nadi">{result.avakhada.nadi}</KVRow>
            <KVRow label="Sign">{moonSign}</KVRow>
            <KVRow label="Sign Lord">{cap(result.avakhada.signLord)}</KVRow>
            <KVRow label="Charan">{result.avakhada.pada}</KVRow>
            <KVRow label="Tatva">{result.avakhada.tatva}</KVRow>
            <KVRow label="Paya">{result.avakhada.paya}</KVRow>
          </KVGrid>
        </div>

        {/* ── 02 Kundli ── */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SectionHeader num="02" title="Kundli" />
        </div>

        <ChartBlock title="Lagna Chart (D1)" planets={chartPlanets} ascendantRashi={result.kundli.ascendant.rashi} width={340} />
        <ChartBlock title="Navamsa Chart (D9)" planets={navamsaPlanets} ascendantRashi={result.navamsaChart.ascendant.rashi} width={340} />

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Planetary Positions</SubHeading>
          <Table head={['Planet', 'Sign', 'Nakshatra', 'Naksh Lord', 'Degree', 'Retro']}>
            <tr style={{ borderTop: `1px solid ${LINE}` }}>
              <Td><b>Ascendant</b></Td><Td>{result.kundli.ascendant.rashi}</Td><Td>—</Td><Td>—</Td><Td>{formatDeg(result.kundli.ascendant.degreeInSign)}</Td><Td>No</Td>
            </tr>
            {result.kundli.planets.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{cap(p.id)}</b></Td><Td>{p.rashi}</Td><Td>{p.nakshatra}</Td><Td>{cap(p.nakshatraLord)}</Td><Td>{formatDeg(p.degreeInSign)}</Td><Td>{p.retrograde ? 'Yes' : 'No'}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* Not wrapped in one block — 9 major periods (each with up to 10
            antardashas) made this the one section reliably taller than a
            whole page, forcing the oversized-block fallback and risking a
            visible cut mid-row. Each period is its own data-pdf-block
            instead, so the normal never-split placement path handles all
            of them. */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SubHeading>Vimshottari Dasha — Mahadasha</SubHeading>
        </div>
        {result.mahadashaTimeline.map((period, i) => (
          <div key={i} data-pdf-block style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 6px', background: period.active ? TINT : undefined, borderTop: `1px solid ${LINE}`, fontSize: FONT.body }}>
              <span style={{ fontWeight: period.active ? 700 : 500 }}>{cap(period.lord)} Mahadasha{period.active ? ' (active)' : ''}</span>
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

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Shadbala — Planetary Strength</SubHeading>
          <Table head={['Planet', 'Total (Rupas)', 'Required', 'Ratio', 'Verdict']}>
            {result.shadbala.planets.map(p => (
              <tr key={p.planet} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{cap(p.planet)}</b></Td><Td>{p.rupas.toFixed(2)}</Td><Td>{p.minRequiredRupas.toFixed(2)}</Td><Td>{(p.rupas / p.minRequiredRupas).toFixed(2)}</Td>
                <Td><span style={{ color: p.isStrong ? '#2E7D4F' : '#B05A2E', fontWeight: 600 }}>{p.isStrong ? 'Strong' : 'Weak'}</span></Td>
              </tr>
            ))}
          </Table>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Bhavbala — House Strength</SubHeading>
          <Table head={['House', 'Adhipati Bala', 'Dig Bala', 'Drik Bala', 'Total']}>
            {result.shadbala.houses.map(h => (
              <tr key={h.house} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>H{h.house}</b></Td><Td>{h.adhipatiBala.toFixed(1)}</Td><Td>{h.digBala.toFixed(1)}</Td><Td>{h.drikBala.toFixed(1)}</Td><Td>{h.total.toFixed(1)}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* ── 03 KP ── */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SectionHeader num="03" title="KP" />
        </div>

        <ChartBlock title="Bhav Chalit Chart" planets={bhavChalitPlanets} ascendantRashi={result.bhavChalit.ascendant.rashi} width={340} />

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Ruling Planets</SubHeading>
          <KVGrid cols={2}>
            <KVRow label="Asc Sign Lord">{cap(result.kp.rulingPlanets.lagnaSignLord)}</KVRow>
            <KVRow label="Asc Star Lord">{cap(result.kp.rulingPlanets.lagnaStarLord)}</KVRow>
            <KVRow label="Asc Sub Lord">{cap(result.kp.rulingPlanets.lagnaSubLord)}</KVRow>
            <KVRow label="Moon Sign Lord">{cap(result.kp.rulingPlanets.moonSignLord)}</KVRow>
            <KVRow label="Moon Star Lord">{cap(result.kp.rulingPlanets.moonStarLord)}</KVRow>
            <KVRow label="Moon Sub Lord">{cap(result.kp.rulingPlanets.moonSubLord)}</KVRow>
            <KVRow label="Day Lord">{cap(result.kp.rulingPlanets.dayLord)}</KVRow>
          </KVGrid>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>KP Planets</SubHeading>
          <Table head={['Planet', 'Bhav (Cusp)', 'Sign', 'Sign Lord', 'Star Lord', 'Sub Lord']}>
            {result.kp.table.filter(r => r.id !== 'asc').map(row => (
              <tr key={row.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{cap(row.id)}</b></Td><Td>{bhavHouseById.get(row.id) ?? '—'}</Td><Td>{row.rashi}</Td><Td>{cap(row.signLord)}</Td><Td>{cap(row.starLord)}</Td><Td>{cap(row.subLord)}</Td>
              </tr>
            ))}
          </Table>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>KP Cusps</SubHeading>
          <Table head={['Cusp', 'Degree', 'Sign', 'Sign Lord', 'Star Lord', 'Sub Lord']}>
            {result.kp.cusps.map((row, i) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{i + 1}</b></Td><Td>{formatDeg(result.bhavChalit.cusps[i]?.degreeInSign ?? 0)}</Td><Td>{row.rashi}</Td><Td>{cap(row.signLord)}</Td><Td>{cap(row.starLord)}</Td><Td>{cap(row.subLord)}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* ── 04 Ashtakvarga ── */}
        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SectionHeader num="04" title="Ashtakvarga" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: '0 0 12px' }}>Each grid shows the total bindus per rashi. SAV is the combined Sarvashtakvarga (total across all 7 grahas).</p>
          <SubHeading>SAV — Sarvashtakvarga (Total: {result.ashtakavarga.sarvaTotal})</SubHeading>
          <BinduGrid points={result.ashtakavarga.sarva} />
        </div>
        {ASHTAKAVARGA_PLANETS.map(planetId => {
          const bhinna = result.ashtakavarga.bhinna.find(b => b.planet === planetId);
          if (!bhinna) return null;
          return (
            <div key={planetId} data-pdf-block style={{ marginBottom: 22 }}>
              <SubHeading>{cap(planetId)}</SubHeading>
              <BinduGrid points={bhinna.points} />
            </div>
          );
        })}

        {/* ── 05 Charts ── */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SectionHeader num="05" title="Charts" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Each chart breaks the zodiac into a finer-grained division (D-X) used to read a different life area, plus two alternate reference points (Bhav Chalit's real cuspal houses, and a Moon-referenced Chandra chart).</p>
        </div>
        <ChartBlock title="Chandra (Moon) Chart" planets={chandraPlanets} ascendantRashi={result.chandraChart.moonRashi} width={340} />
        {DIVISIONAL_ORDER.map(key => {
          const varga = key === 'D9' ? result.navamsaChart : result.vargaCharts[key];
          if (!varga) return null;
          return (
            <ChartBlock
              key={key}
              title={VARGA_LABELS[key] || key}
              planets={toSimpleChartPlanets(varga)}
              ascendantRashi={varga.ascendant.rashi}
              width={340}
            />
          );
        })}

        {/* ── 06 Dasha ── */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SectionHeader num="06" title="Dasha" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Each card describes one Mahadasha — what the ruling planet's house and sign placement mean while it runs.</p>
        </div>
        <Grid2 items={result.dashaPredictions.map(d => {
          const period = result.mahadashaTimeline.find(m => m.lord === d.lord);
          return (
            <PredictionCard key={d.lord} title={`${cap(d.lord)} Mahadasha${period?.active ? ' (Active)' : ''}`} subtitle={period ? `${period.startsAt} – ${period.endsAt}` : undefined} active={period?.active}>
              {d.text}
            </PredictionCard>
          );
        })} />

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Yogini Dasha</SubHeading>
          <Table head={['Yogini', 'Lord', 'Start', 'End']}>
            {result.yoginiDashaTimeline.map((period, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${LINE}`, background: period.active ? TINT : undefined }}>
                <Td><b>{cap(period.yogini)}</b>{period.active ? ' (active)' : ''}</Td><Td>{cap(period.lord)}</Td><Td>{period.startsAt}</Td><Td>{period.endsAt}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* ── 07 Free Report ── */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SectionHeader num="07" title="Free Report" />
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Ascendant Predictions — {result.ascendantPredictions.ascendant}</SubHeading>
          <p style={{ fontSize: FONT.body, lineHeight: 1.75, margin: '0 0 12px' }}>{result.ascendantPredictions.description}</p>
        </div>
        <Grid2 items={([
          ['Personality', result.ascendantPredictions.personality],
          ['Physical', result.ascendantPredictions.physical],
          ['Health', result.ascendantPredictions.health],
          ['Career', result.ascendantPredictions.career],
          ['Relationship', result.ascendantPredictions.relationship],
        ] as const).map(([label, text]) => (
          <PredictionCard key={label} title={label}>{text}</PredictionCard>
        ))} />

        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SubHeading>Planetary Predictions</SubHeading>
        </div>
        <Grid2 items={result.analysis.planets.map(p => (
          <PredictionCard key={p.id} title={`${cap(p.id)} Consideration`}>{p.text}</PredictionCard>
        ))} />

        {presentYogas.length > 0 && (
          <div data-pdf-block style={{ marginBottom: 22 }}>
            <SubHeading>Yoga Combinations</SubHeading>
            <Grid2Inline items={presentYogas.map(y => (
              <PredictionCard key={y.name} title={y.name}>{y.description}</PredictionCard>
            ))} />
          </div>
        )}

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Rudraksha Recommendation</SubHeading>
          <p style={{ fontSize: FONT.section, fontWeight: 700, margin: '0 0 4px' }}>{result.rudraksha.mukhi}-Mukhi Rudraksha — {result.rudraksha.deity}</p>
          <p style={{ fontSize: FONT.body, lineHeight: 1.7, margin: '0 0 8px', color: MUTED }}>Ruled by {cap(result.rudraksha.rulingPlanet)}. {result.rudraksha.reason}</p>
          <p style={{ fontSize: FONT.body, margin: '0 0 4px' }}><b>How to wear:</b> <span style={{ color: MUTED }}>{result.rudraksha.howToWear}</span></p>
          <p style={{ fontSize: FONT.body, margin: '8px 0 2px', fontWeight: 600 }}>Benefits</p>
          <ul style={{ fontSize: FONT.body, color: MUTED, margin: '0 0 6px', paddingLeft: 18 }}>
            {result.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <p style={{ fontSize: FONT.body, margin: '8px 0 2px', fontWeight: 600 }}>Precautions</p>
          <ul style={{ fontSize: FONT.body, color: MUTED, margin: 0, paddingLeft: 18 }}>
            {result.rudraksha.precautions.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Gemstone Recommendations</SubHeading>
          {gems.map(g => (
            <div key={g.purpose} style={{ borderTop: `1px solid ${LINE}`, padding: '8px 0' }}>
              <div style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.06em' }}>{g.purpose} — ruled by {cap(g.rulingPlanet)}</div>
              <div style={{ fontSize: FONT.section, fontWeight: 700 }}>{g.gemstone} ({g.sanskritName})</div>
              <div style={{ fontSize: FONT.body, color: MUTED, margin: '2px 0' }}>{g.metal} · {g.finger} finger · {g.color}</div>
              <div style={{ fontSize: FONT.body, fontStyle: 'italic', color: GOLD }}>{g.mantra}</div>
            </div>
          ))}
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Dosha Analysis</SubHeading>
          <DoshaRow label="Manglik Dosha" active={result.doshas.mangal.isManglik} activeText="Manglik" inactiveText="Not Present">
            {result.doshas.mangal.isManglik ? `${name} is Manglik — Mars is in the ${ordinal(result.doshas.mangal.marsHouse)} house.` : `${name}'s chart is free from Manglik Dosha.`}
          </DoshaRow>
          <DoshaRow label="Kaal Sarp Dosha" active={result.doshas.kaalSarp.isKaalSarp} activeText="Present" inactiveText="Not Present">
            {result.doshas.kaalSarp.isKaalSarp ? `All planets fall between Rahu (${result.doshas.kaalSarp.rahuRashi}) and Ketu (${result.doshas.kaalSarp.ketuRashi}).` : 'Kundli is free from Kaal Sarp Dosha.'}
          </DoshaRow>
          <DoshaRow label="Sade Sati" active={result.doshas.sadeSati.active} activeText={`Active — ${result.doshas.sadeSati.phase}`} inactiveText="Not Active">
            {result.doshas.sadeSati.active ? `Saturn's Sade Sati is currently in its ${result.doshas.sadeSati.phase} phase.` : 'Sade Sati is not currently active.'}
          </DoshaRow>
        </div>

        {/* Closing */}
        <div data-pdf-block style={{ textAlign: 'center', padding: '40px 20px', borderTop: `2px solid ${GOLD}`, marginTop: 12 }}>
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Thank You For Reading</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 22, color: INK, margin: '4px 0 10px' }}>Your journey continues</div>
          <p style={{ fontSize: FONT.body, color: MUTED, maxWidth: 460, margin: '0 auto' }}>
            Generated by TredevAstro — log in to your account to revisit this Kundli anytime, or consult a verified astrologer for a deeper, personalised reading.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDeg(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.round((degreeInSign - deg) * 60);
  return `${deg}° ${min}′`;
}

// One chart + its title, always its own capture block — every chart in
// "05 Charts" is meant to read like its own page, matching the reference.
function ChartBlock({ title, planets, ascendantRashi, width }: { title: string; planets: Parameters<typeof NorthIndianChart>[0]['planets']; ascendantRashi: string; width: number }) {
  const noop = () => {};
  return (
    <div data-pdf-block style={{ marginBottom: 24 }}>
      <SubHeading>{title}</SubHeading>
      <div className={chartStyles.svgWrap} style={{ maxWidth: width, margin: '0 auto' }}>
        <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} />
      </div>
    </div>
  );
}

// Numbered gold-circle badge + bold title + rule — the reference's "01
// Basic" / "02 Kundli" style section marker.
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: GOLD, color: '#FAF7F0', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: INK }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );
}

// A gold accent bar + bold subtitle — the reference's "BIRTH DETAILS" /
// "PANCHANG" style sub-heading within a numbered section.
function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      <span style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</span>
    </div>
  );
}

// Dotted-underline label/value rows in a multi-column grid — the
// reference's "NAME ... Sparsh Bansal" key-value list style, replacing the
// old boxed-tile Field/Grid look.
function KVGrid({ cols, children }: { cols: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, columnGap: 24 }}>{children}</div>;
}

function KVRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: `1px dotted ${LINE}` }}>
      <span style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: FONT.body, fontWeight: 600, color: INK, textAlign: 'right' }}>{children}</span>
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

// 4-column bindu-count grid — a real, complete stand-in for the reference's
// diamond-shaped bindu charts (12 rashi x bindus, same data, simpler shape).
function BinduGrid({ points }: { points: { rashi: string; bindus: number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
      {points.map(p => (
        <div key={p.rashi} style={{ background: TINT, borderRadius: 6, padding: '5px 7px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: FAINT, textTransform: 'uppercase' }}>{p.rashi.slice(0, 3)}</div>
          <div style={{ fontSize: FONT.section, fontWeight: 700, color: INK }}>{p.bindus}</div>
        </div>
      ))}
    </div>
  );
}

// A bordered card for one prediction paragraph — used for Dasha, Ascendant,
// Planetary, and Yoga predictions alike (all real generated-from-real-
// placement text, never templated filler).
function PredictionCard({ title, subtitle, active, children }: { title: string; subtitle?: string; active?: boolean; children: ReactNode }) {
  return (
    <div style={{ border: `1px solid ${active ? GOLD : LINE}`, borderRadius: 8, padding: 12, background: active ? TINT : '#fff' }}>
      <div style={{ fontSize: FONT.section, fontWeight: 700, color: INK }}>{title}</div>
      {subtitle && <div style={{ fontSize: FONT.label, color: MUTED, marginBottom: 6 }}>{subtitle}</div>}
      <p style={{ fontSize: FONT.body, lineHeight: 1.7, margin: subtitle ? 0 : '6px 0 0', color: MUTED }}>{children}</p>
    </div>
  );
}

// Two-column card grid where each card is its OWN capture block (a page of
// 9 Dasha prediction cards is far taller than one PDF page) — mirrors the
// per-period-block pattern used for the Mahadasha timeline above.
function Grid2({ items }: { items: ReactNode[] }) {
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <>
      {rows.map((row, i) => (
        <div key={i} data-pdf-block style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {row}
        </div>
      ))}
    </>
  );
}

// Same 2-column layout as Grid2, but inline (not its own set of capture
// blocks) — for short lists already living inside a parent data-pdf-block
// (e.g. Yoga Combinations, which is rarely more than 2-3 cards).
function Grid2Inline({ items }: { items: ReactNode[] }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{items}</div>;
}

function DoshaRow({ label, active, activeText, inactiveText, children }: { label: string; active: boolean; activeText: string; inactiveText: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: FONT.label, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: active ? '#B23A3A' : '#2E7D4F', background: active ? 'rgba(214,69,69,0.12)' : 'rgba(46,125,79,0.12)' }}>
          {active ? activeText : inactiveText}
        </span>
      </div>
      <p style={{ fontSize: FONT.body, color: MUTED, margin: '4px 0 0' }}>{children}</p>
    </div>
  );
}
