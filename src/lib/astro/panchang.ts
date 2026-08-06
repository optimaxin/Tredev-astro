import { getPlanetaryPositions, getSunriseSunset } from "./ephemeris";

const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami",
  "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi",
];

const YOGA_NAMES = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti",
  "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata",
  "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];

const MOVABLE_KARANS = ["Bava", "Balava", "Kaulava", "Taitila", "Garija", "Vanija", "Vishti"];
// Classical order: Kimstughna opens the lunar month (half-tithi 0), the 7
// movable karans repeat 8x through half-tithis 1-56, then Shakuni,
// Chatushpada, Naga close it out (57-59).
const FIXED_KARANS = ["Kimstughna", "Shakuni", "Chatushpada", "Naga"];

// Segment index (1-8, sunrise-to-sunset day divided into 8 parts) that is
// inauspicious "Rahu Kaal" for each weekday (0=Sunday .. 6=Saturday).
const RAHU_KAAL_SEGMENT = [8, 2, 7, 5, 6, 4, 3];

function normalizeDegrees(deg: number) {
  return ((deg % 360) + 360) % 360;
}

function karanName(index: number) {
  if (index === 0) return FIXED_KARANS[0];
  if (index >= 57) return FIXED_KARANS[index - 56];
  return MOVABLE_KARANS[(index - 1) % 7];
}

export function getPanchang(date: Date, latitude: number, longitude: number) {
  const planets = getPlanetaryPositions(date);
  const sun = planets.find((p) => p.name === "Sun")!;
  const moon = planets.find((p) => p.name === "Moon")!;

  const diff = normalizeDegrees(moon.siderealLongitude - sun.siderealLongitude);
  const tithiIndex = Math.floor(diff / 12); // 0-29
  const paksha = tithiIndex < 15 ? "Shukla" : "Krishna";
  const tithiInPaksha = tithiIndex % 15;
  const tithiName = tithiInPaksha === 14 ? (paksha === "Shukla" ? "Purnima" : "Amavasya") : TITHI_NAMES[tithiInPaksha];

  const yogaSum = normalizeDegrees(sun.siderealLongitude + moon.siderealLongitude);
  const yogaIndex = Math.floor(yogaSum / (360 / 27));

  const karanIndex = Math.floor(diff / 6); // 0-59

  const { sunrise, sunset } = getSunriseSunset(date, latitude, longitude);

  let rahuKaal: { start: Date; end: Date } | null = null;
  let abhijitMuhurat: { start: Date; end: Date } | null = null;
  if (sunrise && sunset) {
    const dayLengthMs = sunset.getTime() - sunrise.getTime();
    const segmentMs = dayLengthMs / 8;
    const weekday = date.getUTCDay();
    const segment = RAHU_KAAL_SEGMENT[weekday];
    const rahuStart = new Date(sunrise.getTime() + (segment - 1) * segmentMs);
    rahuKaal = { start: rahuStart, end: new Date(rahuStart.getTime() + segmentMs) };

    const muhurtaMs = dayLengthMs / 15;
    const noon = sunrise.getTime() + dayLengthMs / 2;
    abhijitMuhurat = { start: new Date(noon - muhurtaMs / 2), end: new Date(noon + muhurtaMs / 2) };
  }

  return {
    date,
    tithi: { index: tithiIndex + 1, name: tithiName, paksha },
    nakshatra: { index: moon.nakshatraIndex, name: moon.nakshatra, pada: moon.pada },
    yoga: { index: yogaIndex, name: YOGA_NAMES[yogaIndex] },
    karan: { index: karanIndex, name: karanName(karanIndex) },
    sunrise,
    sunset,
    rahuKaal,
    abhijitMuhurat,
  };
}
