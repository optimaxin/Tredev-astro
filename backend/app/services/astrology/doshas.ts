import { getPlanetaryPositions } from './ephemeris.ts';
import type { PlanetId } from './ephemeris.ts';
import { getHouseFromAscendant, getRashi, RASHIS } from './zodiac.ts';
import type { Kundli } from './kundli.ts';

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

// Pitra Dosha — a classical indicator of affliction to the ancestral/
// father's line in the birth chart. Traditional sources vary in exactly
// which combinations count, so this checks the most commonly cited ones:
// the Sun (karaka for father/ancestors) or the 9th house (house of father
// and lineage) afflicted by Rahu, Ketu, or Saturn — by conjunction (same
// house) or a classical whole-sign special aspect.
export type PitraDoshaReason =
  | 'sun-rahu-conjunction'
  | 'sun-ketu-conjunction'
  | 'sun-saturn-conjunction'
  | 'node-in-9th-house'
  | 'saturn-aspects-sun'
  | 'ninth-lord-afflicted';

export interface PitraDoshaResult {
  isPitraDosha: boolean;
  reasons: PitraDoshaReason[];
  sunRashi: string;
  sunHouse: number;
  rahuHouse: number;
  ketuHouse: number;
  saturnHouse: number;
  ninthLord: PlanetId;
  ninthLordRashi: string;
  ninthLordHouse: number;
}

// Every planet aspects the 7th house from itself (whole-sign); Saturn
// additionally aspects the 3rd and 10th — the classical Parashari special
// aspects used here (Mars/Jupiter have their own special aspects too, but
// only Saturn's are relevant to the conditions this checks).
const SATURN_SPECIAL_HOUSE_STEPS = [2, 6, 9]; // 3rd, 7th, 10th from Saturn's own house

function houseNSteps(fromHouse: number, steps: number): number {
  return ((fromHouse - 1 + steps) % 12) + 1;
}

const RASHI_LORDS: Record<(typeof RASHIS)[number], PlanetId> = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury',
  Libra: 'venus', Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

export function checkPitraDosha(kundli: Kundli): PitraDoshaResult {
  const byId = (id: PlanetId) => kundli.planets.find(p => p.id === id)!;
  const sun = byId('sun');
  const rahu = byId('rahu');
  const ketu = byId('ketu');
  const saturn = byId('saturn');

  const ascendantRashiIndex = getRashi(kundli.ascendant.longitude).index;
  const ninthRashiIndex = (ascendantRashiIndex + 8) % 12;
  const ninthRashiName = RASHIS[ninthRashiIndex];
  const ninthLordId = RASHI_LORDS[ninthRashiName];
  const ninthLord = byId(ninthLordId);
  const ninthHouse = 9;

  const saturnAspectedHouses = SATURN_SPECIAL_HOUSE_STEPS.map(s => houseNSteps(saturn.house, s));

  const reasons: PitraDoshaReason[] = [];
  if (sun.house === rahu.house) reasons.push('sun-rahu-conjunction');
  if (sun.house === ketu.house) reasons.push('sun-ketu-conjunction');
  if (sun.house === saturn.house) reasons.push('sun-saturn-conjunction');
  if (rahu.house === ninthHouse || ketu.house === ninthHouse) reasons.push('node-in-9th-house');
  if (saturnAspectedHouses.includes(sun.house) && sun.house !== saturn.house) reasons.push('saturn-aspects-sun');
  const ninthLordAfflicted =
    ninthLord.house === rahu.house || ninthLord.house === ketu.house || ninthLord.house === saturn.house ||
    (saturnAspectedHouses.includes(ninthLord.house) && ninthLord.house !== saturn.house);
  if (ninthLordAfflicted) reasons.push('ninth-lord-afflicted');

  return {
    isPitraDosha: reasons.length > 0,
    reasons,
    sunRashi: sun.rashi,
    sunHouse: sun.house,
    rahuHouse: rahu.house,
    ketuHouse: ketu.house,
    saturnHouse: saturn.house,
    ninthLord: ninthLordId,
    ninthLordRashi: ninthLord.rashi,
    ninthLordHouse: ninthLord.house,
  };
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
