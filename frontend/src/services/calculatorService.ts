// Thin client for the astrology calculator API
// (backend/app/api/calculators.routes.ts). Every real calculator on the
// site goes through here — nothing computes astrology client-side.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

export const calculatorService = {
  geocode: (place: string) => request<GeocodeResult>(`/api/calculators/geocode?place=${encodeURIComponent(place)}`),
  kundli: (birth: BirthDetailsInput) => request<KundliResult>('/api/calculators/kundli', { method: 'POST', body: JSON.stringify(birth) }),
  nakshatra: (birth: BirthDetailsInput) => request<NakshatraResult>('/api/calculators/nakshatra', { method: 'POST', body: JSON.stringify(birth) }),
  mangalDosha: (birth: BirthDetailsInput) => request<MangalDoshaResult>('/api/calculators/mangal-dosha', { method: 'POST', body: JSON.stringify(birth) }),
  sadeSati: (birth: BirthDetailsInput) => request<SadeSatiResult>('/api/calculators/sade-sati', { method: 'POST', body: JSON.stringify(birth) }),
  numerology: (name: string, date: string) => request<NumerologyResult>('/api/calculators/numerology', { method: 'POST', body: JSON.stringify({ name, date }) }),
  kundliMatching: (bride: BirthDetailsInput, groom: BirthDetailsInput) =>
    request<GunMilanResult>('/api/calculators/kundli-matching', { method: 'POST', body: JSON.stringify({ bride, groom }) }),
};
