import { Router } from 'express';
import { z } from 'zod';
import { rateLimit } from '../middleware/rateLimit.ts';
import { generateKundli } from '../services/astrology/kundli.ts';
import { checkMangalDosha, checkSadeSati } from '../services/astrology/doshas.ts';
import { getNakshatra, getRashi } from '../services/astrology/zodiac.ts';
import { getPlanetaryPositions } from '../services/astrology/ephemeris.ts';
import { calculateNumerology } from '../services/astrology/numerology.ts';
import { calculateGunMilan } from '../services/astrology/gunMilan.ts';

export const calculatorsRouter = Router();

const limiter = rateLimit({ windowMs: 60_000, max: 30 });

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// Shared birth-details schema: local date/time + place, converted to a UTC
// instant server-side — the client should never compute or send UTC itself.
const birthSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM (24h)'),
  timezoneOffsetMinutes: z.coerce.number().min(-720).max(840), // e.g. India = -330 (UTC+5:30, so offset FROM local TO UTC is -330)
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

function toUtcDate(b: z.infer<typeof birthSchema>): Date {
  const [year, month, day] = b.date.split('-').map(Number);
  const [hour, minute] = b.time.split(':').map(Number);
  // Date.UTC treats its inputs as already-UTC fields, so shifting by the
  // timezone offset here is what actually converts "local wall-clock time"
  // into the correct UTC instant.
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + b.timezoneOffsetMinutes * 60_000);
}

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

calculatorsRouter.post('/nakshatra', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const positions = getPlanetaryPositions({ utcDate: toUtcDate(birth) });
    const moon = positions.find(p => p.id === 'moon')!;
    return { moonLongitude: moon.longitude, rashi: getRashi(moon.longitude).name, ...getNakshatra(moon.longitude) };
  });
});

calculatorsRouter.post('/mangal-dosha', limiter, (req, res) => {
  handle(res, () => {
    const birth = birthSchema.parse(req.body);
    const kundli = generateKundli({ utcDate: toUtcDate(birth), latitude: birth.latitude, longitude: birth.longitude });
    return checkMangalDosha(kundli);
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

const matchingSchema = z.object({
  bride: birthSchema,
  groom: birthSchema,
});

calculatorsRouter.post('/kundli-matching', limiter, (req, res) => {
  handle(res, () => {
    const body = matchingSchema.parse(req.body);
    const brideMoon = getPlanetaryPositions({ utcDate: toUtcDate(body.bride) }).find(p => p.id === 'moon')!;
    const groomMoon = getPlanetaryPositions({ utcDate: toUtcDate(body.groom) }).find(p => p.id === 'moon')!;
    return calculateGunMilan(brideMoon.longitude, groomMoon.longitude);
  });
});

// ── Place → coordinates ────────────────────────────────────────────────
// A birth chart's Ascendant/houses depend on exact latitude/longitude, so
// "City, Country" typed into a form is useless without geocoding it first.
// Backed by OpenStreetMap Nominatim (free, no API key) — called server-side
// so we can set the required User-Agent and cache repeat lookups (many users
// search the same handful of cities), rather than every browser hitting
// Nominatim directly with no rate control at all.
const geocodeCache = new Map<string, { latitude: number; longitude: number; displayName: string }>();
const geocodeLimiter = rateLimit({ windowMs: 60_000, max: 20 });

calculatorsRouter.get('/geocode', geocodeLimiter, async (req, res) => {
  const place = String(req.query.place || '').trim();
  if (!place || place.length < 2) return fail(res, 422, 'VALIDATION_ERROR', 'place must be at least 2 characters');

  const cacheKey = place.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'TredevAstro/1.0 (astrology calculator birth-place lookup)' } });
    const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!results.length) return fail(res, 404, 'NOT_FOUND', 'Could not find that place. Try a more specific city name.');

    const data = { latitude: Number(results[0].lat), longitude: Number(results[0].lon), displayName: results[0].display_name };
    geocodeCache.set(cacheKey, data);
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    fail(res, 502, 'GEOCODE_ERROR', 'Could not look up that place right now. Please try again.');
  }
});
