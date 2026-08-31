// Real Panchang — the 5 "angas" (Tithi, Vara, Nakshatra, Yoga, Karana) plus
// sunrise/sunset, Rahu Kaal, and Abhijit Muhurat. All derived from real Sun/
// Moon positions and a real sunrise/sunset calculation (astronomia's
// `sunrise` module) — no field here is hardcoded per date.
import { julian, sunrise as sunriseModule } from 'astronomia';
import { getPlanetaryPositions } from './ephemeris.ts';
import { getNakshatra, getRashi } from './zodiac.ts';
import { getMoonRiseSet } from './swissEphemeris.ts';

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami',
  'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shoola', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha',
  'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

// 7 movable karanas repeat 8 times (56 half-tithis) between two fixed
// bookends of the lunar month: Kimstughna always opens it, Shakuni/
// Chatushpada/Naga always close it — 1 + 56 + 3 = 60 half-tithis total.
const KARANA_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];
function karanaName(halfTithiIndex: number): string {
  if (halfTithiIndex === 0) return 'Kimstughna';
  if (halfTithiIndex >= 57) return ['Shakuni', 'Chatushpada', 'Naga'][halfTithiIndex - 57];
  return KARANA_MOVABLE[(halfTithiIndex - 1) % 7];
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Sarvartha Siddhi Yoga — a fixed table of which weekday + Moon-Nakshatra
// combinations qualify, cross-checked against 2 independent published
// tables (drikpanchang.com's own definition page and a second aggregator;
// both agreed verbatim on every weekday's nakshatra list).
const SARVARTHA_SIDDHI: Record<number, string[]> = {
  0: ['Hasta', 'Mula', 'Uttara Phalguni', 'Uttara Ashadha', 'Uttara Bhadrapada', 'Pushya', 'Ashlesha'],
  1: ['Shravana', 'Rohini', 'Mrigashira', 'Pushya', 'Anuradha'],
  2: ['Ashwini', 'Uttara Bhadrapada', 'Krittika', 'Ashlesha'],
  3: ['Rohini', 'Anuradha', 'Hasta', 'Krittika', 'Mrigashira'],
  4: ['Revati', 'Anuradha', 'Ashwini', 'Punarvasu', 'Pushya'],
  5: ['Revati', 'Anuradha', 'Ashwini', 'Punarvasu', 'Shravana'],
  6: ['Hasta', 'Krittika', 'Rohini', 'Mrigashira', 'Anuradha'],
};

// Amrit Kaal — a fixed per-Nakshatra offset table (classical "Amrita
// Gadiyas"), verified end-to-end against a real published Panchang: for
// Shatabhisha on 2026-08-28 (nakshatra span computed independently via this
// codebase's own Moon ephemeris), this table + formula reproduces the
// published 19:44-21:23 IST window to the minute.
// start = nakshatraStart + (offsetHours/24) * nakshatraDurationHours
// duration = nakshatraDurationHours * 1.6/24
const AMRIT_KAAL_OFFSET_HOURS: Record<string, number> = {
  Ashwini: 16.8, Bharani: 19.2, Krittika: 21.6, Rohini: 20.8, Mrigashira: 15.2,
  Ardra: 14, Punarvasu: 21.6, Pushya: 17.6, Ashlesha: 22.4, Magha: 21.6,
  'Purva Phalguni': 17.6, 'Uttara Phalguni': 16.8, Hasta: 18, Chitra: 17.6,
  Swati: 15.2, Vishakha: 15.2, Anuradha: 13.6, Jyeshtha: 15.2, Mula: 17.6,
  'Purva Ashadha': 19.2, 'Uttara Ashadha': 17.6, Shravana: 13.6, Dhanishta: 13.6,
  Shatabhisha: 16.8, 'Purva Bhadrapada': 16, 'Uttara Bhadrapada': 19.2, Revati: 21.6,
};

// Binary-searches for the UTC instant the Moon's sidereal longitude crosses
// `targetLongitude`, near `guessDate` — used to find the current Nakshatra's
// own start/end instants (needed for Amrit Kaal, which is timed from the
// Nakshatra's own span, not the clock day).
function findMoonLongitudeCrossing(targetLongitude: number, guessDate: Date): Date {
  let lo = guessDate.getTime() - 3 * 86_400_000;
  let hi = guessDate.getTime() + 3 * 86_400_000;
  const signedDiff = (ms: number) => {
    const lon = getPlanetaryPositions({ utcDate: new Date(ms) }).find(p => p.id === 'moon')!.longitude;
    return (((lon - targetLongitude + 540) % 360) + 360) % 360 - 180; // negative before crossing, positive after
  };
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (signedDiff(mid) <= 0) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

// Rahu Kaal, Yamaganda Kaal, and Gulika Kaal all use the same mechanic —
// one fixed 1-of-8 segment of daylight hours depending on the weekday —
// just with three different, independently standard weekday tables.
// Cross-checked across 3 independent published sources for this session
// (two direct weekday->segment tables, one time-window example that
// resolves to the same segments once its own prose mislabeling is
// corrected against its own stated clock times).
const RAHU_KAAL_SEGMENT: Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 }; // 0=Sunday..6=Saturday, 1-indexed segment of 8
const YAMAGANDA_SEGMENT: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
const GULIKA_SEGMENT: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

// Choghadiya — 8 day segments (sunrise-sunset) + 8 night segments
// (sunset-next sunrise), each one of 7 named types cycling through a fixed
// ring. Verified against drikpanchang.com's published tables for two
// independent weekdays (Thu 2026-08-20, Sun 2026-08-23): the day sequence
// starts at that weekday's ruling type and steps +1 through the ring per
// segment; the night sequence starts 2 steps back from the day's start and
// steps -2 through the same ring per segment.
const CHOGHADIYA_RING = ['Udveg', 'Chal', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'];
const CHOGHADIYA_DAY_START: Record<number, number> = { 0: 0, 1: 3, 2: 6, 3: 2, 4: 5, 5: 1, 6: 4 }; // 0=Sunday..6=Saturday
const CHOGHADIYA_AUSPICIOUS = new Set(['Amrit', 'Labh', 'Shubh', 'Chal']);

export interface ChoghadiyaSegment {
  name: string;
  auspicious: boolean;
  start: string;
  end: string;
}

function buildChoghadiyaSegments(startIndex: number, step: number, anchor: Date, segmentLengthMs: number): ChoghadiyaSegment[] {
  return Array.from({ length: 8 }, (_, i) => {
    const idx = (((startIndex + i * step) % 7) + 7) % 7;
    const name = CHOGHADIYA_RING[idx];
    const start = new Date(anchor.getTime() + i * segmentLengthMs);
    const end = new Date(anchor.getTime() + (i + 1) * segmentLengthMs);
    return { name, auspicious: CHOGHADIYA_AUSPICIOUS.has(name), start: start.toISOString(), end: end.toISOString() };
  });
}

export interface PanchangResult {
  date: string;
  vara: string;
  tithi: { name: string; paksha: 'Shukla' | 'Krishna'; number: number };
  nakshatra: { name: string; pada: number; lord: string };
  yoga: string;
  karana: string;
  moonRashi: string;
  sunRashi: string;
  sunrise: string | null; // ISO instant
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  rahuKaal: { start: string; end: string } | null;
  yamagandaKaal: { start: string; end: string } | null;
  gulikaKaal: { start: string; end: string } | null;
  abhijitMuhurat: { start: string; end: string } | null;
  vijayaMuhurat: { start: string; end: string } | null;
  amritKaal: { start: string; end: string } | null;
  sarvarthaSiddhiYoga: boolean;
  choghadiya: { day: ChoghadiyaSegment[]; night: ChoghadiyaSegment[] } | null;
}

export function calculatePanchang(dateOnly: string, latitude: number, longitude: number): PanchangResult {
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Sunrise/sunset math works off the UTC calendar day — a small (sub-day)
  // simplification at extreme longitudes, not worth timezone-correcting for
  // a daily-snapshot tool like this.
  const midnightUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = midnightUtc.getUTCDay();

  const cal = new julian.Calendar(midnightUtc);
  const sun = new sunriseModule.Sunrise(cal, latitude, -longitude); // astronomia measures longitude positively westward
  const riseCal = sun.rise();
  const setCal = sun.set();
  const sunriseDate = riseCal?.toDate() ?? null;
  const sunsetDate = setCal?.toDate() ?? null;

  // Tomorrow's sunrise — needed both for the night Choghadiya (below) and to
  // scope moonrise/moonset to the Hindu civil day (sunrise-to-sunrise), not
  // the UTC calendar day.
  const nextMidnightUtc = new Date(Date.UTC(year, month - 1, day + 1));
  const nextSunriseDate = new sunriseModule.Sunrise(new julian.Calendar(nextMidnightUtc), latitude, -longitude).rise()?.toDate() ?? null;

  // Classical definition: "today's" tithi/yoga/karana/nakshatra are the ones
  // prevailing at sunrise, not at some arbitrary hour — so compute Sun/Moon
  // positions at the moment of sunrise (falling back to midnight UTC if
  // sunrise couldn't be computed, e.g. near the poles).
  const positions = getPlanetaryPositions({ utcDate: sunriseDate ?? midnightUtc });
  const sun_ = positions.find(p => p.id === 'sun')!;
  const moon = positions.find(p => p.id === 'moon')!;

  const diff = ((moon.longitude - sun_.longitude) % 360 + 360) % 360;
  const tithiNumber = Math.floor(diff / 12) + 1; // 1-30
  const paksha: 'Shukla' | 'Krishna' = tithiNumber <= 15 ? 'Shukla' : 'Krishna';
  const tithiInPaksha = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15;
  const tithiName = tithiInPaksha === 15 ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya') : TITHI_NAMES[tithiInPaksha - 1];

  const yogaIndex = Math.floor(((sun_.longitude + moon.longitude) % 360 + 360) % 360 / (360 / 27));
  const karanaHalfTithi = Math.floor(diff / 6); // 0-59

  const moonRashi = getRashi(moon.longitude);
  const sunRashi = getRashi(sun_.longitude);
  const nakshatra = getNakshatra(moon.longitude);
  const sarvarthaSiddhiYoga = (SARVARTHA_SIDDHI[weekday] ?? []).includes(nakshatra.name);

  const moonRiseSet =
    sunriseDate && nextSunriseDate
      ? getMoonRiseSet(sunriseDate, nextSunriseDate, latitude, longitude)
      : getMoonRiseSet(midnightUtc, new Date(midnightUtc.getTime() + 86_400_000), latitude, longitude);

  // Amrit Kaal is timed from the current Nakshatra's OWN start/end instants,
  // not the clock day — find them by searching for when the Moon's sidereal
  // longitude crosses this nakshatra's boundaries.
  let amritKaal: PanchangResult['amritKaal'] = null;
  const amritOffsetHours = AMRIT_KAAL_OFFSET_HOURS[nakshatra.name];
  if (amritOffsetHours !== undefined) {
    const nakSpan = 360 / 27;
    const nakStartLongitude = Math.floor(moon.longitude / nakSpan) * nakSpan;
    const nakEndLongitude = nakStartLongitude + nakSpan;
    const nakStart = findMoonLongitudeCrossing(nakStartLongitude, sunriseDate ?? midnightUtc);
    const nakEnd = findMoonLongitudeCrossing(nakEndLongitude, sunriseDate ?? midnightUtc);
    const nakDurationHours = (nakEnd.getTime() - nakStart.getTime()) / 3_600_000;
    const akStart = new Date(nakStart.getTime() + (amritOffsetHours / 24) * nakDurationHours * 3_600_000);
    const akDurationHours = nakDurationHours * (1.6 / 24);
    amritKaal = { start: akStart.toISOString(), end: new Date(akStart.getTime() + akDurationHours * 3_600_000).toISOString() };
  }

  let rahuKaal: PanchangResult['rahuKaal'] = null;
  let yamagandaKaal: PanchangResult['yamagandaKaal'] = null;
  let gulikaKaal: PanchangResult['gulikaKaal'] = null;
  let abhijitMuhurat: PanchangResult['abhijitMuhurat'] = null;
  let vijayaMuhurat: PanchangResult['vijayaMuhurat'] = null;
  let choghadiya: PanchangResult['choghadiya'] = null;
  if (sunriseDate && sunsetDate) {
    const dayLengthMs = sunsetDate.getTime() - sunriseDate.getTime();
    const segmentLengthMs = dayLengthMs / 8;
    const segmentWindow = (segment: number) => {
      const start = new Date(sunriseDate.getTime() + (segment - 1) * segmentLengthMs);
      return { start: start.toISOString(), end: new Date(start.getTime() + segmentLengthMs).toISOString() };
    };

    rahuKaal = segmentWindow(RAHU_KAAL_SEGMENT[weekday]);
    yamagandaKaal = segmentWindow(YAMAGANDA_SEGMENT[weekday]);
    gulikaKaal = segmentWindow(GULIKA_SEGMENT[weekday]);

    // Abhijit Muhurat: the 8th of 15 equal divisions of daylight, centered on solar noon.
    const muhurtaLengthMs = dayLengthMs / 15;
    const abhijitStart = new Date(sunriseDate.getTime() + 7 * muhurtaLengthMs);
    abhijitMuhurat = { start: abhijitStart.toISOString(), end: new Date(abhijitStart.getTime() + muhurtaLengthMs).toISOString() };

    // Vijaya Muhurat: the 11th of the same 15 divisions. Verified against a
    // real published Panchang (28 Aug 2026, Delhi): this reproduces its
    // 14:31-15:22 IST window to the minute.
    const vijayaStart = new Date(sunriseDate.getTime() + 10 * muhurtaLengthMs);
    vijayaMuhurat = { start: vijayaStart.toISOString(), end: new Date(vijayaStart.getTime() + muhurtaLengthMs).toISOString() };

    // Night Choghadiya needs the FOLLOWING day's sunrise to know when the night ends.
    const dayStartIdx = CHOGHADIYA_DAY_START[weekday];
    const dayChoghadiya = buildChoghadiyaSegments(dayStartIdx, 1, sunriseDate, dayLengthMs / 8);
    if (nextSunriseDate) {
      const nightLengthMs = (nextSunriseDate.getTime() - sunsetDate.getTime()) / 8;
      const nightStartIdx = dayStartIdx - 2;
      const nightChoghadiya = buildChoghadiyaSegments(nightStartIdx, -2, sunsetDate, nightLengthMs);
      choghadiya = { day: dayChoghadiya, night: nightChoghadiya };
    }
  }

  return {
    date: dateOnly,
    vara: WEEKDAY_NAMES[weekday],
    tithi: { name: tithiName, paksha, number: tithiInPaksha },
    nakshatra: { name: nakshatra.name, pada: nakshatra.pada, lord: nakshatra.lord },
    yoga: YOGA_NAMES[yogaIndex],
    karana: karanaName(karanaHalfTithi),
    moonRashi: moonRashi.name,
    sunRashi: sunRashi.name,
    sunrise: sunriseDate?.toISOString() ?? null,
    sunset: sunsetDate?.toISOString() ?? null,
    moonrise: moonRiseSet.rise?.toISOString() ?? null,
    moonset: moonRiseSet.set?.toISOString() ?? null,
    rahuKaal,
    yamagandaKaal,
    gulikaKaal,
    abhijitMuhurat,
    vijayaMuhurat,
    amritKaal,
    sarvarthaSiddhiYoga,
    choghadiya,
  };
}
