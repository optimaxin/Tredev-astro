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

export interface AntardashaPeriod {
  lord: DashaLord;
  startsAt: string;
  endsAt: string;
}

export interface MahadashaPeriod {
  lord: DashaLord;
  startsAt: string; // ISO date (YYYY-MM-DD)
  endsAt: string;
  active: boolean;
  antardashas: AntardashaPeriod[];
}

function toDate(birthUtcDate: Date, years: number): string {
  return new Date(birthUtcDate.getTime() + years * DAYS_PER_YEAR * MS_PER_DAY).toISOString().slice(0, 10);
}

// Antardasha (sub-periods within a Mahadasha) — the classical rule is:
// start the same 9-planet cycle at the Mahadasha's own lord, and split its
// span proportionally by each sub-lord's own Vimshottari year-length (so a
// Mahadasha lord's own Antardasha always comes first and is the longest-
// weighted of the 9, since it repeats the Mahadasha/Antardasha match).
function getAntardashas(mahadashaLord: DashaLord, startsAt: string, endsAt: string): AntardashaPeriod[] {
  const startMs = new Date(startsAt).getTime();
  const totalMs = new Date(endsAt).getTime() - startMs;
  const startLordIndex = DASHA_ORDER.indexOf(mahadashaLord);

  const periods: AntardashaPeriod[] = [];
  let cursorMs = 0;
  for (let i = 0; i < DASHA_ORDER.length; i++) {
    const lord = DASHA_ORDER[(startLordIndex + i) % DASHA_ORDER.length];
    const durationMs = totalMs * (DASHA_YEARS[lord] / 120);
    const periodStartMs = startMs + cursorMs;
    const periodEndMs = periodStartMs + durationMs;
    periods.push({ lord, startsAt: new Date(periodStartMs).toISOString().slice(0, 10), endsAt: new Date(periodEndMs).toISOString().slice(0, 10) });
    cursorMs += durationMs;
  }
  return periods;
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

  const lord = DASHA_ORDER[lordIndex];
  const startsAt = toDate(birthUtcDate, cursorYears);
  const endsAt = toDate(birthUtcDate, cursorYears + periodYears);
  return { lord, startsAt, endsAt, active: true, antardashas: getAntardashas(lord, startsAt, endsAt) };
}

// The full life timeline: all 9 Mahadashas from birth through the end of the
// classical 120-year cycle, each flagged `active` if `atDate` falls inside
// it — lets a UI render the whole life's periods at once instead of just
// "what's active right now" (getCurrentMahadasha above).
export function getMahadashaTimeline(birthUtcDate: Date, moonNakshatraIndex: number, fractionElapsed: number, atDate: Date): MahadashaPeriod[] {
  const startLordIndex = DASHA_ORDER.indexOf(NAKSHATRA_LORDS[moonNakshatraIndex] as DashaLord);
  const elapsedYearsSinceBirth = (atDate.getTime() - birthUtcDate.getTime()) / MS_PER_DAY / DAYS_PER_YEAR;

  const periods: MahadashaPeriod[] = [];
  let cursorYears = 0;
  for (let i = 0; i < DASHA_ORDER.length; i++) {
    const lordIndex = (startLordIndex + i) % DASHA_ORDER.length;
    const lord = DASHA_ORDER[lordIndex];
    const periodYears = i === 0 ? (1 - fractionElapsed) * DASHA_YEARS[lord] : DASHA_YEARS[lord];
    const active = elapsedYearsSinceBirth >= cursorYears && elapsedYearsSinceBirth < cursorYears + periodYears;
    const startsAt = toDate(birthUtcDate, cursorYears);
    const endsAt = toDate(birthUtcDate, cursorYears + periodYears);
    periods.push({ lord, startsAt, endsAt, active, antardashas: getAntardashas(lord, startsAt, endsAt) });
    cursorYears += periodYears;
  }
  return periods;
}
