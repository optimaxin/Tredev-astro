// KP (Krishnamurti Paddhati) sub-lord theory — the technique KP is actually
// built around: each 13°20' Nakshatra is divided into 9 unequal parts in
// exact Vimshottari-dasha proportion, starting from the Nakshatra's own
// lord and cycling through the same fixed 9-planet order used for dashas
// elsewhere in this codebase (vimshottariDasha.ts) — verified against a
// published worked example (Ashwini, ruled by Ketu: Ketu's own sub spans
// 800'*7/120 = 46'40", Venus's sub spans 800'*20/120 = 2°13'20", etc.).
//
// What this deliberately does NOT include: KP's Bhav Chalit house-cusp
// system (Placidus cusps) — that requires iterative spherical-astronomy
// house-division math this codebase has no verified implementation of, and
// getting it subtly wrong would silently produce wrong house placements.
// The sub-lord table below is computed for the whole-sign Ascendant point
// and each planet instead, which is what most simpler KP tools show when
// they don't compute full Bhav Chalit cusps either.
import type { Kundli } from './kundli.ts';
import type { PlanetId } from './ephemeris.ts';
import { NAKSHATRA_LORDS, getNakshatra, getRashi } from './zodiac.ts';
import { RASHI_LORD } from './gunMilan.ts';

const DASHA_ORDER = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'] as const;
const DASHA_YEARS: Record<string, number> = { ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17 };
const DAY_LORDS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']; // 0=Sunday..6=Saturday

function getSubLord(siderealLongitude: number): string {
  const span = 360 / 27;
  const nakIndex = Math.floor(siderealLongitude / span) % 27;
  const nakLord = NAKSHATRA_LORDS[nakIndex];
  const fractionInNakshatra = (siderealLongitude % span) / span;
  const startIndex = DASHA_ORDER.indexOf(nakLord as (typeof DASHA_ORDER)[number]);

  let cursor = 0;
  for (let i = 0; i < DASHA_ORDER.length; i++) {
    const lord = DASHA_ORDER[(startIndex + i) % DASHA_ORDER.length];
    cursor += DASHA_YEARS[lord] / 120;
    if (fractionInNakshatra < cursor || i === DASHA_ORDER.length - 1) return lord;
  }
  return nakLord; // unreachable
}

export interface KpRow {
  id: string;
  rashi: string;
  signLord: string;
  starLord: string;
  subLord: string;
}

export interface KpResult {
  table: KpRow[];
  rulingPlanets: {
    lagnaSignLord: string;
    lagnaStarLord: string;
    lagnaSubLord: string;
    moonSignLord: string;
    moonStarLord: string;
    moonSubLord: string;
    dayLord: string;
  };
}

function kpRow(id: string, longitude: number): KpRow {
  const rashi = getRashi(longitude);
  const nakshatra = getNakshatra(longitude);
  return { id, rashi: rashi.name, signLord: RASHI_LORD[rashi.index], starLord: nakshatra.lord, subLord: getSubLord(longitude) };
}

export function buildKpTable(kundli: Kundli, birthUtcDate: Date): KpResult {
  const table = [kpRow('asc', kundli.ascendant.longitude), ...kundli.planets.map(p => kpRow(p.id as PlanetId, p.longitude))];
  const lagna = table[0];
  const moon = table.find(r => r.id === 'moon')!;

  return {
    table,
    rulingPlanets: {
      lagnaSignLord: lagna.signLord,
      lagnaStarLord: lagna.starLord,
      lagnaSubLord: lagna.subLord,
      moonSignLord: moon.signLord,
      moonStarLord: moon.starLord,
      moonSubLord: moon.subLord,
      dayLord: DAY_LORDS[birthUtcDate.getUTCDay()],
    },
  };
}
