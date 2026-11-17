// Daily Horoscope — a real transit snapshot, not a fabricated fortune-cookie
// paragraph. Uses the caller's Moon Sign (Rashi) as the reference point (the
// standard Vedic convention for rashi-based prediction columns) and reports
// where every planet is actually transiting today, counted as houses from
// that Rashi — the same whole-sign-house math used everywhere else in this
// app. The frontend supplies the interpretation of each house; this returns
// only real, freshly-computed positions.
import { getPlanetaryPositions } from './ephemeris.ts';
import { getHouseFromAscendant, getRashi, RASHIS } from './zodiac.ts';

export interface DailyTransitEntry {
  id: string;
  rashi: string;
  house: number;
  retrograde: boolean;
}

export interface DailyHoroscopeResult {
  moonSignRashi: string;
  date: string;
  transits: DailyTransitEntry[];
}

export function getDailyHoroscope(moonSignRashi: string, atDate: Date): DailyHoroscopeResult {
  const rashiIndex = RASHIS.indexOf(moonSignRashi as (typeof RASHIS)[number]);
  if (rashiIndex === -1) throw new Error(`Unknown rashi: ${moonSignRashi}`);

  const positions = getPlanetaryPositions({ utcDate: atDate });
  const transits: DailyTransitEntry[] = positions.map(p => {
    const rashi = getRashi(p.longitude);
    return { id: p.id, rashi: rashi.name, house: getHouseFromAscendant(rashiIndex, rashi.index), retrograde: p.retrograde };
  });

  return { moonSignRashi, date: atDate.toISOString().slice(0, 10), transits };
}
