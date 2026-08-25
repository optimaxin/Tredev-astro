import type { ReactNode } from 'react';
import { NorthIndianChart, cap, ordinal, toChartPlanets } from './KundliCharts';
import type { KundliFullResult } from '../../services/calculatorService';
import chartStyles from './KundliSection.module.css';

// A dedicated, non-interactive, print-styled layout captured via
// html2canvas for the "Download PDF" feature (see handleDownloadPdf in
// KundliSection.tsx). Deliberately plain inline styles rather than the
// site's dark cosmic theme/CSS-module cards — a downloaded report should
// default to a light, ink-friendly page regardless of the viewer's current
// site theme, the same way browser print stylesheets do. The one shared
// piece is NorthIndianChart itself (from KundliCharts.tsx): reusing the
// exact same, already accuracy-verified component instead of re-drawing the
// chart means a future geometry/data fix never has to be applied twice.
//
// Rendered off-screen (see the wrapping div in KundliSection.tsx) — never
// shown to the user, only rasterized.
export default function KundliPrintLayout({ name, dob, tob, place, result }: { name: string; dob: string; tob: string; place: string; result: KundliFullResult }) {
  const chartPlanets = toChartPlanets(result.kundli);
  const noop = () => {};

  const gems = [result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune];
  const upcomingMahadashas = result.mahadashaTimeline.slice(0, 4);

  return (
    <div
      // Forces the SVG chart's light-mode color rules (the `[data-theme='light'] .svgBg` etc. selectors
      // in KundliSection.module.css are plain attribute selectors, not `:root`-scoped, so this works
      // regardless of the viewer's actual site theme) — see the module comment above.
      data-theme="light"
      style={{ width: 800, background: '#FAF7F0', color: '#182333', fontFamily: 'DM Sans, sans-serif', padding: 40 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #B58A3B', paddingBottom: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 28, color: '#182333' }}>{name}&apos;s Janam Kundli</div>
          <div style={{ fontSize: 13, color: '#68717A', marginTop: 4 }}>{dob} · {tob} · {place}</div>
        </div>
        <div style={{ fontSize: 12, color: '#B58A3B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>TredevAstro</div>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 28 }}>
        <div style={{ width: 320, flexShrink: 0 }}>
          <div className={chartStyles.svgWrap} style={{ maxWidth: 320 }}>
            <NorthIndianChart planets={chartPlanets} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <SectionTitle>Ascendant &amp; Moon</SectionTitle>
          <p style={{ fontSize: 13, lineHeight: 1.7, margin: '0 0 12px' }}>
            Ascendant (Lagna): <b>{result.kundli.ascendant.rashi}</b> · Moon Sign: <b>{result.kundli.planets.find(p => p.id === 'moon')?.rashi}</b> · Moon Nakshatra: <b>{result.kundli.moonNakshatra.name}</b> (Pada {result.kundli.moonNakshatra.pada})
          </p>
          <SectionTitle>Planetary Positions</SectionTitle>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#8C8A84', textTransform: 'uppercase', fontSize: 9 }}>
                <th style={{ padding: '3px 4px' }}>Planet</th><th style={{ padding: '3px 4px' }}>Sign</th><th style={{ padding: '3px 4px' }}>Degree</th><th style={{ padding: '3px 4px' }}>House</th>
              </tr>
            </thead>
            <tbody>
              {chartPlanets.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #E8DEC8' }}>
                  <td style={{ padding: '3px 4px' }}>{p.symbol} {p.name}</td>
                  <td style={{ padding: '3px 4px' }}>{p.sign}</td>
                  <td style={{ padding: '3px 4px' }}>{p.degree}{p.retrograde ? ' ℞' : ''}</td>
                  <td style={{ padding: '3px 4px' }}>{ordinal(p.house)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SectionTitle>Current &amp; Upcoming Mahadasha</SectionTitle>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 24 }}>
        <tbody>
          {upcomingMahadashas.map((period, i) => (
            <tr key={i} style={{ borderTop: '1px solid #E8DEC8', background: period.active ? '#F2EBD9' : undefined }}>
              <td style={{ padding: '5px 4px', fontWeight: period.active ? 700 : 400 }}>{cap(period.lord)} Mahadasha{period.active ? ' (current)' : ''}</td>
              <td style={{ padding: '5px 4px', color: '#68717A' }}>{period.startsAt} → {period.endsAt}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Dosha Summary</SectionTitle>
      <p style={{ fontSize: 12, lineHeight: 1.8, margin: '0 0 24px' }}>
        Manglik: <b>{result.doshas.mangal.isManglik ? 'Yes' : 'No'}</b>
        {' · '}Kaal Sarp Dosha: <b>{result.doshas.kaalSarp.isKaalSarp ? 'Yes' : 'No'}</b>
        {' · '}Sade Sati: <b>{result.doshas.sadeSati.active ? `Active (${result.doshas.sadeSati.phase})` : 'Not active'}</b>
      </p>

      <SectionTitle>Recommended Gemstones</SectionTitle>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 24 }}>
        <tbody>
          {gems.map(g => (
            <tr key={g.purpose} style={{ borderTop: '1px solid #E8DEC8' }}>
              <td style={{ padding: '5px 4px', color: '#8C8A84', fontSize: 10, textTransform: 'uppercase' }}>{g.purpose}</td>
              <td style={{ padding: '5px 4px', fontWeight: 600 }}>{g.gemstone} ({g.sanskritName})</td>
              <td style={{ padding: '5px 4px', color: '#68717A' }}>{g.metal} · {g.finger} finger</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SectionTitle>Rudraksha</SectionTitle>
      <p style={{ fontSize: 12, lineHeight: 1.8, margin: 0 }}>
        <b>{result.rudraksha.mukhi} Mukhi Rudraksha</b> — {result.rudraksha.reason}
      </p>

      <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #E8DEC8', fontSize: 10, color: '#8C8A84', textAlign: 'center' }}>
        Generated by TredevAstro — full charts, dashas, and remedies available at your account.
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 14, color: '#B58A3B', margin: '0 0 8px' }}>{children}</div>;
}
