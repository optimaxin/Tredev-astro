# Panchang — TredevAstro

Everything the "Panchang" feature is built from, pulled out of the main
TredevAstro repo (React + Vite frontend, Express + TypeScript backend) so
it's easy to read/share on its own. These are real copies of the current
source files, not a rewrite.

## What it computes

Tithi, Vara (weekday), Nakshatra, Yoga, Karana, Moon/Sun rashi, sunrise,
sunset, moonrise, moonset, Rahu/Yamaganda/Gulika Kaal, Abhijit Muhurat,
Vijaya Muhurat, Amrit Kaal, and Sarvartha Siddhi Yoga — all derived from
real planetary positions and a real sunrise/sunset calculation, nothing
hardcoded per date. See `backend/panchang.ts` for the full derivation of
each field, with comments on the classical rule behind it.

## Files

**`backend/`**
- `panchang.ts` — the actual Panchang calculation. Start here.
- `ephemeris.ts` — Sun/Moon/planet positions (VSOP87/ELP2000 via the
  `astronomia` npm package). `panchang.ts` depends on this for the raw
  Sun/Moon longitudes everything else is derived from.
- `zodiac.ts` — sign (rashi) and Nakshatra lookup from a longitude.
- `swissEphemeris.ts` — only the moonrise/moonset piece is Panchang's;
  this file also has Placidus house cusps for an unrelated feature
  (Bhav Chalit / KP astrology), included here only because
  `panchang.ts` imports `getMoonRiseSet` from it.

**`frontend/`**
- `Panchang.tsx` / `Panchang.module.css` — the UI: a brand-headered,
  all-Hindi shareable card (matching the "forward this on WhatsApp" style
  of a real printed Panchang), a day/night sun-and-moon arc that tracks
  the actual current time and names the current Prahar, and a "share as
  image" button (captures the card via `html2canvas`).
- `panchangHindi.ts` — Devanagari name tables for the fixed classical
  terms (weekday, rashi, nakshatra, tithi, yoga, karana) the API returns
  in English.
- `istTime.ts` — small IST time-formatting helpers used by the arc.

## How it's wired into the app (not copied here — full files are large
and mostly unrelated to Panchang)

Backend route (`backend/app/api/calculators.routes.ts`):
```ts
const panchangSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

calculatorsRouter.post('/panchang', limiter, (req, res) => {
  handle(res, () => {
    const body = panchangSchema.parse(req.body);
    return calculatePanchang(body.date, body.latitude, body.longitude);
  });
});
```

Frontend call (`frontend/src/services/calculatorService.ts`):
```ts
panchang: (date: string, latitude: number, longitude: number) =>
  request<PanchangResult>('/api/calculators/panchang', {
    method: 'POST',
    body: JSON.stringify({ date, latitude, longitude }),
  }),
```

`PanchangResult` (the exact shape the API returns):
```ts
export interface PanchangResult {
  date: string;
  vara: string;
  tithi: { name: string; paksha: 'Shukla' | 'Krishna'; number: number };
  nakshatra: { name: string; pada: number; lord: string };
  yoga: string;
  karana: string;
  moonRashi: string;
  sunRashi: string;
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  rahuKaal: { start: string; end: string } | null;
  yamagandaKaal: { start: string; end: string } | null;
  gulikaKaal: { start: string; end: string } | null;
  abhijitMuhurat: { start: string; end: string } | null;
  vijayaMuhurat: { start: string; end: string } | null;
  amritKaal: { start: string; end: string } | null;
  sarvarthaSiddhiYoga: boolean;
  choghadiya: { day: ChoghadiyaSegment[]; night: ChoghadiyaSegment[] } | null;
}
```

## Dependencies

Backend: `astronomia` (Sun/Moon ephemeris + sunrise/sunset), `sweph`
(Swiss Ephemeris binding, used here only for moonrise/moonset).
Frontend: `framer-motion` (card animation), `html2canvas` (share-as-image).

## Not included

The route file, the calculator service file, and the design-token CSS
(`globals.css`) are shared across many other unrelated features in the
main app, so only the small relevant excerpts are quoted above rather
than copying the whole files.
