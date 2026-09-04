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
// applied twice.
//
// Structure/section order modeled on a real commercial report
// (Extra/kundli.pdf): numbered section badges (01 Basic ... 07 Free
// Report), every divisional chart, full prediction text. Every section
// maps to a REAL field already computed by the backend — nothing here is
// invented text.
//
// Density: the FIRST version of this rebuild captured every chart and every
// prediction card as its OWN html2canvas block (~70-90 captures) — modeled
// too literally on the reference's "one item per page" layout. Each capture
// has real fixed overhead regardless of how small the content is, so that
// many of them made generation slow and, on some machines, made it fail
// outright before finishing. Charts and cards inside the SAME topic are
// still batched several-per-block (a grid captured as ONE image), keeping
// capture count down.
//
// Only the 7 NUMBERED sections (data-pdf-newpage on "01 Basic" ... "07 Free
// Report") force a fresh page — that's what "point 1, 2, 3..." means here.
// Everything under a numbered section (Shadbala, KP Cusps, Yogini Dasha,
// Rudraksha, etc.) still packs normally within that section's own pages —
// forcing EVERY sub-heading onto its own page was tried and produced too
// many mostly-blank pages; the generation effect's chapter-scoped packer
// (see KundliSection.tsx) fills each numbered section's pages tightly.
// Every one of the 20 divisional charts is included (05 Charts), so this
// is a real, full-length report, not a condensed one.
//
// Rendered off-screen (see the wrapping div in KundliSection.tsx) — never
// shown to the user, only rasterized.
const INK = '#182333', MUTED = '#68717A', FAINT = '#8C8A84', GOLD = '#B58A3B', LINE = '#E8DEC8', TINT = '#F2EBD9';
const FONT = { title: 30, section: 14, sub: 12.5, body: 11.5, label: 9.5 };

// Every divisional chart the app computes, in ascending order — D1/D9 are
// already shown in "02 Kundli" above, so only the rest appears here.
const DIVISIONAL_ORDER = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

type SimplePlanets = Parameters<typeof NorthIndianChart>[0]['planets'];

export default function KundliPrintLayout({ name, dob, tob, place, result }: { name: string; dob: string; tob: string; place: string; result: KundliFullResult }) {
  const chartPlanets = toChartPlanets(result.kundli, result.bhavChalit);
  const navamsaPlanets = toSimpleChartPlanets(result.navamsaChart);
  const bhavChalitPlanets = toSimpleChartPlanets(result.bhavChalit);
  const chandraPlanets: SimplePlanets = result.chandraChart.planets.map(p => ({
    id: p.id, symbol: '', name: '', sign: p.rashi, house: p.house, degree: undefined, decimalDegree: undefined, quality: '', retrograde: p.retrograde,
  }));

  const gems = [result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune];
  const presentYogas = result.yogas.filter(y => y.present);
  const moonSign = result.kundli.planets.find(p => p.id === 'moon')?.rashi ?? '—';
  const bhavHouseById = new Map(result.bhavChalit.planets.map(p => [p.id, p.house]));
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const ASHTAKAVARGA_GROUPS = [
    { label: 'SAV', points: result.ashtakavarga.sarva },
    ...['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].map(id => ({
      label: cap(id),
      points: result.ashtakavarga.bhinna.find(b => b.planet === id)?.points ?? [],
    })),
  ];

  const allCharts: { title: string; planets: SimplePlanets; ascendantRashi: string }[] = [
    { title: 'Chandra (Moon)', planets: chandraPlanets, ascendantRashi: result.chandraChart.moonRashi },
    ...DIVISIONAL_ORDER.map(key => {
      const varga = key === 'D9' ? result.navamsaChart : result.vargaCharts[key];
      if (!varga) return null;
      return { title: VARGA_LABELS[key] || key, planets: toSimpleChartPlanets(varga), ascendantRashi: varga.ascendant.rashi };
    }).filter((v): v is { title: string; planets: SimplePlanets; ascendantRashi: string } => v !== null),
  ];

  return (
    <div data-theme="light" style={{ width: 800, position: 'relative', background: '#FAF7F0' }}>
      <div style={{ position: 'relative', zIndex: 1, color: INK, fontFamily: 'DM Sans, sans-serif', padding: 40 }}>

        {/* Cover — its own dedicated first page (see data-pdf-cover: the
            generation effect forces a page break right after this block,
            regardless of how much room is left on the page). */}
        <div data-pdf-block data-pdf-cover="true" style={{ minHeight: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '50px 20px' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src="/logo.png" style={{ width: 96, height: 96, objectFit: 'contain', marginBottom: 22 }} />
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>TredevAstro · Vedic Astrology Report</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 40, color: INK, margin: '4px 0 14px', maxWidth: 560 }}>{name}&apos;s Kundli</div>
          <div style={{ fontSize: FONT.body, color: MUTED, marginBottom: 22 }}>{dob} · {tob} · {place}</div>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: FONT.label, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            Generated {generatedDate}
          </span>
        </div>

        {/* ── 01 Basic ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 24 }}>
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

        {/* ── 02 Kundli — D1 + D9 together in one block instead of two ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 22 }}>
          <SectionHeader num="02" title="Kundli" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <MiniChart title="Lagna Chart (D1)" planets={chartPlanets} ascendantRashi={result.kundli.ascendant.rashi} />
            <MiniChart title="Navamsa Chart (D9)" planets={navamsaPlanets} ascendantRashi={result.navamsaChart.ascendant.rashi} />
          </div>
        </div>

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

        {/* Mahadasha periods batched 3-per-block (was 1-per-block) — still
            small enough per block to never need the oversized-block split
            fallback, at a third of the capture count. */}
        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SubHeading>Vimshottari Dasha — Mahadasha</SubHeading>
        </div>
        {chunk(result.mahadashaTimeline, 3).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ marginBottom: 10 }}>
            {group.map((period, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 6px', background: period.active ? TINT : undefined, borderTop: `1px solid ${LINE}`, fontSize: FONT.body }}>
                  <span style={{ fontWeight: period.active ? 700 : 500 }}>{cap(period.lord)} Mahadasha{period.active ? ' (active)' : ''}</span>
                  <span style={{ color: MUTED }}>{period.startsAt} → {period.endsAt}</span>
                </div>
                <div style={{ paddingLeft: 14 }}>
                  {period.antardashas.map((sub, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 6px', fontSize: FONT.label, color: MUTED, borderBottom: `1px dashed ${LINE}` }}>
                      <span>{cap(sub.lord)} Antardasha</span><span>{sub.startsAt} → {sub.endsAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Shadbala/Bhavbala split into 2 blocks (was 1) — that combined
            block was one of the tallest in the report and packed poorly,
            leaving large blank gaps under it on whichever page it landed;
            splitting gives the page-fill packer more flexibility. */}
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
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 22 }}>
          <SectionHeader num="03" title="KP" />
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
            <MiniChart title="Bhav Chalit Chart" planets={bhavChalitPlanets} ascendantRashi={result.bhavChalit.ascendant.rashi} />
            <div>
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
          </div>
        </div>

        {/* KP Planets/Cusps split into 2 blocks (was 1) — same page-fill
            reasoning as the Shadbala/Bhavbala split above. */}
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

        {/* ── 04 Ashtakvarga — 8 grids (SAV + 7 grahas), 4 per block (was
            all 8 in one block — split for the same page-fill reasoning as
            Shadbala/KP above) ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8 }}>
          <SectionHeader num="04" title="Ashtakvarga" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Total bindus per rashi. SAV is the combined Sarvashtakvarga (total: {result.ashtakavarga.sarvaTotal}).</p>
        </div>
        {chunk(ASHTAKAVARGA_GROUPS, 4).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            {group.map(g => (
              <div key={g.label}>
                <div style={{ fontSize: FONT.label, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>{g.label}</div>
                <BinduGrid points={g.points} />
              </div>
            ))}
          </div>
        ))}

        {/* ── 05 Charts — every divisional chart the app computes, 6 per
            block (see DIVISIONAL_ORDER above) ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8 }}>
          <SectionHeader num="05" title="Charts" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Every divisional (varga) chart computed for this birth, plus a Moon-referenced Chandra chart.</p>
        </div>
        {chunk(allCharts, 6).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {group.map(c => <MiniChart key={c.title} title={c.title} planets={c.planets} ascendantRashi={c.ascendantRashi} small />)}
          </div>
        ))}

        {/* ── 06 Dasha — 4 prediction cards per block instead of 2 ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8 }}>
          <SectionHeader num="06" title="Dasha" />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>Each card describes one Mahadasha — what the ruling planet's house and sign placement mean while it runs.</p>
        </div>
        {chunk(result.dashaPredictions, 6).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {group.map(d => {
              const period = result.mahadashaTimeline.find(m => m.lord === d.lord);
              return (
                <PredictionCard key={d.lord} title={`${cap(d.lord)} Mahadasha${period?.active ? ' (Active)' : ''}`} subtitle={period ? `${period.startsAt} – ${period.endsAt}` : undefined} active={period?.active}>
                  {d.text}
                </PredictionCard>
              );
            })}
          </div>
        ))}

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
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 22 }}>
          <SectionHeader num="07" title="Free Report" />
          <SubHeading>Ascendant Predictions — {result.ascendantPredictions.ascendant}</SubHeading>
          <p style={{ fontSize: FONT.body, lineHeight: 1.7, margin: '0 0 12px' }}>{result.ascendantPredictions.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              ['Personality', result.ascendantPredictions.personality],
              ['Physical', result.ascendantPredictions.physical],
              ['Health', result.ascendantPredictions.health],
              ['Career', result.ascendantPredictions.career],
              ['Relationship', result.ascendantPredictions.relationship],
            ] as const).map(([label, text]) => (
              <PredictionCard key={label} title={label}>{text}</PredictionCard>
            ))}
          </div>
        </div>

        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SubHeading>Planetary Predictions</SubHeading>
        </div>
        {chunk(result.analysis.planets, 6).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {group.map(p => <PredictionCard key={p.id} title={`${cap(p.id)} Consideration`}>{p.text}</PredictionCard>)}
          </div>
        ))}

        {presentYogas.length > 0 && (
          <div data-pdf-block style={{ marginBottom: 22 }}>
            <SubHeading>Yoga Combinations</SubHeading>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {presentYogas.map(y => <PredictionCard key={y.name} title={y.name}>{y.description}</PredictionCard>)}
            </div>
          </div>
        )}

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Rudraksha Recommendation</SubHeading>
          <p style={{ fontSize: FONT.section, fontWeight: 700, margin: '0 0 4px' }}>{result.rudraksha.mukhi}-Mukhi Rudraksha — {result.rudraksha.deity}</p>
          <p style={{ fontSize: FONT.body, lineHeight: 1.6, margin: '0 0 8px', color: MUTED }}>Ruled by {cap(result.rudraksha.rulingPlanet)}. {result.rudraksha.reason}</p>
          <p style={{ fontSize: FONT.body, margin: '0 0 4px' }}><b>How to wear:</b> <span style={{ color: MUTED }}>{result.rudraksha.howToWear}</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
            <div>
              <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600 }}>Benefits</p>
              <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16 }}>
                {result.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600 }}>Precautions</p>
              <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16 }}>
                {result.rudraksha.precautions.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>Gemstone Recommendations</SubHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {gems.map(g => (
              <div key={g.purpose} style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', marginBottom: 2, letterSpacing: '0.05em' }}>{g.purpose}</div>
                <div style={{ fontSize: FONT.sub, fontWeight: 700 }}>{g.gemstone} ({g.sanskritName})</div>
                <div style={{ fontSize: FONT.label, color: MUTED, margin: '2px 0' }}>{g.metal} · {g.finger} finger</div>
                <div style={{ fontSize: FONT.label, fontStyle: 'italic', color: GOLD }}>{g.mantra}</div>
              </div>
            ))}
          </div>
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

        {/* Closing — its own dedicated last page (data-pdf-closing forces a
            page break BEFORE this block in the generation effect, the
            mirror image of data-pdf-cover above). */}
        <div data-pdf-block data-pdf-closing="true" style={{ minHeight: 620, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px' }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src="/logo.png" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 20, opacity: 0.9 }} />
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>Thank You For Reading</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 26, color: INK, margin: '4px 0 14px' }}>Your journey continues, {name}</div>
          <p style={{ fontSize: FONT.body, color: MUTED, maxWidth: 460, margin: '0 auto 22px', lineHeight: 1.7 }}>
            This report is a starting point, not the whole story. Log in to your TredevAstro account to revisit this Kundli anytime, or consult a verified astrologer for a deeper, personalised reading.
          </p>
          <div style={{ width: 48, height: 2, background: GOLD, margin: '0 0 14px' }} />
          <div style={{ fontSize: FONT.label, color: FAINT, letterSpacing: '0.08em' }}>TREDEVASTRO · YOUR SKY. YOUR STORY.</div>
        </div>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatDeg(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.round((degreeInSign - deg) * 60);
  return `${deg}° ${min}′`;
}

// A chart + its title, sized to sit several-to-a-block (NOT its own capture
// — callers place this inside a shared data-pdf-block grid). `small` is
// used for the dense 3-per-row "05 Charts" grid.
function MiniChart({ title, planets, ascendantRashi, small }: { title: string; planets: SimplePlanets; ascendantRashi: string; small?: boolean }) {
  const noop = () => {};
  return (
    <div>
      <div style={{ fontSize: small ? FONT.label : FONT.sub, fontWeight: 700, color: INK, textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <div className={chartStyles.svgWrap} style={{ maxWidth: small ? 200 : 320, margin: '0 auto' }}>
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
// reference's "NAME ... Sparsh Bansal" key-value list style.
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

// Compact 4-column bindu-count grid — a real, complete stand-in for the
// reference's diamond-shaped bindu charts (12 rashi x bindus, same data).
function BinduGrid({ points }: { points: { rashi: string; bindus: number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
      {points.map(p => (
        <div key={p.rashi} style={{ background: TINT, borderRadius: 4, padding: '3px 2px', textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: FAINT, textTransform: 'uppercase' }}>{p.rashi.slice(0, 3)}</div>
          <div style={{ fontSize: FONT.label, fontWeight: 700, color: INK }}>{p.bindus}</div>
        </div>
      ))}
    </div>
  );
}

// A bordered card for one prediction paragraph — used for Dasha, Ascendant,
// Planetary, and Yoga predictions alike (all real generated-from-real-
// placement text, never templated filler). Callers place several inside one
// shared data-pdf-block grid.
function PredictionCard({ title, subtitle, active, children }: { title: string; subtitle?: string; active?: boolean; children: ReactNode }) {
  return (
    <div style={{ border: `1px solid ${active ? GOLD : LINE}`, borderRadius: 8, padding: 10, background: active ? TINT : '#fff' }}>
      <div style={{ fontSize: FONT.sub, fontWeight: 700, color: INK }}>{title}</div>
      {subtitle && <div style={{ fontSize: FONT.label, color: MUTED, marginBottom: 4 }}>{subtitle}</div>}
      <p style={{ fontSize: FONT.label, lineHeight: 1.6, margin: subtitle ? 0 : '4px 0 0', color: MUTED }}>{children}</p>
    </div>
  );
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
