import { getPlanetaryPositions } from './ephemeris.ts';
import { getHouseFromAscendant, getRashi } from './zodiac.ts';
import type { Kundli } from './kundli.ts';

// Mangal Dosha (Manglik status) — the traditional rule: a chart is Manglik
// when Mars sits in house 1, 2, 4, 7, 8, or 12 counted from the Ascendant.
// (Some schools also check from the Moon or Venus; this implements the most
// widely-used Ascendant-based rule and says so explicitly rather than
// silently picking one convention.)
const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

export interface MangalDoshaResult {
  isManglik: boolean;
  marsHouse: number;
  rule: 'from-ascendant';
}

export function checkMangalDosha(kundli: Kundli): MangalDoshaResult {
  const mars = kundli.planets.find(p => p.id === 'mars')!;
  return { isManglik: MANGLIK_HOUSES.has(mars.house), marsHouse: mars.house, rule: 'from-ascendant' };
}

// Sade Sati — Saturn's transit through the 12th, 1st, or 2nd rashi counted
// from the natal Moon's rashi; a ~7.5 year period traditionally split into
// three phases (rising/peak/setting).
export interface SadeSatiResult {
  active: boolean;
  phase: 'rising' | 'peak' | 'setting' | null;
  moonRashi: string;
  saturnTransitRashi: string;
}

export function checkSadeSati(natalMoonRashiIndex: number, atDate: Date): SadeSatiResult {
  const positions = getPlanetaryPositions({ utcDate: atDate });
  const saturn = positions.find(p => p.id === 'saturn')!;
  const saturnRashi = getRashi(saturn.longitude);

  const offset = ((saturnRashi.index - natalMoonRashiIndex) % 12 + 12) % 12; // 0=same sign as Moon, 11=one before, 1=one after
  let phase: SadeSatiResult['phase'] = null;
  if (offset === 11) phase = 'rising'; // 12th from Moon
  else if (offset === 0) phase = 'peak'; // same sign as Moon
  else if (offset === 1) phase = 'setting'; // 2nd from Moon

  return {
    active: phase !== null,
    phase,
    moonRashi: getRashi(natalMoonRashiIndex * 30).name,
    saturnTransitRashi: saturnRashi.name,
  };
}

// Kaal Sarp Dosha — occurs when all 7 classical grahas (excluding the nodes
// themselves) sit within the same half of the zodiac bounded by Rahu and
// Ketu. Since the nodes are always exactly 180° apart, every other planet
// falls in exactly one of the two halves — the dosha is present only when
// they're ALL in the same half.
export interface KaalSarpDoshaResult {
  isKaalSarp: boolean;
  rahuRashi: string;
  ketuRashi: string;
  enclosedSide: 'rahu-to-ketu' | 'ketu-to-rahu' | null;
}

export function checkKaalSarpDosha(kundli: Kundli): KaalSarpDoshaResult {
  const rahu = kundli.planets.find(p => p.id === 'rahu')!;
  const ketu = kundli.planets.find(p => p.id === 'ketu')!;
  const others = kundli.planets.filter(p => p.id !== 'rahu' && p.id !== 'ketu');

  const forwardDistance = (from: number, to: number) => ((to - from) % 360 + 360) % 360;
  const onRahuToKetuSide = others.map(p => forwardDistance(rahu.longitude, p.longitude) < 180);
  const isKaalSarp = onRahuToKetuSide.every(v => v === onRahuToKetuSide[0]);

  return {
    isKaalSarp,
    rahuRashi: rahu.rashi,
    ketuRashi: ketu.rashi,
    enclosedSide: isKaalSarp ? (onRahuToKetuSide[0] ? 'rahu-to-ketu' : 'ketu-to-rahu') : null,
  };
}

// Rahu-Ketu Transit — where the currently-transiting nodes sit relative to
// the natal Moon's rashi. Unlike Sade Sati, classical sources disagree on
// which transit houses are favorable, so this reports the factual transit
// position rather than asserting a specific good/bad verdict per house.
export interface RahuKetuTransitResult {
  moonRashi: string;
  rahuTransitRashi: string;
  ketuTransitRashi: string;
  rahuHouseFromMoon: number;
  ketuHouseFromMoon: number;
}

export function checkRahuKetuTransit(natalMoonRashiIndex: number, atDate: Date): RahuKetuTransitResult {
  const positions = getPlanetaryPositions({ utcDate: atDate });
  const rahu = positions.find(p => p.id === 'rahu')!;
  const ketu = positions.find(p => p.id === 'ketu')!;
  const rahuRashi = getRashi(rahu.longitude);
  const ketuRashi = getRashi(ketu.longitude);

  return {
    moonRashi: getRashi(natalMoonRashiIndex * 30).name,
    rahuTransitRashi: rahuRashi.name,
    ketuTransitRashi: ketuRashi.name,
    rahuHouseFromMoon: getHouseFromAscendant(natalMoonRashiIndex, rahuRashi.index),
    ketuHouseFromMoon: getHouseFromAscendant(natalMoonRashiIndex, ketuRashi.index),
  };
}
