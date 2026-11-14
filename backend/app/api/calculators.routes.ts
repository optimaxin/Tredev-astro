import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit.ts';
import { generateKundli } from '../services/astrology/kundli.ts';
import { checkKaalSarpDosha, checkPitraDosha, checkRahuKetuTransit, checkSadeSati } from '../services/astrology/doshas.ts';
import { getHouseFromAscendant, getNakshatra, getRashi, RASHIS } from '../services/astrology/zodiac.ts';
import { getPlanetaryPositions } from '../services/astrology/ephemeris.ts';
import type { PlanetId } from '../services/astrology/ephemeris.ts';
import { calculateNumerology, calculateNumerologyMatch, calculatePersonalCycle } from '../services/astrology/numerology.ts';
import { getUpcomingTransits } from '../services/astrology/upcomingTransits.ts';
import { getChineseZodiac } from '../services/astrology/chineseZodiac.ts';
import { calculateFlames } from '../services/astrology/flames.ts';
import { buildKundliMatchingReport } from '../services/astrology/kundliMatching.ts';
import { calculatePanchang } from '../services/astrology/panchang.ts';
import { getDailyHoroscope } from '../services/astrology/dailyHoroscope.ts';
import { getCurrentMahadasha } from '../services/astrology/vimshottariDasha.ts';
import { answerAstrologyQuestion } from '../services/astrology/aiGuidance.ts';
import { getLuckyAttributes } from '../services/astrology/avakhada.ts';
import { getBabyNameSyllable } from '../services/astrology/babyName.ts';
import { getLalKitabHouses } from '../services/astrology/lalKitab.ts';
import { geocodePlace, suggestPlaces, resolvePlaceId, type GeocodeResult } from '../services/geocoding.ts';
import { computeKundliFullCached, ttlCache } from '../services/astrology/kundliFullBuilder.ts';
import { rewriteKundliFull, warmDescriptionCache } from '../services/llm/kundliDescriptionRewriter.ts';
import { requireAuth } from '../middleware/auth.ts';
import { consumeFreeAiChatSeconds } from '../repositories/userRepository.ts';

export const calculatorsRouter = Router();

// Shared across every calculator route below (kundli, panchang, horoscope,
// numerology, doshas, …) — a mobile session firing off just a few of these
// per minute (Home's own Astrologers + Panchang preview calls, then
// whichever tool screen someone opens) was hitting this same 429 that
// looked like a broken "retry" on Panchang/Astrologers. 30/min total across
// every calculator was too tight for that; this only widens the budget,
// the per-IP fixed-window logic itself is unchanged.
const limiter = rateLimit({ windowMs: 60_000, max: 120 });

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// Shared birth-details schema: local date/time + place, converted to a UTC
// instant server-side — the client should never compute or send UTC itself.
const birthSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM (24h)'),
  timezoneOffsetMinutes: z.coerce.number().min(-720).max(840), // standard "UTC = local - offset" convention, so India (UTC+5:30) = +330 — see toUtcDate below, which subtracts this
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// Only /kundli-full reads this — the Hindi/English download toggle. Every
// other calculator endpoint stays English-only (out of scope for that
// feature), so this isn't part of the shared birthSchema.
const languageSchema = z.enum(['en', 'hi']).optional().default('en');

function toUtcDate(b: z.infer<typeof birthSchema>): Date {
  const [year, month, day] = b.date.split('-').map(Number);
  const [hour, minute] = b.time.split(':').map(Number);
  // Date.UTC treats its inputs as already-UTC fields, so this numerically
  // equals the local wall-clock reading mislabeled as UTC. timezoneOffsetMinutes
  // uses the standard "UTC = local - offset" convention (IST, UTC+5:30, is
  // +330), so subtracting it here converts that mislabeled value into the
  // actual UTC instant.
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - b.timezoneOffsetMinutes * 60_000);
}

// 60s: "today's" Panchang is timed from the live clock, so it can't be stale by much.
const panchangCache = ttlCache<unknown>(60_000, 500);

function handle(res: import('express').Response, fn: () => unknown) {
  try {
    res.json({ success: true, data: fn() });
  } catch (e) {
    if (e instanceof z.ZodError) return fail(res, 422, 'VALIDATION_ERROR', e.issues.map(i => i.message).join('; '));
    console.error(e);
    fail(res, 500, 'INTERNAL_ERROR', 'Calculation failed');
  }
}

calculatorsRouter.post('/kundli', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    return generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
  });
});

// The "Kundli maker ecosystem" endpoint — one call returning the chart plus
// everything built on top of it: the full-life Mahadasha timeline, every
// dosha check, the small well-defined yoga set, and a written analysis.
// Each piece reuses the exact same calculators already exposed individually
// above — this just composes them from one real chart instead of asking the
// client to make 6 separate requests.
calculatorsRouter.post('/kundli-full', limiter, async (req, res) => {
  try {
    const birth = birthSchema.parse(req.body);
    const language = languageSchema.parse(req.body?.language);
    const full = computeKundliFullCached(birth, language);
    // Applies whatever natural-language rewrites (NVIDIA NIM, see
    // kundliDescriptionRewriter.ts) are already cached from a previous
    // request — a pure DB lookup, never an LLM call, so the response is
    // never slowed down by (or dependent on) NVIDIA's API.
    const withCachedRewrites = await rewriteKundliFull(full, language);
    res.json({ success: true, data: withCachedRewrites });
    // Fire-and-forget: fills in whatever wasn't cached yet, in the
    // background, for next time. Never awaited — a slow or unreachable
    // NVIDIA endpoint can only delay how soon the nicer text shows up, never
    // this (or any other) request.
    warmDescriptionCache(full, language).catch(() => {});
  } catch (e) {
    if (e instanceof z.ZodError) return fail(res, 422, 'VALIDATION_ERROR', e.issues.map(i => i.message).join('; '));
    console.error(e);
    fail(res, 500, 'INTERNAL_ERROR', 'Calculation failed');
  }
});

calculatorsRouter.post('/nakshatra', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const positions = getPlanetaryPositions({ utcDate: toUtcDate(birth) });
    const moon = positions.find(p => p.id === 'moon')!;
    return { moonLongitude: moon.longitude, rashi: getRashi(moon.longitude).name, ...getNakshatra(moon.longitude) };
  });
});

calculatorsRouter.post('/sade-sati', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    const moonRashiIndex = Math.floor(kundli.planets.find(p => p.id === 'moon')!.longitude / 30);
    return checkSadeSati(moonRashiIndex, new Date());
  });
});

calculatorsRouter.post('/kaal-sarp-dosha', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return checkKaalSarpDosha(kundli);
  });
});

calculatorsRouter.post('/pitra-dosha', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return checkPitraDosha(kundli);
  });
});

calculatorsRouter.post('/rahu-ketu-transit', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    const moonRashiIndex = Math.floor(kundli.planets.find(p => p.id === 'moon')!.longitude / 30);
    return checkRahuKetuTransit(moonRashiIndex, new Date());
  });
});

calculatorsRouter.post('/lucky', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return getLuckyAttributes(kundli);
  });
});

calculatorsRouter.post('/baby-name', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return getBabyNameSyllable(kundli);
  });
});

calculatorsRouter.post('/lal-kitab', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return getLalKitabHouses(kundli);
  });
});

const numerologySchema = z.object({
  name: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

calculatorsRouter.post('/numerology', limiter, (req, res) => {
  handle(res, () => {
    const body = numerologySchema.parse(req.body);
    const [year, month, day] = body.date.split('-').map(Number);
    return calculateNumerology(new Date(Date.UTC(year, month - 1, day)), body.name);
  });
});

const flamesSchema = z.object({
  name1: z.string().trim().min(1).max(200),
  name2: z.string().trim().min(1).max(200),
});

calculatorsRouter.post('/flames', limiter, (req, res) => {
  handle(res, () => {
    const body = flamesSchema.parse(req.body);
    return calculateFlames(body.name1, body.name2);
  });
});

const numerologyMatchSchema = z.object({
  person1: numerologySchema,
  person2: numerologySchema,
});

calculatorsRouter.post('/numerology-match', limiter, (req, res) => {
  handle(res, () => {
    const body = numerologyMatchSchema.parse(req.body);
    const toDob = (d: string) => { const [y, m, day] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, day)); };
    return calculateNumerologyMatch(
      { dateOfBirth: toDob(body.person1.date), fullName: body.person1.name },
      { dateOfBirth: toDob(body.person2.date), fullName: body.person2.name },
    );
  });
});

const matchingSchema = z.object({
  bride: birthSchema,
  groom: birthSchema,
});

calculatorsRouter.post('/kundli-matching', limiter, (req, res) => {
  handle(res, () => {
    const body = matchingSchema.parse(req.body);
    return buildKundliMatchingReport(
      { utcDate: toUtcDate(body.bride), latitude: body.bride.latitude, longitude: body.bride.longitude },
      { utcDate: toUtcDate(body.groom), latitude: body.groom.latitude, longitude: body.groom.longitude },
    );
  });
});

const panchangSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

calculatorsRouter.post('/panchang', limiter, (req, res) => {
  handle(res, () => {
    const body = panchangSchema.parse(req.body);
    // ~1km rounding: plenty for sunrise/tithi timings, lets nearby visitors share an entry.
    const lat = Math.round(body.latitude * 100) / 100, lon = Math.round(body.longitude * 100) / 100;
    return panchangCache(`${body.date}|${lat}|${lon}`, () => calculatePanchang(body.date, lat, lon));
  });
});

const horoscopeSchema = z.object({
  rashi: z.enum(RASHIS),
});

calculatorsRouter.post('/daily-horoscope', limiter, (req, res) => {
  handle(res, () => {
    const body = horoscopeSchema.parse(req.body);
    return getDailyHoroscope(body.rashi, new Date());
  });
});

// Weekly/Monthly/Half-Year/Full-Year "horoscope" — the current transit
// snapshot (reused from Daily) plus REAL upcoming sign-change events within
// that window, not a written prediction. Longer windows drop the Sun/
// Mercury/Venus (which just cycle back through every sign every ~year
// anyway — not meaningful "upcoming" news over 6-12 months) and the Moon
// entirely (it changes sign every ~2.25 days; even a week would list 2-3
// changes that add noise without insight — its current position is already
// in the snapshot above).
const PERIOD_WINDOW_DAYS: Record<string, number> = { weekly: 7, monthly: 30, 'half-year': 182, 'full-year': 365 };
const PERIOD_PLANETS: Record<string, PlanetId[]> = {
  weekly: ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu', 'ketu'],
  monthly: ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'rahu', 'ketu'],
  'half-year': ['mars', 'jupiter', 'saturn', 'rahu', 'ketu'],
  'full-year': ['mars', 'jupiter', 'saturn', 'rahu', 'ketu'],
};

const horoscopePeriodSchema = z.object({
  rashi: z.enum(RASHIS),
  period: z.enum(['weekly', 'monthly', 'half-year', 'full-year']),
});

// Upcoming transits depend only on the period and the clock — not the
// rashi — and the full-year scan costs seconds of CPU (hundreds of
// ephemeris calls), so compute each period once an hour and share it
// across every visitor/rashi instead of blocking the event loop per request.
const TRANSITS_TTL_MS = 60 * 60_000;
const transitsCache = new Map<string, { at: number; events: ReturnType<typeof getUpcomingTransits> }>();

function cachedUpcomingTransits(period: string, now: Date) {
  let entry = transitsCache.get(period);
  if (!entry || now.getTime() - entry.at > TRANSITS_TTL_MS) {
    entry = { at: now.getTime(), events: getUpcomingTransits(now, PERIOD_WINDOW_DAYS[period], PERIOD_PLANETS[period]) };
    transitsCache.set(period, entry);
  }
  const nowIso = now.toISOString();
  return entry.events.filter(e => e.date > nowIso); // drop any crossing that's passed since caching
}

calculatorsRouter.post('/horoscope-period', limiter, (req, res) => {
  handle(res, () => {
    const body = horoscopePeriodSchema.parse(req.body);
    const now = new Date();
    const current = getDailyHoroscope(body.rashi, now);
    const upcomingTransits = cachedUpcomingTransits(body.period, now);
    return { ...current, period: body.period, upcomingTransits };
  });
});

const chineseZodiacSchema = z.object({
  year: z.coerce.number().int().min(1900).max(2100),
});

calculatorsRouter.post('/chinese-zodiac', limiter, (req, res) => {
  handle(res, () => {
    const body = chineseZodiacSchema.parse(req.body);
    return getChineseZodiac(body.year);
  });
});

const numerologyHoroscopeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

calculatorsRouter.post('/numerology-horoscope', limiter, (req, res) => {
  handle(res, () => {
    const body = numerologyHoroscopeSchema.parse(req.body);
    const [year, month, day] = body.date.split('-').map(Number);
    return calculatePersonalCycle(new Date(Date.UTC(year, month - 1, day)), new Date());
  });
});

// ── My Sky (personal daily dashboard) ───────────────────────────────────
// Same stateless birth-details-in/result-out shape as every other
// calculator above — no separate user-birth storage needed, this just
// combines the Kundli, a real Vimshottari Mahadasha, and today's Moon/
// Jupiter transit into the one payload the "Meri Jyotish" section needs.

calculatorsRouter.post('/my-sky', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const utcDate = toUtcDate(birth);
    const kundli = generateKundli({ utcDate, latitude: birth.latitude, longitude: birth.longitude });
    const moon = kundli.planets.find(p => p.id === 'moon')!;
    const sun = kundli.planets.find(p => p.id === 'sun')!;

    const span = 360 / 27;
    const fractionElapsed = (moon.longitude % span) / span;
    const mahadasha = getCurrentMahadasha(utcDate, getNakshatra(moon.longitude).index, fractionElapsed, new Date());

    const todayPositions = getPlanetaryPositions({ utcDate: new Date() });
    const todayMoon = todayPositions.find(p => p.id === 'moon')!;
    const todayJupiter = todayPositions.find(p => p.id === 'jupiter')!;
    const moonRashiIndex = getRashi(moon.longitude).index;

    return {
      ascendantRashi: kundli.ascendant.rashi,
      moonRashi: moon.rashi,
      moonNakshatra: kundli.moonNakshatra,
      sunRashi: sun.rashi,
      mahadasha,
      todayMoonNakshatra: getNakshatra(todayMoon.longitude).name,
      jupiterHouseFromMoon: getHouseFromAscendant(moonRashiIndex, getRashi(todayJupiter.longitude).index),
    };
  });
});

// ── Ask TredevAstro AI ───────────────────────────────────────────────────
// Not a live LLM call — a template engine over a REAL computed chart and
// Mahadasha, same spirit as every other calculator here. See aiGuidance.ts.

const aiAskSchema = birthSchema.extend({
  question: z.string().trim().min(1).max(500),
});
const aiLimiter = rateLimit({ windowMs: 60_000, max: 20 });

calculatorsRouter.post('/ai-ask', aiLimiter, (req, res) => {
  handle(res, () => {
    const body = aiAskSchema.parse(req.body);
    const utcDate = toUtcDate(body);
    const kundli = generateKundli({ utcDate, latitude: body.latitude, longitude: body.longitude });
    const moon = kundli.planets.find(p => p.id === 'moon')!;
    const span = 360 / 27;
    const fractionElapsed = (moon.longitude % span) / span;
    const mahadasha = getCurrentMahadasha(utcDate, getNakshatra(moon.longitude).index, fractionElapsed, new Date());
    return { answer: answerAstrologyQuestion(body.question, kundli, mahadasha) };
  });
});

// Real, server-tracked balance instead of the frontend's old plain 5-minute
// countdown (which a page refresh reset for free) — consumes whatever the
// account currently has (set at signup, or by staff for a dispute — see
// userRepository.ts's consumeFreeAiChatSeconds/setFreeAiChatSeconds) and
// hands that back as this session's actual countdown length.
calculatorsRouter.post('/ai-chat/start', requireAuth, async (req, res) => {
  const grantedSeconds = await consumeFreeAiChatSeconds(req.user!.id);
  res.json({ success: true, data: { grantedSeconds } });
});

// ── Place → coordinates ────────────────────────────────────────────────
// A birth chart's Ascendant/houses depend on exact latitude/longitude, so
// "City, Country" typed into a form is useless without geocoding it first.
// See services/geocoding.ts for the actual provider (AWS Location Service
// when configured, Nominatim fallback) — this route just caches repeat
// lookups (many users search the same handful of cities) and rate-limits.
const geocodeCache = new Map<string, GeocodeResult>();
const geocodeLimiter = rateLimit({ windowMs: 60_000, max: 20 });

calculatorsRouter.get('/geocode', geocodeLimiter, async (req, res) => {
  const place = String(req.query.place || '').trim();
  if (!place || place.length < 2) return fail(res, 422, 'VALIDATION_ERROR', 'place must be at least 2 characters');

  const cacheKey = place.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const data = await geocodePlace(place);
    if (!data) return fail(res, 404, 'NOT_FOUND', 'Could not find that place. Try a more specific city name.');
    geocodeCache.set(cacheKey, data);
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    fail(res, 502, 'GEOCODE_ERROR', 'Could not look up that place right now. Please try again.');
  }
});

// Live suggestions as the user types (see services/geocoding.ts for why this
// beats a single geocode-on-submit). Never hard-fails — an empty list just
// means the field falls back to plain free-text + submit-time geocoding, so
// a flaky suggest call never blocks someone from finishing the form.
const suggestLimiter = rateLimit({ windowMs: 60_000, max: 60 });

calculatorsRouter.get('/place-suggest', suggestLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: [] });
  try {
    res.json({ success: true, data: await suggestPlaces(q) });
  } catch (e) {
    console.error(e);
    res.json({ success: true, data: [] });
  }
});

// Resolves one AWS-sourced suggestion (PlaceId) to real coordinates —
// separate from /place-suggest so this (billed, slower) call only happens
// once, for the single suggestion someone actually picks.
calculatorsRouter.get('/place-resolve', geocodeLimiter, async (req, res) => {
  const placeId = String(req.query.placeId || '').trim();
  if (!placeId) return fail(res, 422, 'VALIDATION_ERROR', 'placeId is required');
  try {
    const data = await resolvePlaceId(placeId);
    if (!data) return fail(res, 404, 'NOT_FOUND', 'Could not resolve that place.');
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    fail(res, 502, 'GEOCODE_ERROR', 'Could not resolve that place right now.');
  }
});
