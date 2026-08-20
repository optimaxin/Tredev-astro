// Rashi (sign) and Nakshatra (lunar mansion) placement — pure lookup-table
// math from a sidereal longitude. No approximation here: these boundaries
// (30° per rashi, 13°20' per nakshatra) are exact definitions, not estimates.

export const RASHIS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const;

// Each nakshatra's ruling planet, in the fixed classical order — used for
// the Vimshottari Dasha sequence and Graha Maitri (planetary friendship)
// scoring in Guna Milan.
export const NAKSHATRA_LORDS = [
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
  'ketu', 'venus', 'sun', 'moon', 'mars', 'rahu', 'jupiter', 'saturn', 'mercury',
] as const;

export function getRashi(siderealLongitude: number): { index: number; name: (typeof RASHIS)[number]; degreeInSign: number } {
  const index = Math.floor(siderealLongitude / 30) % 12;
  return { index, name: RASHIS[index], degreeInSign: siderealLongitude % 30 };
}

export function getNakshatra(siderealLongitude: number): { index: number; name: (typeof NAKSHATRAS)[number]; pada: 1 | 2 | 3 | 4; lord: string } {
  const span = 360 / 27; // 13°20'
  const index = Math.floor(siderealLongitude / span) % 27;
  const positionInNakshatra = siderealLongitude % span;
  const pada = (Math.floor(positionInNakshatra / (span / 4)) + 1) as 1 | 2 | 3 | 4;
  return { index, name: NAKSHATRAS[index], pada, lord: NAKSHATRA_LORDS[index] };
}

// Whole-sign houses (the standard Vedic default): the Ascendant's sign IS
// house 1, and every other sign follows in zodiacal order — no house-size
// calculation needed, unlike Western Placidus/Koch systems.
export function getHouseFromAscendant(ascendantRashiIndex: number, planetRashiIndex: number): number {
  return (((planetRashiIndex - ascendantRashiIndex) % 12) + 12) % 12 + 1;
}
