import { getAscendant, getPlanetaryPositions, type PlanetId } from './ephemeris.ts';
import { getHouseFromAscendant, getNakshatra, getNavamsaSign, getRashi, RASHIS } from './zodiac.ts';

export interface BirthDetails {
  /** Birth date+time as a UTC JS Date — the caller converts local time to UTC. */
  utcDate: Date;
  latitude: number;
  longitude: number;
}

export interface ChartPlanet {
  id: PlanetId;
  longitude: number;
  rashi: string;
  degreeInSign: number;
  house: number;
  nakshatra: string;
  nakshatraPada: number;
  nakshatraLord: string;
  retrograde: boolean;
}

export interface Kundli {
  ascendant: {
    longitude: number;
    rashi: string;
    degreeInSign: number;
  };
  planets: ChartPlanet[];
  moonNakshatra: { name: string; pada: number; lord: string };
}

// The one place everything built so far (ephemeris + rashi/nakshatra +
// whole-sign houses) comes together into an actual chart. Every other
// calculator (Mangal Dosha, Sade Sati, Kundli Matching) is built from this.
export function generateKundli(birth: BirthDetails): Kundli {
  const ascendantLongitude = getAscendant(birth.utcDate, birth.latitude, birth.longitude);
  const ascendantRashi = getRashi(ascendantLongitude);
  const planetPositions = getPlanetaryPositions({ utcDate: birth.utcDate });

  const planets: ChartPlanet[] = planetPositions.map(p => {
    const rashi = getRashi(p.longitude);
    const nakshatra = getNakshatra(p.longitude);
    return {
      id: p.id,
      longitude: p.longitude,
      rashi: rashi.name,
      degreeInSign: rashi.degreeInSign,
      house: getHouseFromAscendant(ascendantRashi.index, rashi.index),
      nakshatra: nakshatra.name,
      nakshatraPada: nakshatra.pada,
      nakshatraLord: nakshatra.lord,
      retrograde: p.retrograde,
    };
  });

  const moon = planets.find(p => p.id === 'moon')!;

  return {
    ascendant: { longitude: ascendantLongitude, rashi: ascendantRashi.name, degreeInSign: ascendantRashi.degreeInSign },
    planets,
    moonNakshatra: { name: moon.nakshatra, pada: moon.nakshatraPada, lord: moon.nakshatraLord },
  };
}

export interface NavamsaChart {
  ascendant: { rashi: string };
  planets: { id: PlanetId; rashi: string; house: number }[];
}

// Navamsa (D9) — same whole-sign house logic as the main D1 chart, just
// built from each body's navamsa sign instead of its rashi sign.
export function getNavamsaChart(kundli: Kundli): NavamsaChart {
  const ascendantNavamsa = getNavamsaSign(kundli.ascendant.longitude);
  const planets = kundli.planets.map(p => {
    const navamsa = getNavamsaSign(p.longitude);
    return { id: p.id, rashi: navamsa.name, house: getHouseFromAscendant(ascendantNavamsa.index, navamsa.index) };
  });
  return { ascendant: { rashi: ascendantNavamsa.name }, planets };
}

export { RASHIS };
