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
  degree?: string;
  decimalDegree?: string;
  quality?: string;
  retrograde?: boolean;
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

export function toChartPlanets(result: KundliResult): ChartPlanet[] {
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
    degree: formatDegree(p.degreeInSign),
    decimalDegree: formatDecimalDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
  return [asc, ...planets];
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

// House-number label sits near the polygon's own outermost vertex (pulled
// 20% back toward center), matching how printed charts keep the number in
// a corner of the cell rather than overlapping the planets in its middle.
function outerLabelPos(points: [number, number][]): [number, number] {
  let best = points[0], bestDist = -1;
  for (const p of points) {
    const d = (p[0] - NORTH_CENTER[0]) ** 2 + (p[1] - NORTH_CENTER[1]) ** 2;
    if (d > bestDist) { bestDist = d; best = p; }
  }
  return [best[0] + 0.2 * (NORTH_CENTER[0] - best[0]), best[1] + 0.2 * (NORTH_CENTER[1] - best[1])];
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
        const py = cy + Math.floor(idx / cols) * 22 - (Math.ceil(planetsInHouse.length / cols) > 1 ? 11 : 0);

        return (
          <g key={planet.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(planet, e)} onMouseLeave={onPlanetLeave}>
            <text x={px} y={py} textAnchor="middle" fontSize="11" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">
              {planet.symbol}
            </text>
            <text x={px} y={py + 10} textAnchor="middle" fontSize="6" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
              {planet.decimalDegree || ''}{planet.retrograde ? ' ℞' : ''}
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
              const px = x + 30 + (i % cols) * 32;
              const py = y + 45 + Math.floor(i / cols) * 26;
              return (
                <g key={p.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(p, e)} onMouseLeave={onPlanetLeave}>
                  <text x={px} y={py} textAnchor="middle" fontSize="11" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">{p.symbol}</text>
                  <text x={px} y={py + 10} textAnchor="middle" fontSize="6" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
                    {p.decimalDegree || ''}{p.retrograde ? ' ℞' : ''}
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
