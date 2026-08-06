import * as Astronomy from "astronomy-engine";
import { NAKSHATRA_NAMES, NAKSHATRA_SPAN, RASHI_NAMES, RASHI_SPAN } from "./constants";

export type PlanetName = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn" | "Rahu" | "Ketu";

export type ChartPoint = {
  name: PlanetName | "Ascendant";
  tropicalLongitude: number;
  siderealLongitude: number;
  rashiIndex: number;
  rashi: string;
  nakshatraIndex: number;
  nakshatra: string;
  pada: number;
  degreeInRashi: number;
};

function normalizeDegrees(deg: number) {
  return ((deg % 360) + 360) % 360;
}

// ponytail: linear approximation of the Lahiri (Chitrapaksha) ayanamsa,
// accurate to within a few arcminutes for any birth date in living memory.
// Upgrade to the full IAU precession series if arcsecond precision matters.
export function lahiriAyanamsa(date: Date): number {
  const decimalYear = date.getUTCFullYear() + (date.getUTCMonth() + 0.5) / 12;
  const AYANAMSA_AT_2000 = 23.85;
  const PRECESSION_PER_YEAR = 50.2719 / 3600;
  return AYANAMSA_AT_2000 + (decimalYear - 2000) * PRECESSION_PER_YEAR;
}

function toChartPoint(name: ChartPoint["name"], tropicalLongitude: number, ayanamsa: number): ChartPoint {
  const sidereal = normalizeDegrees(tropicalLongitude - ayanamsa);
  const rashiIndex = Math.floor(sidereal / RASHI_SPAN);
  const nakshatraIndex = Math.floor(sidereal / NAKSHATRA_SPAN);
  const positionInNakshatra = sidereal - nakshatraIndex * NAKSHATRA_SPAN;
  const pada = Math.floor(positionInNakshatra / (NAKSHATRA_SPAN / 4)) + 1;

  return {
    name,
    tropicalLongitude,
    siderealLongitude: sidereal,
    rashiIndex,
    rashi: RASHI_NAMES[rashiIndex],
    nakshatraIndex,
    nakshatra: NAKSHATRA_NAMES[nakshatraIndex],
    pada,
    degreeInRashi: sidereal - rashiIndex * RASHI_SPAN,
  };
}

function tropicalLongitudeOf(body: Exclude<PlanetName, "Rahu" | "Ketu">, date: Date): number {
  if (body === "Sun") return Astronomy.SunPosition(date).elon;
  if (body === "Moon") return Astronomy.EclipticGeoMoon(date).lon;
  const vec = Astronomy.GeoVector(body as Astronomy.Body, date, true);
  return Astronomy.Ecliptic(vec).elon;
}

// Mean lunar ascending node (Meeus, Astronomical Algorithms ch. 47).
function meanLunarNodeLongitude(date: Date): number {
  const T = (date.getTime() / 86400000 + 10957.5 - 2451545.0) / 36525; // Julian centuries since J2000
  const omega = 125.0445222 - 1934.1362608 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  return normalizeDegrees(omega);
}

export function getPlanetaryPositions(date: Date): ChartPoint[] {
  const ayanamsa = lahiriAyanamsa(date);
  const bodies: Exclude<PlanetName, "Rahu" | "Ketu">[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  const points = bodies.map((b) => toChartPoint(b, tropicalLongitudeOf(b, date), ayanamsa));

  const rahuTropical = meanLunarNodeLongitude(date);
  const ketuTropical = normalizeDegrees(rahuTropical + 180);
  points.push(toChartPoint("Rahu", rahuTropical, ayanamsa));
  points.push(toChartPoint("Ketu", ketuTropical, ayanamsa));

  return points;
}

export function getAscendant(date: Date, latitude: number, longitude: number): ChartPoint {
  const ayanamsa = lahiriAyanamsa(date);
  const astroTime = Astronomy.MakeTime(date);
  const gastHours = Astronomy.SiderealTime(astroTime);
  const ramc = normalizeDegrees(gastHours * 15 + longitude);
  const obliquity = Astronomy.e_tilt(astroTime).tobl;

  const latRad = (latitude * Math.PI) / 180;
  const oblRad = (obliquity * Math.PI) / 180;
  const ramcRad = (ramc * Math.PI) / 180;

  const y = -Math.cos(ramcRad);
  const x = Math.sin(oblRad) * Math.tan(latRad) + Math.cos(oblRad) * Math.sin(ramcRad);
  let ascendant = (Math.atan2(y, x) * 180) / Math.PI;
  ascendant = normalizeDegrees(ascendant);

  return toChartPoint("Ascendant", ascendant, ayanamsa);
}

export function getSunriseSunset(date: Date, latitude: number, longitude: number) {
  const observer = new Astronomy.Observer(latitude, longitude, 0);
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, startOfDay, 2);
  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, startOfDay, 2);
  return {
    sunrise: sunrise ? sunrise.date : null,
    sunset: sunset ? sunset.date : null,
  };
}
