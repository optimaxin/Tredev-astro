// Real planetary positions for Vedic (sidereal) astrology — built on
// `astronomia` (a pure-JS port of Jean Meeus's "Astronomical Algorithms",
// full VSOP87 planetary theory, MIT licensed, no native compilation).
//
// Precision note: geocentric planet positions here use direct heliocentric
// vector subtraction (Earth's position minus the planet's), skipping
// light-time/aberration iteration. That costs at most a few arcminutes of
// longitude — irrelevant next to a 30°-wide rashi or 13°20'-wide nakshatra,
// so it's not worth the extra complexity. Anyone needing arcsecond precision
// (nobody doing rashi/nakshatra placement is) should swap in Swiss Ephemeris.
import { planetposition, moonposition, julian, base, sidereal, nutation } from 'astronomia';
import data from 'astronomia/data';

export type PlanetId = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'uranus' | 'neptune' | 'rahu' | 'ketu';

export interface PlanetPosition {
  id: PlanetId;
  /** Sidereal (Lahiri) ecliptic longitude in degrees, 0-360. */
  longitude: number;
  /** True when this planet is currently retrograde as seen from Earth. */
  retrograde: boolean;
}

const DEG = 180 / Math.PI;
const normalize360 = (deg: number) => ((deg % 360) + 360) % 360;

// Lahiri (Chitrapaksha) ayanamsa — standard linear approximation used by
// most Vedic software: ~23.853° at J2000.0, precessing at the general rate
// of ~50.2388475"/year. Accurate to a few arcminutes across centuries,
// which is all rashi/nakshatra classification needs.
export function lahiriAyanamsa(jde: number): number {
  const yearsSinceJ2000 = (jde - 2451545.0) / 365.25;
  return 23.853056 + yearsSinceJ2000 * (50.2388475 / 3600);
}

const HELIOCENTRIC_PLANETS: Record<'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune', unknown> = {
  mercury: data.mercury,
  venus: data.venus,
  mars: data.mars,
  jupiter: data.jupiter,
  saturn: data.saturn,
  uranus: data.uranus,
  neptune: data.neptune,
};

function toRectangular(lonRad: number, latRad: number, range: number) {
  return {
    x: range * Math.cos(latRad) * Math.cos(lonRad),
    y: range * Math.cos(latRad) * Math.sin(lonRad),
    z: range * Math.sin(latRad),
  };
}

function geocentricEclipticLonLat(planetData: unknown, earthPos: { lon: number; lat: number; range: number }, jd: number): { lon: number; lat: number } {
  const planet = new planetposition.Planet(planetData as ConstructorParameters<typeof planetposition.Planet>[0]);
  const helio = planet.position(jd);
  const p = toRectangular(helio.lon, helio.lat, helio.range);
  const e = toRectangular(earthPos.lon, earthPos.lat, earthPos.range);
  const x = p.x - e.x, y = p.y - e.y, z = p.z - e.z;
  return { lon: normalize360(Math.atan2(y, x) * DEG), lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * DEG };
}

// A planet appears retrograde when its geocentric longitude a day later is
// numerically *behind* today's (accounting for the 360°/0° wrap) — the same
// test any observer could do by comparing two nights' positions.
function isRetrograde(lonNow: number, lonNextDay: number): boolean {
  let delta = lonNextDay - lonNow;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

// Ascendant (Lagna) — the ecliptic degree rising on the eastern horizon at
// birth. Needed for whole-sign house placement (getHouseFromAscendant in
// zodiac.ts) and Mangal Dosha, which is defined by Mars's house *from the
// Ascendant*, not just its sign.
//
// Formula (standard spherical-astronomy derivation, used by open natal-chart
// implementations): asc = atan2(cos(RAMC), -(sin(ε)·tan(φ) + cos(ε)·sin(RAMC)))
// where RAMC is the local sidereal time expressed as an angle, ε is the
// obliquity of the ecliptic, and φ is the observer's geographic latitude.
export function getAscendant(utcDate: Date, latitudeDeg: number, longitudeDeg: number): number {
  const jd = julian.DateToJD(utcDate);
  const gstDeg = sidereal.mean(jd) * DEG;
  const ramcDeg = normalize360(gstDeg + longitudeDeg);
  const ramc = ramcDeg / DEG;
  const epsilon = nutation.meanObliquity(jd);
  const phi = (latitudeDeg / DEG);

  const ascTropical = normalize360(Math.atan2(
    Math.cos(ramc),
    -(Math.sin(epsilon) * Math.tan(phi) + Math.cos(epsilon) * Math.sin(ramc))
  ) * DEG);

  const ayanamsa = lahiriAyanamsa(jd);
  return normalize360(ascTropical - ayanamsa);
}

// Declination (Kranti) — needed only for Shadbala's Ayana Bala. Uses the
// standard spherical conversion sin(δ)=sin(β)cos(ε)+cos(β)sin(ε)sin(λ) from
// TROPICAL ecliptic longitude/latitude (declination is a real physical
// angle, independent of the sidereal/ayanamsa convention used elsewhere in
// this file — using tropical here doesn't need reconciling with the
// sidereal longitudes returned by getPlanetaryPositions above).
function declinationFromEcliptic(lonDeg: number, latDeg: number, obliquityRad: number): number {
  const lonRad = lonDeg / DEG, latRad = latDeg / DEG;
  const sinDec = Math.sin(latRad) * Math.cos(obliquityRad) + Math.cos(latRad) * Math.sin(obliquityRad) * Math.sin(lonRad);
  return Math.asin(sinDec) * DEG;
}

export function getDeclination(id: 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn', utcDate: Date): number {
  const jd = julian.DateToJD(utcDate);
  const epsilon = nutation.meanObliquity(jd);
  const earth = new planetposition.Planet(data.earth as ConstructorParameters<typeof planetposition.Planet>[0]);
  const earthPos = earth.position(jd);

  if (id === 'sun') {
    const sunTropical = normalize360(earthPos.lon * DEG + 180);
    return declinationFromEcliptic(sunTropical, 0, epsilon);
  }
  if (id === 'moon') {
    const moonPos = moonposition.position(jd);
    return declinationFromEcliptic(normalize360(moonPos.lon * DEG), moonPos.lat * DEG, epsilon);
  }
  const { lon, lat } = geocentricEclipticLonLat(HELIOCENTRIC_PLANETS[id], earthPos, jd);
  return declinationFromEcliptic(lon, lat, epsilon);
}

export interface EphemerisInput {
  /** Birth/event date+time as a UTC JS Date — convert local time to UTC before calling. */
  utcDate: Date;
}

export function getPlanetaryPositions({ utcDate }: EphemerisInput): PlanetPosition[] {
  const jd = julian.DateToJD(utcDate);
  const jdNextDay = jd + 1;
  const ayanamsa = lahiriAyanamsa(jd);

  const earth = new planetposition.Planet(data.earth as ConstructorParameters<typeof planetposition.Planet>[0]);
  const earthPos = earth.position(jd);
  const earthPosNextDay = earth.position(jdNextDay);

  const sunTropical = normalize360((earthPos.lon * DEG) + 180);

  const moonPos = moonposition.position(jd);
  const moonPosNextDay = moonposition.position(jdNextDay);
  const moonTropical = normalize360(moonPos.lon * DEG);
  const moonTropicalNextDay = normalize360(moonPosNextDay.lon * DEG);

  const results: PlanetPosition[] = [
    { id: 'sun', longitude: normalize360(sunTropical - ayanamsa), retrograde: false }, // the Sun is never retrograde
    { id: 'moon', longitude: normalize360(moonTropical - ayanamsa), retrograde: isRetrograde(moonTropical, moonTropicalNextDay) },
  ];

  for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const) {
    const now = geocentricEclipticLonLat(HELIOCENTRIC_PLANETS[id], earthPos, jd);
    const next = geocentricEclipticLonLat(HELIOCENTRIC_PLANETS[id], earthPosNextDay, jdNextDay);
    results.push({ id, longitude: normalize360(now.lon - ayanamsa), retrograde: isRetrograde(now.lon, next.lon) });
  }

  // Rahu/Ketu: mean lunar node — a real, standard closed-form formula (not a
  // VSOP87 body), always retrograde by convention since the node itself
  // regresses through the zodiac.
  const T = base.J2000Century(jd);
  const rahuTropical = normalize360(125.04452 - 1934.136261 * T);
  results.push({ id: 'rahu', longitude: normalize360(rahuTropical - ayanamsa), retrograde: true });
  results.push({ id: 'ketu', longitude: normalize360(rahuTropical + 180 - ayanamsa), retrograde: true });

  return results;
}
