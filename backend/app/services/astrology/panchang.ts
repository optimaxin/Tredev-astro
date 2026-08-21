// Real Panchang — the 5 "angas" (Tithi, Vara, Nakshatra, Yoga, Karana) plus
// sunrise/sunset, Rahu Kaal, and Abhijit Muhurat. All derived from real Sun/
// Moon positions and a real sunrise/sunset calculation (astronomia's
// `sunrise` module) — no field here is hardcoded per date.
import { julian, sunrise as sunriseModule } from 'astronomia';
import { getPlanetaryPositions } from './ephemeris.ts';
import { getNakshatra, getRashi } from './zodiac.ts';

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

// Rahu Kaal falls in a fixed 1-of-8 segment of daylight hours depending on
// the weekday — a standard, widely-published Vedic convention.
const RAHU_KAAL_SEGMENT: Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 }; // 0=Sunday..6=Saturday, 1-indexed segment of 8

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
  sunrise: string | null; // ISO instant
  sunset: string | null;
  rahuKaal: { start: string; end: string } | null;
  abhijitMuhurat: { start: string; end: string } | null;
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
  const nakshatra = getNakshatra(moon.longitude);

  let rahuKaal: PanchangResult['rahuKaal'] = null;
  let abhijitMuhurat: PanchangResult['abhijitMuhurat'] = null;
  let choghadiya: PanchangResult['choghadiya'] = null;
  if (sunriseDate && sunsetDate) {
    const dayLengthMs = sunsetDate.getTime() - sunriseDate.getTime();

    const segment = RAHU_KAAL_SEGMENT[weekday];
    const segmentLengthMs = dayLengthMs / 8;
    const rahuStart = new Date(sunriseDate.getTime() + (segment - 1) * segmentLengthMs);
    rahuKaal = { start: rahuStart.toISOString(), end: new Date(rahuStart.getTime() + segmentLengthMs).toISOString() };

    // Abhijit Muhurat: the 8th of 15 equal divisions of daylight, centered on solar noon.
    const muhurtaLengthMs = dayLengthMs / 15;
    const abhijitStart = new Date(sunriseDate.getTime() + 7 * muhurtaLengthMs);
    abhijitMuhurat = { start: abhijitStart.toISOString(), end: new Date(abhijitStart.getTime() + muhurtaLengthMs).toISOString() };

    // Night Choghadiya needs the FOLLOWING day's sunrise to know when the night ends.
    const nextMidnightUtc = new Date(Date.UTC(year, month - 1, day + 1));
    const nextRiseCal = new sunriseModule.Sunrise(new julian.Calendar(nextMidnightUtc), latitude, -longitude).rise();
    const nextSunriseDate = nextRiseCal?.toDate() ?? null;

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
    sunrise: sunriseDate?.toISOString() ?? null,
    sunset: sunsetDate?.toISOString() ?? null,
    rahuKaal,
    abhijitMuhurat,
    choghadiya,
  };
}
