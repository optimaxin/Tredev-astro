import type { ReactNode } from 'react';
import { NorthIndianChart } from './KundliCharts';
import { INK, FAINT, GOLD, LINE, FONT } from './printTheme';
import chartStyles from './KundliSection.module.css';

// Presentational building blocks shared by the downloadable PDF layouts
// (KundliPrintLayout.tsx and PremiumReport/PremiumReportPrintLayout.tsx), so
// both reports carry the same numbered-section badges, sub-headings,
// key-value rows, tables and chart frames. Moved here unchanged from
// KundliPrintLayout.tsx.

export type SimplePlanets = Parameters<typeof NorthIndianChart>[0]['planets'];
type Language = 'en' | 'hi';

// A chart + its title, sized to sit several-to-a-block (NOT its own capture
// — callers place this inside a shared data-pdf-block grid). `small` is
// used for the dense 3-per-row "05 Charts" grid.
export function MiniChart({ title, planets, ascendantRashi, small, language = 'en' }: { title: string; planets: SimplePlanets; ascendantRashi: string; small?: boolean; language?: Language }) {
  const noop = () => {};
  return (
    <div>
      <div style={{ fontSize: small ? FONT.label : FONT.sub, fontWeight: 700, color: INK, textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <div className={chartStyles.svgWrap} style={{ maxWidth: small ? 200 : 320, margin: '0 auto' }}>
        <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} language={language} />
        {/* Every chart already has its own centered logo watermark
            (ChartWatermark, an SVG <image href> inside NorthIndianChart) —
            but html2canvas doesn't reliably rasterize an SVG-embedded
            external image reference, so it silently didn't survive capture
            here. A plain HTML <img> sibling does — this is PDF-only (the
            live site keeps using ChartWatermark, which renders fine in a
            real browser), so it doesn't touch the shared chart component. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
        <img src="/logo.png" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '22%', opacity: 0.14, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// Numbered gold-circle badge + bold title + rule — the reference's "01
// Basic" / "02 Kundli" style section marker.
export function SectionHeader({ num, title }: { num: string; title: string }) {
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
export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      <span style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</span>
    </div>
  );
}

// Dotted-underline label/value rows in a multi-column grid — the
// reference's "NAME ... Sparsh Bansal" key-value list style.
export function KVGrid({ cols, children }: { cols: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, columnGap: 24 }}>{children}</div>;
}

export function KVRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: `1px dotted ${LINE}` }}>
      <span style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: FONT.body, fontWeight: 600, color: INK, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
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

// Small gold uppercase label under a SubHeading (e.g. MAHADASHA / ANTARDASHA).
export function MinorHeading({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: FONT.label, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 6px' }}>{children}</div>;
}

export function ActiveBadge({ label }: { label: string }) {
  return <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', verticalAlign: 'middle' }}>{label}</span>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: '3px 4px' }}>{children}</td>;
}
