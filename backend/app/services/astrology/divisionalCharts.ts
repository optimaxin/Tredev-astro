// The remaining Shodasavarga (16 divisional-chart) set beyond D1 (Rasi,
// kundli.ts) and D9 (Navamsa, zodiac.ts/kundli.ts): D2, D3, D4, D7, D10,
// D12, D16, D20, D24, D27, D30, D40, D45, D60 — plus D6 (Shashthamsa),
// which isn't part of the classical 16 but follows the exact same
// odd-same/even-7th-from shape as D7 and D10. Every starting-sign rule
// below was cross-checked against the open-source `jyotishganit` Python
// library (northtara/jyotishganit, MIT) AND independent published sources
// — EXCEPT Trimsamsa's (D30) even-sign boundaries, where jyotishganit's
// own even-sign branch contradicts the classical "exact reverse of the
// odd-sign order" rule quoted by multiple sources; the classical reversed
// order is used here instead (see trimsamsaSignIndex).
import type { Kundli } from './kundli.ts';
import type { PlanetId } from './ephemeris.ts';
import { getHouseFromAscendant, RASHIS } from './zodiac.ts';

type SignFn = (signIndex: number, degreeInSign: number) => number;

const MOVABLE = new Set([0, 3, 6, 9]); // Aries, Cancer, Libra, Capricorn
const FIXED = new Set([1, 4, 7, 10]); // Taurus, Leo, Scorpio, Aquarius
// everything else (2,5,8,11) is dual: Gemini, Virgo, Sagittarius, Pisces

// Most vargas reduce to "pick a base sign, then step forward one sign per
// division" — the base is either relative to the placement's own sign
// (Saptamsa, Dasamsa, Drekkana, Chaturthamsa) or a fixed anchor sign shared
// by every sign in a category (movable/fixed/dual, odd/even, or element) —
// only Hora (D2) and Trimsamsa (D30) don't fit this shape at all.
function dividedSign(degreeInSign: number, parts: number, base: number, step = 1): number {
  const partIndex = Math.floor(degreeInSign / (30 / parts)) % parts;
  return (base + partIndex * step) % 12;
}

function triplicityBase(signIndex: number, movable: number, fixed: number, dual: number): number {
  return MOVABLE.has(signIndex) ? movable : FIXED.has(signIndex) ? fixed : dual;
}

function elementBase(signIndex: number, fire: number, earth: number, air: number, water: number): number {
  const mod = signIndex % 4; // fire signs land on 0, earth on 1, air on 2, water on 3
  return mod === 0 ? fire : mod === 1 ? earth : mod === 2 ? air : water;
}

// Hora (D2) — every placement lands in either Leo (Sun's hora) or Cancer
// (Moon's hora); odd signs run Sun-half then Moon-half, even signs reversed.
function horaSignIndex(signIndex: number, degreeInSign: number): number {
  const isOddSign = signIndex % 2 === 0; // Aries etc. are "odd" in classical 1-indexed counting
  const inFirstHalf = degreeInSign < 15;
  const isSunHalf = isOddSign ? inFirstHalf : !inFirstHalf;
  return isSunHalf ? 4 : 3; // Leo : Cancer
}

// Trimsamsa (D30) — 5 unequal divisions per sign, each ruled by one of the
// 5 non-luminous planets; odd signs run Mars(5°)-Saturn(5°)-Jupiter(8°)-
// Mercury(7°)-Venus(5°), even signs the exact reverse: Venus(5°)-Mercury(7°)-
// Jupiter(8°)-Saturn(5°)-Mars(5°). Each planet's own sign in that half is used.
function trimsamsaSignIndex(signIndex: number, degreeInSign: number): number {
  const isOddSign = signIndex % 2 === 0;
  if (isOddSign) {
    if (degreeInSign < 5) return 0; // Aries — Mars
    if (degreeInSign < 10) return 10; // Aquarius — Saturn
    if (degreeInSign < 18) return 8; // Sagittarius — Jupiter
    if (degreeInSign < 25) return 2; // Gemini — Mercury
    return 6; // Libra — Venus
  }
  if (degreeInSign < 5) return 1; // Taurus — Venus
  if (degreeInSign < 12) return 5; // Virgo — Mercury
  if (degreeInSign < 20) return 11; // Pisces — Jupiter
  if (degreeInSign < 25) return 9; // Capricorn — Saturn
  return 7; // Scorpio — Mars
}

const VARGA_SIGN_FNS: Record<string, SignFn> = {
  D2: horaSignIndex,
  D3: (signIndex, deg) => dividedSign(deg, 3, signIndex, 4), // same sign, then +5th, +9th
  D4: (signIndex, deg) => dividedSign(deg, 4, signIndex, 3), // same, +4th, +7th, +10th
  D6: (signIndex, deg) => dividedSign(deg, 6, signIndex % 2 === 0 ? signIndex : (signIndex + 6) % 12), // odd sign, even 7th-from — same odd/even shape as D7/D10
  D7: (signIndex, deg) => dividedSign(deg, 7, signIndex % 2 === 0 ? signIndex : (signIndex + 6) % 12),
  D10: (signIndex, deg) => dividedSign(deg, 10, signIndex % 2 === 0 ? signIndex : (signIndex + 8) % 12),
  D12: (signIndex, deg) => dividedSign(deg, 12, signIndex),
  D16: (signIndex, deg) => dividedSign(deg, 16, triplicityBase(signIndex, 0, 4, 8)), // movable->Aries, fixed->Leo, dual->Sagittarius
  D20: (signIndex, deg) => dividedSign(deg, 20, triplicityBase(signIndex, 0, 8, 4)), // movable->Aries, fixed->Sagittarius, dual->Leo
  D24: (signIndex, deg) => dividedSign(deg, 24, signIndex % 2 === 0 ? 3 : 4), // even->Cancer, odd->Leo
  D27: (signIndex, deg) => dividedSign(deg, 27, elementBase(signIndex, 0, 3, 6, 9)), // fire/earth/air/water -> Aries/Cancer/Libra/Capricorn
  D30: trimsamsaSignIndex,
  D40: (signIndex, deg) => dividedSign(deg, 40, signIndex % 2 === 0 ? 0 : 6), // odd->Aries, even->Libra
  D45: (signIndex, deg) => dividedSign(deg, 45, triplicityBase(signIndex, 0, 4, 8)), // same anchors as D16
  D60: (signIndex, deg) => dividedSign(deg, 60, signIndex),
};

export interface VargaChart {
  ascendant: { rashi: string };
  planets: { id: PlanetId; rashi: string; house: number }[];
}

function buildVargaChart(kundli: Kundli, signFn: SignFn): VargaChart {
  const toSignIndex = (longitude: number) => Math.floor(longitude / 30) % 12;
  const toDegreeInSign = (longitude: number) => longitude % 30;

  const ascSignIndex = signFn(toSignIndex(kundli.ascendant.longitude), toDegreeInSign(kundli.ascendant.longitude));
  const planets = kundli.planets.map(p => {
    const pSignIndex = signFn(toSignIndex(p.longitude), toDegreeInSign(p.longitude));
    return { id: p.id, rashi: RASHIS[pSignIndex], house: getHouseFromAscendant(ascSignIndex, pSignIndex) };
  });
  return { ascendant: { rashi: RASHIS[ascSignIndex] }, planets };
}

export const VARGA_KEYS = Object.keys(VARGA_SIGN_FNS);

export function getAllVargaCharts(kundli: Kundli): Record<string, VargaChart> {
  const charts: Record<string, VargaChart> = {};
  for (const key of VARGA_KEYS) charts[key] = buildVargaChart(kundli, VARGA_SIGN_FNS[key]);
  return charts;
}
