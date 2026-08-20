import { getPlanetaryPositions } from './ephemeris.ts';
import { getRashi } from './zodiac.ts';
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
