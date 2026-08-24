// Yogini Dasha — an 8-period, 36-year alternative to Vimshottari Dasha,
// timed from the same Moon-nakshatra birth position but a different cycle
// and different planetary lords. Starting Yogini formula (classical, from
// the Devi Bhagavata, cross-checked against multiple published sources):
// ((1-indexed nakshatra number) + 3) mod 8, remainder 0 = the 8th Yogini.
// The first period's balance is reduced by the same "fraction already
// elapsed through the birth nakshatra" used for Vimshottari — Yogini Dasha
// uses an identical proportional-balance rule, just against its own
// 36-year cycle instead of Vimshottari's 120-year one.
const YOGINI_ORDER = ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata'] as const;
const YOGINI_LORDS = ['moon', 'sun', 'jupiter', 'mars', 'mercury', 'saturn', 'venus', 'rahu'] as const;
const YOGINI_YEARS = [1, 2, 3, 4, 5, 6, 7, 8];

const DAYS_PER_YEAR = 365.25;
const MS_PER_DAY = 86_400_000;

export interface YoginiPeriod {
  yogini: string;
  lord: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

function toDate(birthUtcDate: Date, years: number): string {
  return new Date(birthUtcDate.getTime() + years * DAYS_PER_YEAR * MS_PER_DAY).toISOString().slice(0, 10);
}

export function getYoginiDashaTimeline(birthUtcDate: Date, moonNakshatraIndex: number, fractionElapsed: number, atDate: Date): YoginiPeriod[] {
  const nakshatraNumber = moonNakshatraIndex + 1; // classical formula uses 1-indexed nakshatra number
  const startIndex = (nakshatraNumber + 3) % 8;
  const elapsedYearsSinceBirth = (atDate.getTime() - birthUtcDate.getTime()) / MS_PER_DAY / DAYS_PER_YEAR;

  const periods: YoginiPeriod[] = [];
  let cursorYears = 0;
  for (let i = 0; i < YOGINI_ORDER.length; i++) {
    const idx = (startIndex + i) % YOGINI_ORDER.length;
    const periodYears = i === 0 ? (1 - fractionElapsed) * YOGINI_YEARS[idx] : YOGINI_YEARS[idx];
    const active = elapsedYearsSinceBirth >= cursorYears && elapsedYearsSinceBirth < cursorYears + periodYears;
    periods.push({
      yogini: YOGINI_ORDER[idx],
      lord: YOGINI_LORDS[idx],
      startsAt: toDate(birthUtcDate, cursorYears),
      endsAt: toDate(birthUtcDate, cursorYears + periodYears),
      active,
    });
    cursorYears += periodYears;
  }
  return periods;
}
