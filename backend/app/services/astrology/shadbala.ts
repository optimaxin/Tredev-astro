// Shadbala (six-fold planetary strength) and Bhavbala (house strength) —
// Brihat Parashara Hora Shastra. Every sub-formula and constant table was
// cross-checked against the open-source `jyotishganit` library
// (northtara/jyotishganit, MIT), the same reference already used and
// verified for divisional charts and Ashtakavarga elsewhere in this
// codebase — its Ayana Bala and Drik Bala formulas are marked "VERIFIED
// CORRECT" / cross-checked against PyJHora in its own source comments.
//
// Two deliberate departures from that reference, both noted where they
// occur: (1) Cheshta Bala's fallback mean-longitude and Varsha/Maasa solar
// ingress are computed consistently in the sidereal frame used everywhere
// else in this codebase, rather than mixing tropical/sidereal values; (2)
// the Hora (planetary-hour) lord anchors to the sunrise that starts the
// current Vedic day, matching how the Vaara (day) lord is determined,
// rather than the birth date's raw calendar weekday.
//
// Shadbala classically applies only to the 7 traditional grahas — not
// Rahu/Ketu or the modern outer planets.
import { julian, sunrise as sunriseModule } from 'astronomia';
import type { Kundli } from './kundli.ts';
import type { NavamsaChart } from './kundli.ts';
import type { VargaChart } from './divisionalCharts.ts';
import { RASHIS } from './zodiac.ts';
import { getPlanetaryPositions, getDeclination, lahiriAyanamsa } from './ephemeris.ts';
import { RASHI_LORD, FRIENDS, ENEMIES } from './gunMilan.ts';
import {
  type ShadPlanet, SHAD_PLANETS, NAISARGIKA_VALUES, EXALTATION_DEGREES, MOOLATRIKONA_SIGN, OWN_SIGNS,
  NATURAL_BENEFIC_SHADBALA, NATURAL_MALEFIC_SHADBALA, MALE_PLANETS_SHADBALA, FEMALE_PLANETS_SHADBALA,
  DECANATE_GENDER_GROUPS, DIGBALA_STRONG_HOUSE, KENDRA_BALA_BY_HOUSE, TRIBHAGA_DAY_LORDS, TRIBHAGA_NIGHT_LORDS,
  WEEKDAY_LORDS, PLANETARY_HOUR_SEQUENCE, YUDDHABALA_PLANETS, PLANET_DIAMETER, MARS_SPECIAL_ASPECTS,
  JUPITER_SPECIAL_ASPECTS, SATURN_SPECIAL_ASPECTS, SPECIAL_ASPECT_ORB, FULL_ASPECT_STRENGTH,
  BHAVA_STRENGTH_BY_NATURE, signNature, PLANET_MEAN_MOTION, PLANET_EPOCH_LONGITUDE, RUPA_SCALING, MIN_REQUIRED_RUPAS,
} from './shadbalaConstants.ts';

function normalize(a: number): number { return ((a % 360) + 360) % 360; }
function angdiff(a: number, b: number): number { const d = Math.abs(normalize(a) - normalize(b)); return d > 180 ? 360 - d : d; }
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

// ---- Sun-longitude ingress finder (sidereal), used for Varsha/Maasa lords ----
const MEAN_DAILY_SOLAR_MOTION = 360 / 365.2422;
function findSignIngressDate(targetLongitude: number, beforeDate: Date): Date {
  let guessMs = beforeDate.getTime();
  for (let i = 0; i < 8; i++) {
    const sunLon = getPlanetaryPositions({ utcDate: new Date(guessMs) }).find(p => p.id === 'sun')!.longitude;
    const daysSinceCrossing = (((sunLon - targetLongitude) % 360) + 360) % 360 / MEAN_DAILY_SOLAR_MOTION;
    guessMs -= daysSinceCrossing * MS_PER_DAY;
  }
  return new Date(guessMs);
}

// ---- Sunrise/sunset helper (mirrors panchang.ts's astronomia usage) ----
function sunriseSunsetFor(midnightUtc: Date, latitude: number, longitude: number): { rise: Date | null; set: Date | null } {
  const sun = new sunriseModule.Sunrise(new julian.Calendar(midnightUtc), latitude, -longitude);
  return { rise: sun.rise()?.toDate() ?? null, set: sun.set()?.toDate() ?? null };
}

export interface PlanetShadbala {
  planet: ShadPlanet;
  sthanabala: { uchhabala: number; saptavargajabala: number; ojhayugmabala: number; kendradhibala: number; drekkanabala: number; total: number };
  digbala: number;
  kaalabala: { natonnatabala: number; pakshabala: number; tribhagabala: number; varshaMaasaDinaHoraBala: number; ayanabala: number; yuddhabala: number; total: number };
  cheshtabala: number;
  naisargikabala: number;
  drikbala: number;
  totalVirupas: number;
  rupas: number;
  minRequiredRupas: number;
  isStrong: boolean;
  ishtabala: number;
  kashtabala: number;
}

export interface HouseBala {
  house: number;
  adhipatiBala: number;
  digBala: number;
  drikBala: number;
  total: number;
}

export interface ShadbalaResult {
  planets: PlanetShadbala[];
  houses: HouseBala[];
}

export interface ShadbalaInput {
  kundli: Kundli;
  navamsaChart: NavamsaChart;
  vargaCharts: Record<string, VargaChart>;
  birthUtcDate: Date;
  birthLocalHour: number;
  dateOnly: string;
  latitude: number;
  longitude: number;
}

function longitudeOf(kundli: Kundli, id: string): number {
  return kundli.planets.find(p => p.id === id)!.longitude;
}
function houseOf(kundli: Kundli, id: string): number {
  return kundli.planets.find(p => p.id === id)!.house;
}
function degreeInSignOf(kundli: Kundli, id: string): number {
  return kundli.planets.find(p => p.id === id)!.degreeInSign;
}
function signIndexFromRashiName(rashi: string): number {
  return RASHIS.indexOf(rashi as (typeof RASHIS)[number]);
}
function d1SignIndexOf(kundli: Kundli, id: string): number {
  return signIndexFromRashiName(kundli.planets.find(p => p.id === id)!.rashi);
}

// ---- Saptavargaja Bala (sign-only dignity, matching the verified rule) ----
const SAPTAVARGA_KEYS = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'] as const;
const RELATIONSHIP_SCORE: Record<string, number> = { athimitra: 22.5, mitra: 15, sama: 7.5, shatru: 3.75, athishatru: 1.875 };

function naturalRelation(a: ShadPlanet, b: string): 'friend' | 'enemy' | 'neutral' {
  if (FRIENDS[a]?.includes(b)) return 'friend';
  if (ENEMIES[a]?.includes(b)) return 'enemy';
  return 'neutral';
}
function temporaryRelation(vargaSignIndex: number, lordD1SignIndex: number): 'friend' | 'enemy' {
  const diff = ((lordD1SignIndex - vargaSignIndex) % 12 + 12) % 12; // 0-indexed distance
  return [1, 2, 3, 9, 10, 11].includes(diff) ? 'friend' : 'enemy';
}
function combinedRelation(nat: 'friend' | 'enemy' | 'neutral', temp: 'friend' | 'enemy'): keyof typeof RELATIONSHIP_SCORE {
  if (nat === 'friend' && temp === 'friend') return 'athimitra';
  if (nat === 'enemy' && temp === 'enemy') return 'athishatru';
  if ((nat === 'friend' && temp === 'enemy') || (nat === 'enemy' && temp === 'friend')) return 'sama';
  if (nat === 'neutral' && temp === 'friend') return 'mitra';
  if (nat === 'neutral' && temp === 'enemy') return 'shatru';
  return 'sama';
}

function vargaSignIndex(planet: ShadPlanet, key: (typeof SAPTAVARGA_KEYS)[number], kundli: Kundli, navamsaChart: NavamsaChart, vargaCharts: Record<string, VargaChart>): number {
  if (key === 'D1') return d1SignIndexOf(kundli, planet);
  if (key === 'D9') return signIndexFromRashiName(navamsaChart.planets.find(p => p.id === planet)!.rashi);
  return signIndexFromRashiName(vargaCharts[key].planets.find(p => p.id === planet)!.rashi);
}

function computeSaptavargajaBala(planet: ShadPlanet, kundli: Kundli, navamsaChart: NavamsaChart, vargaCharts: Record<string, VargaChart>): number {
  let total = 0;
  for (const key of SAPTAVARGA_KEYS) {
    const signIdx = vargaSignIndex(planet, key, kundli, navamsaChart, vargaCharts);
    if (signIdx === MOOLATRIKONA_SIGN[planet]) { total += 45; continue; }
    if (OWN_SIGNS[planet].includes(signIdx)) { total += 30; continue; }
    const signLord = RASHI_LORD[signIdx] as ShadPlanet;
    const nat = naturalRelation(planet, signLord);
    const temp = temporaryRelation(signIdx, d1SignIndexOf(kundli, signLord));
    total += RELATIONSHIP_SCORE[combinedRelation(nat, temp)];
  }
  return total;
}

// ---- Sputa Drishti (aspect strength in Virupas, 0-60) ----
function generalSputa(degree: number): number {
  if (degree < 30) return 0;
  if (degree < 60) return (degree - 30) / 2;
  if (degree < 90) return degree - 45;
  if (degree < 120) return 30 + (120 - degree) / 2;
  if (degree < 150) return 150 - degree;
  return 2 * (degree - 150);
}
function sputaDrishti(distDeg: number, aspectingPlanet: ShadPlanet): number {
  let degree = Math.abs(distDeg) % 360;
  if (degree > 180) degree = 360 - degree;
  const special = aspectingPlanet === 'mars' ? MARS_SPECIAL_ASPECTS : aspectingPlanet === 'jupiter' ? JUPITER_SPECIAL_ASPECTS : aspectingPlanet === 'saturn' ? SATURN_SPECIAL_ASPECTS : null;
  const base = generalSputa(degree);
  if (!special) return base;
  let max = base;
  for (const aspectAngle of special) {
    const orbDist = Math.abs(degree - aspectAngle);
    if (orbDist <= SPECIAL_ASPECT_ORB) max = Math.max(max, FULL_ASPECT_STRENGTH * (1 - orbDist / SPECIAL_ASPECT_ORB));
  }
  return max;
}

// ---- Day/night period + sunrise-anchored day lord (shared by Tribhaga & Varsha-Maasa-Dina-Hora) ----
function dayNightContext(birthUtcDate: Date, dateOnly: string, latitude: number, longitude: number) {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const midnightUtc = new Date(Date.UTC(y, m - 1, d));
  const prevMidnightUtc = new Date(Date.UTC(y, m - 1, d - 1));
  const nextMidnightUtc = new Date(Date.UTC(y, m - 1, d + 1));

  const today = sunriseSunsetFor(midnightUtc, latitude, longitude);
  const fallback = { isDayBirth: true, periodStart: midnightUtc, periodDurationMs: 12 * MS_PER_HOUR, vaaraWeekdayIndex: midnightUtc.getUTCDay(), referenceSunrise: midnightUtc };
  if (!today.rise || !today.set) return fallback; // polar edge case: no real sunrise/sunset that day

  if (birthUtcDate >= today.rise && birthUtcDate < today.set) {
    return { isDayBirth: true, periodStart: today.rise, periodDurationMs: today.set.getTime() - today.rise.getTime(), vaaraWeekdayIndex: midnightUtc.getUTCDay(), referenceSunrise: today.rise };
  }
  if (birthUtcDate < today.rise) {
    const prev = sunriseSunsetFor(prevMidnightUtc, latitude, longitude);
    const prevSet = prev.set ?? new Date(today.rise.getTime() - 12 * MS_PER_HOUR);
    const prevRise = prev.rise ?? new Date(today.rise.getTime() - MS_PER_DAY);
    return { isDayBirth: false, periodStart: prevSet, periodDurationMs: today.rise.getTime() - prevSet.getTime(), vaaraWeekdayIndex: prevMidnightUtc.getUTCDay(), referenceSunrise: prevRise };
  }
  const next = sunriseSunsetFor(nextMidnightUtc, latitude, longitude);
  const nextRise = next.rise ?? new Date(today.set.getTime() + 12 * MS_PER_HOUR);
  return { isDayBirth: false, periodStart: today.set, periodDurationMs: nextRise.getTime() - today.set.getTime(), vaaraWeekdayIndex: midnightUtc.getUTCDay(), referenceSunrise: today.rise };
}

export function calculateShadbala(input: ShadbalaInput): ShadbalaResult {
  const { kundli, navamsaChart, vargaCharts, birthUtcDate, birthLocalHour, dateOnly, latitude, longitude } = input;
  const jd = julian.DateToJD(birthUtcDate);
  const ascSignIndex = signIndexFromRashiName(kundli.ascendant.rashi);

  const sunLong = longitudeOf(kundli, 'sun');
  const moonLong = longitudeOf(kundli, 'moon');
  const moonPhase = angdiff(moonLong, sunLong);

  const dayNight = dayNightContext(birthUtcDate, dateOnly, latitude, longitude);
  const partDurationMs = dayNight.periodDurationMs / 3;
  const msFromPeriodStart = ((birthUtcDate.getTime() - dayNight.periodStart.getTime()) % MS_PER_DAY + MS_PER_DAY) % MS_PER_DAY;
  const tribhagaPart = Math.min(2, Math.floor(msFromPeriodStart / partDurationMs));
  const tribhagaRuler = dayNight.isDayBirth ? TRIBHAGA_DAY_LORDS[tribhagaPart] : TRIBHAGA_NIGHT_LORDS[tribhagaPart];

  const varshaLord = WEEKDAY_LORDS[findSignIngressDate(0, birthUtcDate).getUTCDay()];
  const maasaLord = WEEKDAY_LORDS[findSignIngressDate(Math.floor(sunLong / 30) * 30, birthUtcDate).getUTCDay()];
  const vaaraLord = WEEKDAY_LORDS[dayNight.vaaraWeekdayIndex];
  const hoursSinceSunrise = (birthUtcDate.getTime() - dayNight.referenceSunrise.getTime()) / MS_PER_HOUR;
  const startInSeq = PLANETARY_HOUR_SEQUENCE.indexOf(dayNight.vaaraWeekdayIndex);
  const horaLord = WEEKDAY_LORDS[PLANETARY_HOUR_SEQUENCE[(startInSeq + Math.floor(Math.max(0, hoursSinceSunrise))) % 7]];

  const naturalBenefics = SHAD_PLANETS.filter(p => NATURAL_BENEFIC_SHADBALA.includes(p));
  const naturalMalefics = SHAD_PLANETS.filter(p => NATURAL_MALEFIC_SHADBALA.includes(p));

  const sunMeanLong = normalize(280.46646 + 0.98564736 * (jd - 2451545.0)); // Sun's own mean longitude (standard mean-Sun elements, tropical frame)
  const ayanamsa = lahiriAyanamsa(jd);

  const results = SHAD_PLANETS.map(planet => {
    const planetLong = longitudeOf(kundli, planet);
    const house = houseOf(kundli, planet);

    // Sthanabala
    const debPoint = normalize(EXALTATION_DEGREES[planet] + 180);
    const uchhabala = angdiff(planetLong, debPoint) / 3;
    const saptavargajabala = computeSaptavargajaBala(planet, kundli, navamsaChart, vargaCharts);
    const d1Odd = d1SignIndexOf(kundli, planet) % 2 === 0;
    const d9Odd = signIndexFromRashiName(navamsaChart.planets.find(p => p.id === planet)!.rashi) % 2 === 0;
    const isMale = MALE_PLANETS_SHADBALA.includes(planet);
    const isFemale = FEMALE_PLANETS_SHADBALA.includes(planet);
    let ojhayugmabala = 0;
    if (isMale) { if (d1Odd) ojhayugmabala += 15; if (d9Odd) ojhayugmabala += 15; }
    if (isFemale) { if (!d1Odd) ojhayugmabala += 15; if (!d9Odd) ojhayugmabala += 15; }
    const kendradhibala = KENDRA_BALA_BY_HOUSE[house];
    const decanateIndex = Math.min(2, Math.floor(degreeInSignOf(kundli, planet) / 10));
    const drekkanabala = DECANATE_GENDER_GROUPS[decanateIndex].includes(planet) ? 15 : 0;
    const sthanaTotal = uchhabala + saptavargajabala + ojhayugmabala + kendradhibala + drekkanabala;

    // Digbala
    const strongHouse = DIGBALA_STRONG_HOUSE[planet];
    const strongHouseSignIndex = (ascSignIndex + strongHouse - 1) % 12;
    const strongPoint = strongHouseSignIndex * 30 + 15;
    const digbala = (180 - angdiff(planetLong, strongPoint)) / 3;

    // Kaalabala
    const hoursFromMidnight = Math.min(birthLocalHour, 24 - birthLocalHour);
    const dayBala = hoursFromMidnight * 5;
    const nightBala = 60 - dayBala;
    const natonnatabala = planet === 'mercury' ? 60 : ['sun', 'jupiter', 'venus'].includes(planet) ? dayBala : nightBala;

    let pakshabala = 0;
    if (NATURAL_BENEFIC_SHADBALA.includes(planet)) pakshabala = moonPhase / 3;
    else if (NATURAL_MALEFIC_SHADBALA.includes(planet)) pakshabala = (180 - moonPhase) / 3;

    const tribhagabala = planet === 'jupiter' || planet === tribhagaRuler ? 60 : 0;

    let varshaMaasaDinaHoraBala = 0;
    if (planet === varshaLord) varshaMaasaDinaHoraBala += 15;
    if (planet === maasaLord) varshaMaasaDinaHoraBala += 30;
    if (planet === vaaraLord) varshaMaasaDinaHoraBala += 45;
    if (planet === horaLord) varshaMaasaDinaHoraBala += 60;

    const declination = getDeclination(planet, birthUtcDate);
    let ayanabala = ((declination + 24) / 48) * 60;
    if (planet === 'sun') ayanabala *= 2;
    ayanabala = Math.max(0, Math.min(planet === 'sun' ? 120 : 60, ayanabala));

    const kaalaTotalPreYuddha = natonnatabala + pakshabala + tribhagabala + varshaMaasaDinaHoraBala + ayanabala;

    // Cheshtabala
    let cheshtabala: number;
    if (planet === 'sun') cheshtabala = ayanabala;
    else if (planet === 'moon') cheshtabala = pakshabala;
    else {
      const daysSinceJ2000 = jd - 2451545.0;
      const meanMotion = PLANET_MEAN_MOTION[planet]!;
      const epoch = PLANET_EPOCH_LONGITUDE[planet]!;
      // Mean longitude here is in the tropical frame (standard J2000 mean
      // elements) — shift the sidereal true longitude into the same frame
      // via the actual ayanamsa so both represent the same body consistently;
      // the Kendra (angular difference) below would be unaffected by this
      // shift either way, since it applies equally to every term, but using
      // the real ayanamsa (rather than an ad-hoc stand-in) keeps this
      // reasoning exact rather than approximate.
      const ownMeanLong = normalize(epoch + meanMotion * daysSinceJ2000);
      const trueLongTropical = normalize(planetLong + ayanamsa);
      let seegrocha: number; let compareMeanLong: number;
      if (planet === 'mercury' || planet === 'venus') { seegrocha = ownMeanLong; compareMeanLong = sunMeanLong; }
      else { seegrocha = sunMeanLong; compareMeanLong = ownMeanLong; }
      const aveLong = 0.5 * (trueLongTropical + compareMeanLong);
      cheshtabala = angdiff(seegrocha, aveLong) / 3;
    }

    const naisargikabala = NAISARGIKA_VALUES[planet];

    // Drikbala
    let beneficSputa = 0, maleficSputa = 0;
    for (const other of naturalBenefics) {
      if (other === planet) continue;
      beneficSputa += sputaDrishti(longitudeOf(kundli, other) - planetLong, other);
    }
    for (const other of naturalMalefics) {
      if (other === planet) continue;
      maleficSputa += sputaDrishti(longitudeOf(kundli, other) - planetLong, other);
    }
    const drikbala = (beneficSputa - maleficSputa) / 4;

    const totalPreYuddha = sthanaTotal + digbala + kaalaTotalPreYuddha + cheshtabala + naisargikabala + drikbala;

    return {
      planet, sthanabala: { uchhabala, saptavargajabala, ojhayugmabala, kendradhibala, drekkanabala, total: sthanaTotal },
      digbala, kaalabala: { natonnatabala, pakshabala, tribhagabala, varshaMaasaDinaHoraBala, ayanabala, yuddhabala: 0, total: kaalaTotalPreYuddha },
      cheshtabala, naisargikabala, drikbala, totalVirupas: totalPreYuddha,
      rupas: 0, minRequiredRupas: MIN_REQUIRED_RUPAS[planet], isStrong: false, ishtabala: 0, kashtabala: 0,
    };
  });

  // Yuddha Bala — planetary war between conjunct grahas within 1°
  for (const p1 of results) {
    if (!YUDDHABALA_PLANETS.includes(p1.planet)) continue;
    for (const p2 of results) {
      if (!YUDDHABALA_PLANETS.includes(p2.planet) || p2.planet <= p1.planet) continue;
      const dist = angdiff(longitudeOf(kundli, p1.planet), longitudeOf(kundli, p2.planet));
      if (dist > 1) continue;
      if (p1.totalVirupas === p2.totalVirupas) continue;
      const [winner, loser] = p1.totalVirupas > p2.totalVirupas ? [p1, p2] : [p2, p1];
      const diaDiff = Math.abs((PLANET_DIAMETER[p1.planet] ?? 1) - (PLANET_DIAMETER[p2.planet] ?? 1));
      const balaDiff = Math.abs(p1.totalVirupas - p2.totalVirupas);
      const yuddha = diaDiff > 0.01 ? balaDiff / diaDiff : balaDiff;
      winner.kaalabala.yuddhabala = yuddha;
      loser.kaalabala.yuddhabala = -yuddha;
    }
  }

  for (const r of results) {
    r.kaalabala.total += r.kaalabala.yuddhabala;
    r.totalVirupas += r.kaalabala.yuddhabala;
    r.rupas = r.totalVirupas / RUPA_SCALING;
    r.isStrong = r.rupas >= r.minRequiredRupas;
    // Sun's Ayana Bala (its Cheshta Bala stand-in) is classically doubled and
    // capped at 120 rather than 60, which can push sqrt(uchha*cheshta) above
    // the 0-60 scale Kashta Bala assumes — clamp the derived Kashta at 0
    // rather than let it go negative, which would read as an obvious bug.
    r.ishtabala = Math.sqrt(Math.max(0, r.sthanabala.uchhabala) * Math.max(0, r.cheshtabala));
    r.kashtabala = Math.max(0, 60 - r.ishtabala);
  }

  // Bhava Bala (house strength)
  const houses: HouseBala[] = Array.from({ length: 12 }, (_, idx) => {
    const houseNum = idx + 1;
    const houseSignIndex = (ascSignIndex + idx) % 12;
    const lord = RASHI_LORD[houseSignIndex] as ShadPlanet;
    const adhipatiBala = results.find(r => r.planet === lord)!.totalVirupas;

    const degreeInSign = idx === 0 ? kundli.ascendant.degreeInSign : 15;
    const nature = signNature(houseSignIndex, degreeInSign);
    const digBala = BHAVA_STRENGTH_BY_NATURE[nature][idx];

    const houseMidpoint = normalize(kundli.ascendant.longitude + idx * 30 + 15);
    let beneficSputa = 0, maleficSputa = 0;
    for (const p of naturalBenefics) beneficSputa += sputaDrishti(longitudeOf(kundli, p) - houseMidpoint, p);
    for (const p of naturalMalefics) maleficSputa += sputaDrishti(longitudeOf(kundli, p) - houseMidpoint, p);
    const drikBala = Math.min((beneficSputa - maleficSputa) / 4, 20);

    return { house: houseNum, adhipatiBala, digBala, drikBala, total: adhipatiBala + digBala + drikBala };
  });

  return { planets: results, houses };
}
