import React from 'react';
import { PLANET_META } from '../../data/planetMeta';
import type { KundliResult } from '../../services/calculatorService';
import styles from './KundliSection.module.css';

// Shared chart-drawing/data-shaping pieces used both by the interactive
// KundliSection tabs and by the print/PDF export layout — kept in their own
// module (with no dependency on KundliSection.tsx) so the two can both
// import from here without a circular import between them.

export interface ChartPlanet {
  id: string;
  symbol: string;
  name: string;
  sign: string;
  house: number;
  // Real Bhav Chalit (Placidus cuspal) house — genuinely varies with exact
  // birth time/place, unlike `house` above (whole-sign, the same for anyone
  // sharing the same Ascendant+placement sign). Only populated for the D1
  // chart, where Bhav Chalit is meaningful; shown alongside `house` when the
  // two differ, so the real cuspal placement isn't hidden inside the
  // separate Bhav Chalit tab.
  bhavHouse?: number;
  degree?: string;
  decimalDegree?: string;
  quality?: string;
  retrograde?: boolean;
}

// Standard 2-letter Vedic-astrology abbreviations — the convention real
// astrologers already use on printed charts — shown on the chart itself
// instead of the Unicode planet glyphs (☉☽♂...), which look identical to a
// layperson and don't tell either a user or an astrologer which planet is
// which at a glance.
const PLANET_SHORT: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mercury: 'Me', venus: 'Ve', mars: 'Ma',
  jupiter: 'Ju', saturn: 'Sa', uranus: 'Ur', neptune: 'Ne', pluto: 'Pl',
  rahu: 'Ra', ketu: 'Ke', asc: 'As',
};

// Short, word-boundary-safe preview of a longer prediction paragraph. Used
// to intentionally withhold the full written reading from the free
// on-screen/PDF view — a "consult an astrologer" CTA is the path to the
// complete text, rather than dumping every paragraph up front.
export function teaser(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > maxLen * 0.4 ? lastSpace : maxLen)}…`;
}

export function formatDegree(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.round((degreeInSign - deg) * 60);
  return `${deg}°${min}'`;
}

// Compact decimal-degree label shown directly on the chart (e.g. "6.38°"),
// matching the reference report's own on-chart labeling convention.
export function formatDecimalDegree(degreeInSign: number): string {
  return `${degreeInSign.toFixed(2)}°`;
}

export function toChartPlanets(result: KundliResult, bhavChalit?: { planets: { id: string; house: number }[] }): ChartPlanet[] {
  const bhavHouseById = new Map((bhavChalit?.planets ?? []).map(p => [p.id, p.house]));
  const asc: ChartPlanet = {
    id: 'asc',
    ...PLANET_META.asc,
    sign: result.ascendant.rashi,
    house: 1,
    degree: formatDegree(result.ascendant.degreeInSign),
    decimalDegree: formatDecimalDegree(result.ascendant.degreeInSign),
  };
  const planets: ChartPlanet[] = result.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
    bhavHouse: bhavHouseById.get(p.id),
    degree: formatDegree(p.degreeInSign),
    decimalDegree: formatDecimalDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
  return [asc, ...planets];
}

// Converts any divisional-chart shape (Navamsa or the D2-D60 varga charts —
// which only carry a final sign + house, not the birth-degree D1 tracks)
// into the same ChartPlanet shape the visual chart renders, so every
// divisional chart gets an actual diagram, not just a text list.
export function toSimpleChartPlanets(chart: { ascendant: { rashi: string }; planets: { id: string; rashi: string; house: number }[] }): ChartPlanet[] {
  const asc: ChartPlanet = { id: 'asc', ...PLANET_META.asc, sign: chart.ascendant.rashi, house: 1 };
  const planets: ChartPlanet[] = chart.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
  }));
  return [asc, ...planets];
}

// Chandra chart carries the same real degrees/retrograde as D1 (same
// physical placements, just re-housed from the Moon) — no synthetic
// Ascendant entry here, since "house 1" in this chart is the Moon's own
// sign, not a separate rising point.
export function toChandraChartPlanets(chandra: { moonRashi: string; planets: { id: string; rashi: string; degreeInSign: number; house: number; retrograde: boolean }[] }): ChartPlanet[] {
  return chandra.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
    degree: formatDegree(p.degreeInSign),
    decimalDegree: formatDecimalDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
}

// ---- North Indian chart geometry, verified against real chart topology ----
// A square with both full corner-to-corner diagonals plus the diamond
// connecting the four edge midpoints. Together these create exactly 12
// regions: 4 "kite" quadrilaterals at the cardinal points (houses 1/4/7/10,
// the Kendras) and 8 corner triangles pairing up around each corner for the
// rest. House 1 (Lagna) is always the top kite.
//
// MIRROR FIX: an earlier pass here got the rotational direction backwards,
// placing house 2 clockwise (right) of house 1 based on an ambiguous
// websearch claim. Checked directly against real charts, this is mirrored —
// house 2 sits counter-clockwise (LEFT) of house 1, and house 12 to the
// right. Fixed by reflecting every polygon's x-coordinate (x -> 400-x):
// houses 1/7 are symmetric about that axis and land on themselves; houses
// 4/10 (the other two kites) swap positions; and (2,12), (3,11), (5,9),
// (6,8) each swap the same way. The decorative frame (both diagonals + the
// edge-midpoint diamond) is already symmetric under this mirror, so only
// this per-house coordinate table needed to change.
const NORTH_HOUSE_POLYGONS: Record<number, [number, number][]> = {
  1: [[300, 100], [200, 200], [100, 100], [200, 0]],
  2: [[200, 0], [100, 100], [0, 0]],
  3: [[100, 100], [0, 200], [0, 0]],
  4: [[100, 100], [200, 200], [100, 300], [0, 200]],
  5: [[100, 300], [0, 400], [0, 200]],
  6: [[100, 300], [200, 400], [0, 400]],
  7: [[300, 300], [200, 400], [100, 300], [200, 200]],
  8: [[300, 300], [400, 400], [200, 400]],
  9: [[400, 200], [400, 400], [300, 300]],
  10: [[400, 200], [300, 300], [200, 200], [300, 100]],
  11: [[400, 0], [400, 200], [300, 100]],
  12: [[400, 0], [300, 100], [200, 0]],
};
const NORTH_CENTER: [number, number] = [200, 200];

function polygonCentroid(points: [number, number][]): [number, number] {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

// House-number label sits near the polygon's own outermost vertex, pulled
// back toward THIS HOUSE'S OWN centroid (not the chart's shared global
// center) — matching how printed charts keep the number in a corner of the
// cell rather than overlapping the planets in its middle.
//
// BUG FIXED: pulling toward the shared global center instead of each
// house's own centroid put two houses' numbers at the EXACT same pixel
// whenever they picked the same outermost vertex — which happens for every
// pair of triangular houses that shares a chart corner (e.g. houses 2 & 3
// both reach for (0,0); every point on the straight line from that shared
// corner to the shared global center is identical for both houses, so the
// pulled-back point was identical too). House 3's number then painted
// directly on top of house 2's (drawn later in same-key order), making
// house 2 look like it had no number at all — and whichever one WAS
// visible sat exactly on the diagonal line, since (0,0) and the global
// center are themselves both on that diagonal. Each house's own centroid is
// never shared with its neighbor, so this can't recur.
function outerLabelPos(points: [number, number][]): [number, number] {
  let best = points[0], bestDist = -1;
  for (const p of points) {
    const d = (p[0] - NORTH_CENTER[0]) ** 2 + (p[1] - NORTH_CENTER[1]) ** 2;
    if (d > bestDist) { bestDist = d; best = p; }
  }
  const [cx, cy] = polygonCentroid(points);
  return [best[0] + 0.6 * (cx - best[0]), best[1] + 0.6 * (cy - best[1])];
}

// Faint centered brand mark behind the chart lines/planets — shared by both
// chart styles, and (since KundliPrintLayout reuses these same components)
// automatically present in the downloaded PDF's chart too, with no separate
// watermark logic needed there.
function ChartWatermark({ box }: { box: number }) {
  const size = box * 0.34;
  const pos = (box - size) / 2;
  return <image href="/logo.png" x={pos} y={pos} width={size} height={size} opacity={0.08} style={{ pointerEvents: 'none' }} />;
}

interface KundliChartProps {
  planets: ChartPlanet[];
  onPlanetHover: (p: ChartPlanet, e: React.MouseEvent) => void;
  onPlanetLeave: () => void;
  onHouseHover: (house: number, e: React.MouseEvent) => void;
  onHouseLeave: () => void;
}

export function NorthIndianChart({ planets, onPlanetHover, onPlanetLeave, onHouseHover, onHouseLeave }: KundliChartProps) {
  const BOX = 400;
  const planetsByHouse: Record<number, ChartPlanet[]> = {};
  planets.forEach(p => { (planetsByHouse[p.house] ||= []).push(p); });

  return (
    <svg viewBox={`0 0 ${BOX} ${BOX}`} width="100%" height="100%" className={styles.kundliSvg}>
      <rect width={BOX} height={BOX} className={styles.svgBg} rx="12" />
      <ChartWatermark box={BOX} />
      <rect x="2" y="2" width={BOX - 4} height={BOX - 4} fill="none" className={styles.chartBorder} strokeWidth="1" rx="10" />

      {/* The real structural frame: both diagonals plus the edge-midpoint diamond */}
      <line x1="0" y1="0" x2={BOX} y2={BOX} className={styles.chartLine} strokeWidth="0.8" />
      <line x1={BOX} y1="0" x2="0" y2={BOX} className={styles.chartLine} strokeWidth="0.8" />
      <polygon points="200,0 400,200 200,400 0,200" fill="none" className={styles.chartPolygon} strokeWidth="0.8" />

      {/* Invisible per-house hit areas, using the true polygon boundaries */}
      {Object.entries(NORTH_HOUSE_POLYGONS).map(([hStr, points]) => (
        <polygon
          key={`hover-${hStr}`}
          points={points.map(p => p.join(',')).join(' ')}
          fill="transparent"
          className={styles.houseHover}
          onMouseEnter={e => onHouseHover(Number(hStr), e)}
          onMouseLeave={onHouseLeave}
        />
      ))}

      {/* House numbers, anchored toward each cell's outer corner */}
      {Object.entries(NORTH_HOUSE_POLYGONS).map(([hStr, points]) => {
        const [lx, ly] = outerLabelPos(points);
        return (
          <text key={`num-${hStr}`} x={lx} y={ly + 3} textAnchor="middle" fontSize="9" className={styles.houseNumberText} fontFamily="DM Sans, sans-serif">
            {hStr}
          </text>
        );
      })}

      {/* Planets, stacked around each house's centroid */}
      {planets.map(planet => {
        const points = NORTH_HOUSE_POLYGONS[planet.house];
        if (!points) return null;
        const [cx, cy] = polygonCentroid(points);
        const planetsInHouse = planetsByHouse[planet.house] || [];
        const idx = planetsInHouse.indexOf(planet);
        const cols = planetsInHouse.length > 2 ? 2 : 1;
        const px = cx + (idx % cols) * 32 - ((cols - 1) * 16);
        const py = cy + Math.floor(idx / cols) * 24 - (Math.ceil(planetsInHouse.length / cols) > 1 ? 12 : 0);

        return (
          <g key={planet.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(planet, e)} onMouseLeave={onPlanetLeave}>
            <text x={px} y={py} textAnchor="middle" fontSize="11" fontWeight="600" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">
              {PLANET_SHORT[planet.id] || planet.name.slice(0, 2)}
            </text>
            <text x={px} y={py + 12} textAnchor="middle" fontSize="9" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
              {planet.decimalDegree || ''}{planet.retrograde ? ' ℞' : ''}
              {planet.bhavHouse !== undefined && planet.bhavHouse !== planet.house && (
                cols === 1
                  ? <tspan fill="var(--gold-primary)" fontWeight="700"> B{planet.bhavHouse}</tspan>
                  // 2-column houses (3+ planets) pack columns only 32px apart —
                  // the full " B<n>" suffix overflows into the neighbour
                  // column's text there, so fall back to a plain marker (exact
                  // Bhav number is still in the hover tooltip).
                  : <tspan fill="var(--gold-primary)" fontWeight="700">*</tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- South Indian chart — a fixed 4x4 grid where each of the 12 outer
// cells is permanently one rashi (never rotates with the Ascendant, unlike
// North Indian); the Ascendant is marked with a small corner notch inside
// whichever cell matches its sign. This is the other major regional chart
// format, requested alongside North Indian. ----
const SOUTH_GRID: (string | null)[][] = [
  ['Pisces', 'Aries', 'Taurus', 'Gemini'],
  ['Aquarius', null, null, 'Cancer'],
  ['Capricorn', null, null, 'Leo'],
  ['Sagittarius', 'Scorpio', 'Libra', 'Virgo'],
];

export function SouthIndianChart({ planets, ascendantRashi, onPlanetHover, onPlanetLeave }: { planets: ChartPlanet[]; ascendantRashi: string; onPlanetHover: (p: ChartPlanet, e: React.MouseEvent) => void; onPlanetLeave: () => void }) {
  const BOX = 400;
  const CELL = 100;
  const planetsByRashi: Record<string, ChartPlanet[]> = {};
  planets.filter(p => p.id !== 'asc').forEach(p => { (planetsByRashi[p.sign] ||= []).push(p); });

  return (
    <svg viewBox={`0 0 ${BOX} ${BOX}`} width="100%" height="100%" className={styles.kundliSvg}>
      <rect width={BOX} height={BOX} className={styles.svgBg} rx="12" />
      <ChartWatermark box={BOX} />
      <rect x="2" y="2" width={BOX - 4} height={BOX - 4} fill="none" className={styles.chartBorder} strokeWidth="1" rx="10" />

      {SOUTH_GRID.map((row, r) => row.map((rashi, c) => {
        const x = c * CELL, y = r * CELL;
        if (!rashi) return <rect key={`${r}-${c}`} x={x} y={y} width={CELL} height={CELL} fill="none" className={styles.chartMidLine} strokeWidth="0.6" />;
        const inHouse = planetsByRashi[rashi] || [];
        const isAscendant = rashi === ascendantRashi;
        return (
          <g key={rashi}>
            <rect x={x} y={y} width={CELL} height={CELL} fill="none" className={styles.chartBorder} strokeWidth="0.8" />
            <text x={x + 6} y={y + 13} fontSize="8" className={styles.zodiacText} fontFamily="DM Sans, sans-serif">{rashi.slice(0, 3)}</text>
            {isAscendant && <line x1={x} y1={y} x2={x + 22} y2={y + 22} className={styles.chartLine} strokeWidth="1.4" />}
            {inHouse.map((p, i) => {
              const cols = inHouse.length > 2 ? 2 : 1;
              const px = x + 30 + (i % cols) * 28;
              const py = y + 45 + Math.floor(i / cols) * 22;
              return (
                <g key={p.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(p, e)} onMouseLeave={onPlanetLeave}>
                  <text x={px} y={py} textAnchor="middle" fontSize="10" fontWeight="600" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">{PLANET_SHORT[p.id] || p.name.slice(0, 2)}</text>
                  <text x={px} y={py + 11} textAnchor="middle" fontSize="8" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
                    {p.decimalDegree || ''}{p.retrograde ? ' ℞' : ''}
                    {p.bhavHouse !== undefined && p.bhavHouse !== p.house && (
                      cols === 1
                        ? <tspan fill="var(--gold-primary)" fontWeight="700"> B{p.bhavHouse}</tspan>
                        : <tspan fill="var(--gold-primary)" fontWeight="700">*</tspan>
                    )}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }))}

      <text x={200} y={196} textAnchor="middle" fontSize="10" className={styles.zodiacText} fontFamily="DM Sans, sans-serif">South Indian</text>
      <text x={200} y={210} textAnchor="middle" fontSize="7" className={styles.houseNumberText} fontFamily="DM Sans, sans-serif">Asc: {ascendantRashi}</text>
    </svg>
  );
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
