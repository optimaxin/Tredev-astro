// Pure data shaping for the Premium Report's chart visualizations.
//
// Rules this file exists to enforce:
//   • Every placement comes from the backend's ChartView, which is the
//     Kundli Engine chart Stage 6 persisted with the report. Nothing here
//     computes a placement: a planet sits in the house the ENGINE returned,
//     never one derived here from its sign or degree.
//   • Missing or malformed data yields `null` / an empty list, which the
//     components render as an explicit "unavailable" state — never a guess.
//   • The only arithmetic is date comparison (which Dasha period contains
//     today) and proportional bar widths — presentation, not astrology.
//
// Deliberately free of React, CSS and import.meta so it can be unit-tested
// under plain Node (see chartModel.test.ts).
import type { ChartPlanet } from '../../KundliSection/KundliCharts';
import type { ChartView, ChartPlanetView, MahadashaView, PeriodView, VargaView } from '../../../services/premiumReportService';

export const RASHIS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;

// Display order for tables and fact strips: the nine grahas in their
// conventional order, then the outer planets the engine also returns.
export const PLANET_ORDER = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Uranus', 'Neptune', 'Pluto'];

// The order the main site's Kundli PDF prints divisional charts in (its own
// DIVISIONAL_ORDER plus D9, which it prints next to D1).
export const VARGA_ORDER = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

const isRashi = (r: unknown): r is string => typeof r === 'string' && (RASHIS as readonly string[]).includes(r);
const isHouse = (h: unknown): h is number => Number.isInteger(h) && (h as number) >= 1 && (h as number) <= 12;

// The engine's display names map 1:1 onto the lowercase ids the shared chart
// component labels by ("Sun" -> "sun" -> "Su").
export const planetId = (name: string) => name.toLowerCase();

export function formatDecimalDegree(d: number | null | undefined): string | undefined {
  return typeof d === 'number' && Number.isFinite(d) ? `${d.toFixed(2)}°` : undefined;
}

// 25.7213 -> 25° 43′ 16″ — truncated to the second and unpadded, exactly as
// the Kundli PDF's own formatDeg() prints it, so the two reports agree.
export function formatDms(d: number | null | undefined): string {
  if (typeof d !== 'number' || !Number.isFinite(d) || d < 0 || d >= 30) return '—';
  const total = Math.floor(d * 3600);
  return `${Math.floor(total / 3600)}° ${Math.floor((total % 3600) / 60)}′ ${total % 60}″`;
}

// ── D1 ─────────────────────────────────────────────────────────────────────

/** True when there is enough real data to draw the D1 chart at all. */
export function hasD1(chart: ChartView | null | undefined): chart is ChartView {
  return !!chart && isRashi(chart.lagna?.rashi) && Array.isArray(chart.planets) && chart.planets.some(p => isRashi(p.rashi) && isHouse(p.house));
}

/** D1 planets (plus the Lagna marker in house 1) in the shared chart component's shape. */
export function toD1ChartPlanets(chart: ChartView): ChartPlanet[] {
  const asc: ChartPlanet = {
    id: 'asc', symbol: '', name: 'Ascendant', sign: chart.lagna.rashi, house: 1,
    decimalDegree: formatDecimalDegree(chart.lagna.degree_in_sign),
  };
  const planets = chart.planets
    .filter(p => isRashi(p.rashi) && isHouse(p.house))
    .map<ChartPlanet>(p => ({
      id: planetId(p.planet),
      symbol: '',
      name: p.planet,
      sign: p.rashi,
      house: p.house,                     // the engine's house, used as-is
      decimalDegree: formatDecimalDegree(p.degree_in_sign),
      retrograde: p.retrograde === true,
    }));
  return [asc, ...planets];
}

/** Planets grouped by the house they will be DRAWN in — what the tests assert against. */
export function groupByHouse(planets: ChartPlanet[]): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  for (let h = 1; h <= 12; h++) out[h] = [];
  for (const p of planets) if (isHouse(p.house)) out[p.house].push(p.id);
  return out;
}

/** Positions table rows, in conventional order. Rows with an invalid sign/house are skipped, not repaired. */
export function positionRows(chart: ChartView): ChartPlanetView[] {
  const rank = (n: string) => { const i = PLANET_ORDER.indexOf(n); return i === -1 ? 99 : i; };
  return chart.planets.filter(p => isRashi(p.rashi) && isHouse(p.house)).sort((a, b) => rank(a.planet) - rank(b.planet));
}

// ── Divisional charts ──────────────────────────────────────────────────────

/** A varga is drawable only if the engine returned its ascendant and at least one valid placement. */
export function getVarga(chart: ChartView | null | undefined, code: string): VargaView | null {
  const v = chart?.divisional_charts?.[code];
  if (!v || !isRashi(v.ascendant_rashi) || !Array.isArray(v.placements)) return null;
  const placements = v.placements.filter(p => typeof p.planet === 'string' && isRashi(p.rashi) && isHouse(p.house));
  return placements.length ? { ascendant_rashi: v.ascendant_rashi, placements } : null;
}

export function availableVargas(chart: ChartView | null | undefined): string[] {
  return VARGA_ORDER.filter(code => getVarga(chart, code) !== null);
}

export function toVargaChartPlanets(v: VargaView): ChartPlanet[] {
  return [
    { id: 'asc', symbol: '', name: 'Ascendant', sign: v.ascendant_rashi, house: 1 },
    ...v.placements.map<ChartPlanet>(p => ({ id: planetId(p.planet), symbol: '', name: p.planet, sign: p.rashi, house: p.house })),
  ];
}

// ── Dasha periods ──────────────────────────────────────────────────────────

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar day in YYYY-MM-DD (rejects "2026-02-30", which Date would silently roll over). */
export function isIsoDay(s: unknown): s is string {
  if (typeof s !== 'string') return false;
  const m = ISO_DAY.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Today in the viewer's own calendar, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type Phase = 'past' | 'current' | 'future';

// Half-open [start, end): the engine hands one period's end date to the next
// period as its start date, so the boundary day belongs to the new period.
// ISO dates compare correctly as strings once validated.
export function phaseOf(p: PeriodView, today: string): Phase {
  if (p.ends_at <= today) return 'past';
  if (p.starts_at <= today) return 'current';
  return 'future';
}

/** Valid periods only, in the order the engine returned them; an invalid one is dropped, never patched. */
export function cleanPeriods<T extends PeriodView>(list: T[] | null | undefined): T[] {
  return (list ?? []).filter(p => typeof p?.lord === 'string' && isIsoDay(p.starts_at) && isIsoDay(p.ends_at) && p.starts_at < p.ends_at);
}

export function currentPeriod<T extends PeriodView>(list: T[], today: string): T | null {
  return list.find(p => phaseOf(p, today) === 'current') ?? null;
}

const dayMs = (iso: string) => { const m = ISO_DAY.exec(iso)!; return Date.UTC(+m[1], +m[2] - 1, +m[3]); };

/** Length of a period in years (for labels), from its real dates. */
export function periodYears(p: PeriodView): number {
  return (dayMs(p.ends_at) - dayMs(p.starts_at)) / (365.2425 * 86400000);
}

/** Bar segments sized by each period's real length within the whole timeline. */
export function timelineSegments<T extends PeriodView>(list: T[], today: string): { period: T; phase: Phase; leftPct: number; widthPct: number }[] {
  if (!list.length) return [];
  const start = dayMs(list[0].starts_at), end = dayMs(list[list.length - 1].ends_at);
  const span = end - start;
  if (span <= 0) return [];
  return list.map(p => ({
    period: p,
    phase: phaseOf(p, today),
    leftPct: ((dayMs(p.starts_at) - start) / span) * 100,
    widthPct: ((dayMs(p.ends_at) - dayMs(p.starts_at)) / span) * 100,
  }));
}

/** Where "today" falls on that same timeline, or null if outside it. */
export function todayMarkerPct(list: PeriodView[], today: string): number | null {
  if (!list.length || !isIsoDay(today)) return null;
  const start = dayMs(list[0].starts_at), end = dayMs(list[list.length - 1].ends_at), t = dayMs(today);
  if (t < start || t >= end) return null;
  return ((t - start) / (end - start)) * 100;
}

export function vimshottari(chart: ChartView | null | undefined): MahadashaView[] {
  return cleanPeriods(chart?.vimshottari).map(md => ({ ...md, antardashas: cleanPeriods(md.antardashas) }));
}

// ── Strength ───────────────────────────────────────────────────────────────

export function strengthRows(chart: ChartView | null | undefined) {
  return (chart?.planet_strength ?? []).filter(
    s => typeof s.planet === 'string' && Number.isFinite(s.shadbala_rupas) && Number.isFinite(s.min_required_rupas) && s.min_required_rupas > 0
  );
}

// ── Section → visual mapping ───────────────────────────────────────────────
// Which real chart data sits next to which interpretation. The pairings are
// the standard classical associations the main site's own Charts tab already
// labels each varga with (VARGA_LABELS) — this adds no new astrological claim.

export const SECTION_VARGA: Record<string, string> = {
  marriage: 'D9',
  wealth: 'D2',
  children_family: 'D7',
  health: 'D6',
  career: 'D10',
  education: 'D24',
  spiritual: 'D20',
};

export const PLANET_SECTION: Record<string, string> = {
  planet_sun: 'Sun', planet_moon: 'Moon', planet_mars: 'Mars', planet_mercury: 'Mercury', planet_jupiter: 'Jupiter',
  planet_venus: 'Venus', planet_saturn: 'Saturn', planet_rahu: 'Rahu', planet_ketu: 'Ketu',
};

export type SectionVisualKind = 'strength' | 'planet' | 'doshas' | 'vimshottari' | 'yogini' | 'varga';

/**
 * Which real-data visual (if any) sits at the top of a section. Dasha sections
 * always get one — they show an explicit "unavailable" state when the data is
 * missing; the optional complements (strength, per-planet facts, doshas, a
 * related varga) appear only when their data is actually present.
 */
export function sectionVisualKind(sectionId: string, chart: ChartView | null | undefined): SectionVisualKind | null {
  if (sectionId === 'vimshottari_dasha') return 'vimshottari';
  if (sectionId === 'yogini_dasha') return 'yogini';
  if (sectionId === 'planetary_analysis') return strengthRows(chart).length ? 'strength' : null;
  if (sectionId === 'doshas') return chart?.doshas ? 'doshas' : null;
  const planet = PLANET_SECTION[sectionId];
  if (planet) return chart?.planets?.some(p => p.planet === planet) ? 'planet' : null;
  const code = SECTION_VARGA[sectionId];
  if (code) return getVarga(chart, code) ? 'varga' : null;
  return null;
}

/** The Birth Chart plate goes after this section — the attached Kundli PDF's "01 Basic → 02 Kundli" order. */
export const BIRTH_CHART_AFTER = 'panchang';
/** The divisional-charts appendix goes just before the closing disclaimer. */
export const VARGA_APPENDIX_BEFORE = 'disclaimer';
