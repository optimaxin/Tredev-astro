import { getAscendant, getPlanetaryPositions, type PlanetId } from './ephemeris.ts';
import { getHouseFromAscendant, getNakshatra, getRashi, RASHIS } from './zodiac.ts';

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

export { RASHIS };
