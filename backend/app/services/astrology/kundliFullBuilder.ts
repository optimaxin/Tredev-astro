import { generateKundli, getNavamsaChart, getChandraChart } from './kundli.ts';
import { checkKaalSarpDosha, checkRahuKetuTransit, checkSadeSati } from './doshas.ts';
import { getNakshatra, getRashi } from './zodiac.ts';
import { checkYogas } from './yogas.ts';
import { buildKundliAnalysis } from './kundliAnalysis.ts';
import { buildAvakhada, recommendGemstones, recommendRudraksha } from './avakhada.ts';
import { getAllVargaCharts } from './divisionalCharts.ts';
import { getYoginiDashaTimeline } from './yoginiDasha.ts';
import { calculateAshtakavarga } from './ashtakavarga.ts';
import { buildKpTable, getBhavChalitChart } from './kpAstrology.ts';
import { getSiderealHouseCusps } from './swissEphemeris.ts';
import { calculateShadbala } from './shadbala.ts';
import { buildAscendantPredictions } from './ascendantPredictions.ts';
import { buildDashaPredictions } from './dashaPredictions.ts';
import { calculatePanchang } from './panchang.ts';
import { getMahadashaTimeline } from './vimshottariDasha.ts';

export interface KundliFullBirthInput {
  date: string;
  time: string;
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
}

function toUtcDate(b: KundliFullBirthInput): Date {
  const [year, month, day] = b.date.split('-').map(Number);
  const [hour, minute] = b.time.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - b.timezoneOffsetMinutes * 60_000);
}

// ponytail: in-process TTL cache, oldest-first eviction, per instance.
// Calculator results are pure functions of their input (plus the clock, so
// every key below carries the date and a TTL), and the same inputs repeat a
// lot — every homepage visitor asks for today's Panchang for the same
// default city; a kundli is re-requested on language toggle / after login.
export function ttlCache<T>(ttlMs: number, maxEntries: number) {
  const entries = new Map<string, { at: number; value: T }>();
  return (key: string, compute: () => T): T => {
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && now - hit.at < ttlMs) return hit.value;
    const value = compute();
    entries.delete(key);
    entries.set(key, { at: now, value });
    if (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
    return value;
  };
}

// The "Kundli maker ecosystem" composite — one call returning the chart plus
// everything built on top of it: the full-life Mahadasha timeline, every
// dosha check, the small well-defined yoga set, and a written analysis.
// Shared by both the public /api/calculators/kundli-full route and the
// astrologer-side "client Kundli" sidebar (chatService.ts) — same real
// computation either way, never two implementations to keep in sync.
export function buildKundliFull(birth: KundliFullBirthInput, language: 'en' | 'hi') {
  const utcDate = toUtcDate(birth);
  const kundli = generateKundli({ utcDate, latitude: birth.latitude, longitude: birth.longitude });
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const moonRashiIndex = getRashi(moon.longitude).index;

  const span = 360 / 27;
  const fractionElapsed = (moon.longitude % span) / span;
  const now = new Date();
  const mahadashaTimeline = getMahadashaTimeline(utcDate, getNakshatra(moon.longitude).index, fractionElapsed, now);

  const yoginiDashaTimeline = getYoginiDashaTimeline(utcDate, getNakshatra(moon.longitude).index, fractionElapsed, now);

  const navamsaChart = getNavamsaChart(kundli);
  const chandraChart = getChandraChart(kundli);
  const vargaCharts = getAllVargaCharts(kundli);
  const [birthHourStr, birthMinuteStr] = birth.time.split(':');
  const birthLocalHour = Number(birthHourStr) + Number(birthMinuteStr) / 60;
  const houseCusps = getSiderealHouseCusps(utcDate, birth.latitude, birth.longitude, kundli.ascendant.longitude);

  return {
    kundli,
    navamsaChart,
    chandraChart,
    vargaCharts,
    mahadashaTimeline,
    yoginiDashaTimeline,
    shadbala: calculateShadbala({
      kundli, navamsaChart, vargaCharts, birthUtcDate: utcDate, birthLocalHour,
      dateOnly: birth.date, latitude: birth.latitude, longitude: birth.longitude,
    }),
    doshas: {
      kaalSarp: checkKaalSarpDosha(kundli),
      sadeSati: checkSadeSati(moonRashiIndex, now),
      rahuKetuTransit: checkRahuKetuTransit(moonRashiIndex, now),
    },
    yogas: checkYogas(kundli, language),
    analysis: buildKundliAnalysis(kundli, language),
    ascendantPredictions: buildAscendantPredictions(kundli.ascendant.rashi, language),
    dashaPredictions: buildDashaPredictions(kundli, mahadashaTimeline, language),
    avakhada: buildAvakhada(kundli, language),
    gemstones: recommendGemstones(kundli, language),
    rudraksha: recommendRudraksha(kundli, language),
    panchang: calculatePanchang(birth.date, birth.latitude, birth.longitude),
    ashtakavarga: calculateAshtakavarga(kundli),
    kp: buildKpTable(kundli, utcDate, houseCusps),
    bhavChalit: getBhavChalitChart(kundli, houseCusps),
  };
}

export type KundliFullResult = ReturnType<typeof buildKundliFull>;

// ~53KB each → ≤ ~10MB. Keyed by UTC day too — dasha/sade-sati read "now".
const kundliFullCache = ttlCache<KundliFullResult>(30 * 60_000, 200);

export function computeKundliFullCached(birth: KundliFullBirthInput, language: 'en' | 'hi'): KundliFullResult {
  const key = [birth.date, birth.time, birth.timezoneOffsetMinutes, birth.latitude, birth.longitude, language, new Date().toISOString().slice(0, 10)].join('|');
  return kundliFullCache(key, () => buildKundliFull(birth, language));
}
