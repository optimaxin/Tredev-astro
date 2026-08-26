// Thin client for the astrology calculator API
// (backend/app/api/calculators.routes.ts). Every real calculator on the
// site goes through here — nothing computes astrology client-side.

import { API_URL } from './apiUrl';

export class CalculatorApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  } catch {
    throw new CalculatorApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new CalculatorApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface BirthDetailsInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24h
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface PlanetChartEntry {
  id: string;
  longitude: number;
  rashi: string;
  degreeInSign: number;
  house: number;
  nakshatra: string;
  nakshatraPada: number;
  nakshatraLord: string;
  retrograde: boolean;
}

export interface KundliResult {
  ascendant: { longitude: number; rashi: string; degreeInSign: number };
  planets: PlanetChartEntry[];
  moonNakshatra: { name: string; pada: number; lord: string };
}

export interface NakshatraResult {
  moonLongitude: number;
  rashi: string;
  index: number;
  name: string;
  pada: number;
  lord: string;
}

export interface MangalDoshaResult {
  isManglik: boolean;
  marsHouse: number;
  rule: 'from-ascendant';
}

export interface SadeSatiResult {
  active: boolean;
  phase: 'rising' | 'peak' | 'setting' | null;
  moonRashi: string;
  saturnTransitRashi: string;
}

export interface NumerologyResult {
  lifePathNumber: number;
  destinyNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
}

export interface KaalSarpDoshaResult {
  isKaalSarp: boolean;
  rahuRashi: string;
  ketuRashi: string;
  enclosedSide: 'rahu-to-ketu' | 'ketu-to-rahu' | null;
}

export interface RahuKetuTransitResult {
  moonRashi: string;
  rahuTransitRashi: string;
  ketuTransitRashi: string;
  rahuHouseFromMoon: number;
  ketuHouseFromMoon: number;
}

export type NumerologyAffinity = 'same' | 'grouped' | 'different';

export interface NumerologyMatchResult {
  person1: NumerologyResult;
  person2: NumerologyResult;
  lifePathAffinity: NumerologyAffinity;
  destinyAffinity: NumerologyAffinity;
  soulUrgeAffinity: NumerologyAffinity;
  compatibilityScore: number;
}

export interface GunMilanKoota {
  name: string;
  maxPoints: number;
  points: number;
}

export interface GunMilanResult {
  totalPoints: number;
  maxPoints: 36;
  kootas: GunMilanKoota[];
  brideMoonRashi: string;
  groomMoonRashi: string;
  brideNakshatra: string;
  groomNakshatra: string;
}

export interface ChoghadiyaSegment {
  name: string;
  auspicious: boolean;
  start: string;
  end: string;
}

export interface PanchangResult {
  date: string;
  vara: string;
  tithi: { name: string; paksha: 'Shukla' | 'Krishna'; number: number };
  nakshatra: { name: string; pada: number; lord: string };
  yoga: string;
  karana: string;
  moonRashi: string;
  sunrise: string | null;
  sunset: string | null;
  rahuKaal: { start: string; end: string } | null;
  yamagandaKaal: { start: string; end: string } | null;
  gulikaKaal: { start: string; end: string } | null;
  abhijitMuhurat: { start: string; end: string } | null;
  choghadiya: { day: ChoghadiyaSegment[]; night: ChoghadiyaSegment[] } | null;
}

export interface DailyTransitEntry {
  id: string;
  rashi: string;
  house: number;
  retrograde: boolean;
}

export interface DailyHoroscopeResult {
  moonSignRashi: string;
  date: string;
  transits: DailyTransitEntry[];
}

export interface AntardashaPeriod {
  lord: string;
  startsAt: string;
  endsAt: string;
}

export interface MahadashaPeriod {
  lord: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
  antardashas: AntardashaPeriod[];
}

export interface YogaResult {
  name: string;
  present: boolean;
  description: string;
}

export interface KundliAnalysis {
  lagna: string;
  moon: string;
  planets: { id: string; text: string }[];
}

export interface NavamsaChart {
  ascendant: { rashi: string };
  planets: { id: string; rashi: string; house: number }[];
}

export interface ChandraChart {
  moonRashi: string;
  planets: { id: string; rashi: string; degreeInSign: number; house: number; retrograde: boolean }[];
}

export interface AvakhadaResult {
  varna: string;
  vashya: string;
  yoni: string;
  gana: string;
  nadi: string;
  paya: string;
  tatva: string;
  signLord: string;
  nakshatraLord: string;
  pada: number;
}

export interface GemstoneResult {
  purpose: 'Life Stone' | 'Lucky Stone' | 'Fortune Stone';
  rulingPlanet: string;
  gemstone: string;
  sanskritName: string;
  metal: string;
  finger: string;
  mantra: string;
  color: string;
  reason: string;
}

export interface GemstoneRecommendations {
  life: GemstoneResult;
  lucky: GemstoneResult;
  fortune: GemstoneResult;
}

export interface RudrakshaResult {
  rulingPlanet: string;
  mukhi: number;
  deity: string;
  benefits: string[];
  howToWear: string;
  precautions: string[];
  reason: string;
}

export interface AscendantPredictions {
  ascendant: string;
  description: string;
  personality: string;
  physical: string;
  health: string;
  career: string;
  relationship: string;
}

export interface DashaPrediction {
  lord: string;
  text: string;
}

export interface VargaChart {
  ascendant: { rashi: string };
  planets: { id: string; rashi: string; house: number }[];
}

export interface YoginiPeriod {
  yogini: string;
  lord: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

export interface AshtakavargaResult {
  bhinna: { planet: string; points: { rashi: string; bindus: number }[] }[];
  sarva: { rashi: string; bindus: number }[];
  sarvaTotal: number;
}

export interface PlanetShadbala {
  planet: string;
  totalVirupas: number;
  rupas: number;
  minRequiredRupas: number;
  isStrong: boolean;
  ishtabala: number;
  kashtabala: number;
  sthanabala: { total: number };
  digbala: number;
  kaalabala: { total: number };
  cheshtabala: number;
  naisargikabala: number;
  drikbala: number;
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

export interface KpRow {
  id: string;
  rashi: string;
  signLord: string;
  starLord: string;
  subLord: string;
}

export interface KpResult {
  table: KpRow[];
  cusps: KpRow[];
  rulingPlanets: {
    lagnaSignLord: string;
    lagnaStarLord: string;
    lagnaSubLord: string;
    moonSignLord: string;
    moonStarLord: string;
    moonSubLord: string;
    dayLord: string;
  };
}

export interface BhavChalitChart {
  ascendant: { rashi: string };
  planets: { id: string; rashi: string; house: number }[];
  cusps: { house: number; rashi: string; degreeInSign: number }[];
}

export const VARGA_LABELS: Record<string, string> = {
  D2: 'Hora (D2) — Wealth', D3: 'Drekkana (D3) — Siblings & Courage', D4: 'Chaturthamsa (D4) — Home & Property',
  D6: 'Shashthamsa (D6) — Health & Enemies',
  D7: 'Saptamsa (D7) — Children', D10: 'Dasamsa (D10) — Career', D12: 'Dwadasamsa (D12) — Parents',
  D16: 'Shodasamsa (D16) — Vehicles & Comforts', D20: 'Vimsamsa (D20) — Spiritual Progress',
  D24: 'Chaturvimsamsa (D24) — Education', D27: 'Saptavimsamsa (D27) — Strengths & Weaknesses',
  D30: 'Trimsamsa (D30) — Misfortunes', D40: 'Khavedamsa (D40) — General Effects',
  D45: 'Akshavedamsa (D45) — Character', D60: 'Shashtiamsa (D60) — Overall Life',
};

export interface KundliFullResult {
  kundli: KundliResult;
  navamsaChart: NavamsaChart;
  chandraChart: ChandraChart;
  bhavChalit: BhavChalitChart;
  vargaCharts: Record<string, VargaChart>;
  mahadashaTimeline: MahadashaPeriod[];
  yoginiDashaTimeline: YoginiPeriod[];
  doshas: {
    mangal: MangalDoshaResult;
    kaalSarp: KaalSarpDoshaResult;
    sadeSati: SadeSatiResult;
    rahuKetuTransit: RahuKetuTransitResult;
  };
  yogas: YogaResult[];
  analysis: KundliAnalysis;
  ascendantPredictions: AscendantPredictions;
  dashaPredictions: DashaPrediction[];
  avakhada: AvakhadaResult;
  gemstones: GemstoneRecommendations;
  rudraksha: RudrakshaResult;
  panchang: PanchangResult;
  ashtakavarga: AshtakavargaResult;
  kp: KpResult;
  shadbala: ShadbalaResult;
}

export interface MySkyResult {
  ascendantRashi: string;
  moonRashi: string;
  moonNakshatra: { name: string; pada: number; lord: string };
  sunRashi: string;
  mahadasha: MahadashaPeriod;
  todayMoonNakshatra: string;
  jupiterHouseFromMoon: number;
}

export const calculatorService = {
  geocode: (place: string) => request<GeocodeResult>(`/api/calculators/geocode?place=${encodeURIComponent(place)}`),
  kundli: (birth: BirthDetailsInput) => request<KundliResult>('/api/calculators/kundli', { method: 'POST', body: JSON.stringify(birth) }),
  kundliFull: (birth: BirthDetailsInput) => request<KundliFullResult>('/api/calculators/kundli-full', { method: 'POST', body: JSON.stringify(birth) }),
  nakshatra: (birth: BirthDetailsInput) => request<NakshatraResult>('/api/calculators/nakshatra', { method: 'POST', body: JSON.stringify(birth) }),
  mangalDosha: (birth: BirthDetailsInput) => request<MangalDoshaResult>('/api/calculators/mangal-dosha', { method: 'POST', body: JSON.stringify(birth) }),
  sadeSati: (birth: BirthDetailsInput) => request<SadeSatiResult>('/api/calculators/sade-sati', { method: 'POST', body: JSON.stringify(birth) }),
  numerology: (name: string, date: string) => request<NumerologyResult>('/api/calculators/numerology', { method: 'POST', body: JSON.stringify({ name, date }) }),
  kundliMatching: (bride: BirthDetailsInput, groom: BirthDetailsInput) =>
    request<GunMilanResult>('/api/calculators/kundli-matching', { method: 'POST', body: JSON.stringify({ bride, groom }) }),
  kaalSarpDosha: (birth: BirthDetailsInput) => request<KaalSarpDoshaResult>('/api/calculators/kaal-sarp-dosha', { method: 'POST', body: JSON.stringify(birth) }),
  rahuKetuTransit: (birth: BirthDetailsInput) => request<RahuKetuTransitResult>('/api/calculators/rahu-ketu-transit', { method: 'POST', body: JSON.stringify(birth) }),
  numerologyMatch: (person1: { name: string; date: string }, person2: { name: string; date: string }) =>
    request<NumerologyMatchResult>('/api/calculators/numerology-match', { method: 'POST', body: JSON.stringify({ person1, person2 }) }),
  panchang: (date: string, latitude: number, longitude: number) =>
    request<PanchangResult>('/api/calculators/panchang', { method: 'POST', body: JSON.stringify({ date, latitude, longitude }) }),
  dailyHoroscope: (rashi: string) =>
    request<DailyHoroscopeResult>('/api/calculators/daily-horoscope', { method: 'POST', body: JSON.stringify({ rashi }) }),
  mySky: (birth: BirthDetailsInput) => request<MySkyResult>('/api/calculators/my-sky', { method: 'POST', body: JSON.stringify(birth) }),
  aiAsk: (birth: BirthDetailsInput, question: string) =>
    request<{ answer: string }>('/api/calculators/ai-ask', { method: 'POST', body: JSON.stringify({ ...birth, question }) }),
};
