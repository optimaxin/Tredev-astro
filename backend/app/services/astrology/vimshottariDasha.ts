// Vimshottari Dasha — the standard 120-year planetary-period cycle used to
// time events in Vedic astrology. The sequence and each planet's period
// length are fixed classical values; the only per-person input is *where in
// the cycle you start*, which is derived from how far the Moon had already
// moved through its birth nakshatra.
import { NAKSHATRA_LORDS } from './zodiac.ts';

const DASHA_ORDER = ['ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury'] as const;
export type DashaLord = (typeof DASHA_ORDER)[number];

const DASHA_YEARS: Record<DashaLord, number> = {
  ketu: 7, venus: 20, sun: 6, moon: 10, mars: 7, rahu: 18, jupiter: 16, saturn: 19, mercury: 17,
};

const DAYS_PER_YEAR = 365.25;
const MS_PER_DAY = 86_400_000;

export interface MahadashaPeriod {
  lord: DashaLord;
  startsAt: string; // ISO date (YYYY-MM-DD)
  endsAt: string;
}

// `moonNakshatraIndex` is the Moon's nakshatra (0-26) at birth, and
// `fractionElapsed` is how far through that nakshatra's 13°20' span the Moon
// already was (0 = just entered, 1 = about to leave) — both come straight out
// of getNakshatra() in zodiac.ts, no new astronomy needed here.
export function getCurrentMahadasha(birthUtcDate: Date, moonNakshatraIndex: number, fractionElapsed: number, atDate: Date): MahadashaPeriod {
  const startLordIndex = DASHA_ORDER.indexOf(NAKSHATRA_LORDS[moonNakshatraIndex] as DashaLord);
  const elapsedYearsSinceBirth = (atDate.getTime() - birthUtcDate.getTime()) / MS_PER_DAY / DAYS_PER_YEAR;

  let lordIndex = startLordIndex;
  let periodYears = (1 - fractionElapsed) * DASHA_YEARS[DASHA_ORDER[lordIndex]];
  let cursorYears = 0;

  while (elapsedYearsSinceBirth >= cursorYears + periodYears) {
    cursorYears += periodYears;
    lordIndex = (lordIndex + 1) % DASHA_ORDER.length;
    periodYears = DASHA_YEARS[DASHA_ORDER[lordIndex]];
  }

  const toDate = (years: number) => new Date(birthUtcDate.getTime() + years * DAYS_PER_YEAR * MS_PER_DAY).toISOString().slice(0, 10);
  return { lord: DASHA_ORDER[lordIndex], startsAt: toDate(cursorYears), endsAt: toDate(cursorYears + periodYears) };
}
