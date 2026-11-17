# Premium Reports

Integrates the Tradeva Premium **Stage 6** report engine (`D:\Tradeva Premium\kb_report`)
into the TredevAstro website as a first-class feature.

## Why there is a proxy

The Stage 6 service (`kb_report/api.py`, FastAPI) has **no authentication and no
concept of a user**. Any caller who can reach it and knows a 16-hex report id can
read that report's birth details and full generated content, and `POST /generate`
is open to anyone.

It is therefore never exposed to browsers. Instead:

```
browser ──VITE_API_URL──> Express backend ──PREMIUM_REPORT_API_URL──> Stage 6 (private)
            (JWT auth)      /api/premium-reports      (localhost / private net)
```

`app/api/premiumReports.routes.ts` is the only client of that service. Every route
is `requireAuth`, and every route naming a report id resolves it through
`findOwnedReport(req.user.id, reportId)` **before** anything is forwarded upstream.
A client-supplied user id is never read.

`PREMIUM_REPORT_API_URL` is a server-side variable. Putting it in a `VITE_*`
variable would bundle it into public JavaScript and defeat all of the above.

## Routes

Frontend pages (the app's existing `page`-string router, no new routing library):

| `page`                   | Screen                                             |
|--------------------------|----------------------------------------------------|
| `premium-report`         | Create: birth details → review → submit            |
| `premium-report-status`  | Live generation progress (`selectedId` = report id) |
| `premium-report-view`    | The report viewer                                  |
| `my-premium-reports`     | The signed-in user's own reports                   |

Backend API (all `requireAuth`, all `{success, data|error}`):

| Method | Path                                             | Notes |
|--------|--------------------------------------------------|-------|
| POST   | `/api/premium-reports/generate`                  | 202; `idempotencyKey` prevents duplicates |
| GET    | `/api/premium-reports/`                          | the caller's own reports only |
| GET    | `/api/premium-reports/blueprint`                 | section list (43 for `premium`) |
| GET    | `/api/premium-reports/:id/status`                | polled; refreshes the cached status |
| GET    | `/api/premium-reports/:id`                       | the report, sections in blueprint order |
| GET    | `/api/premium-reports/:id/sections/:sectionId`   | one section |
| POST   | `/api/premium-reports/:id/resume`                | continues a partial/failed report |

A report id that does not exist and one belonging to another user both return the
same `404 REPORT_NOT_FOUND`, so the endpoint cannot be used to discover which ids
exist. A ledger row whose report the service no longer has returns `410`, which is
a different and genuine condition.

## Timezone convention (important)

`timezoneOffsetMinutes` uses this project's single convention everywhere:
**`UTC = local - offset`, so India (UTC+5:30) is `+330`.** It is passed to Stage 6
unchanged; `kb_kundli` forwards it verbatim to `calculators.routes.ts`, whose
`toUtcDate()` subtracts it.

Several comments previously documented this as `-330`. They were wrong — following
them produced charts 11 hours out — and have been corrected in
`kb_report/api.py`, `kb_kundli/client.py` and `calculators.routes.ts`. No behaviour
changed; only the comments were incorrect.

## Duplicate prevention

Generating a 43-section report is slow and paid, so a duplicate submission is a
real cost, not just a tidiness problem. Three layers:

1. The client derives a stable `idempotencyKey` from the birth details (so editing
   the form legitimately starts a new report).
2. A `useRef` in-flight guard stops a double click issuing two requests.
3. `premium_reports (user_id, idempotency_key)` is UNIQUE. A key that already
   exists returns the existing report with `duplicate: true`; a racing insert that
   loses the unique index is resolved to the winner rather than erroring.

The status poller is strictly read-only — a failing poll can never submit a new
generation request.

## Markdown safety

Report prose is LLM-generated and treated as untrusted. `src/utils/reportMarkdown.ts`
parses it with `marked` and sanitizes the result with `DOMPurify` against a tag
allowlist before it reaches `dangerouslySetInnerHTML`. Raw HTML is never injected,
and `javascript:`/`data:` URLs, event handlers and `style` attributes are stripped.

## Incomplete reports

A report that is not `completed` is shown as what it is. The cover states how many
sections are written, a banner names the real status, and each unfinished section
renders its actual status in place rather than being omitted. Section order comes
from the response array and is never re-sorted or rewritten.

## Charts and visualizations

Every chart is drawn from `report.chart` — a minimal view of the Kundli Engine
chart that Stage 6 persisted **with the report** (`chart_context.json`), built
by `backend/app/services/premiumReportView.ts`. Because the deterministic
sections (Birth Details, Panchang, Planetary Positions, Vimshottari, Yogini) are
rendered from that same object, the charts always agree with the text. Nothing
is recalculated in the browser, nothing is parsed from prose, and the LLM never
draws or computes a chart.

| Visual | Where it appears | Source field (`chart_context` → `report.chart`) |
|---|---|---|
| Birth Kundli D1 (North Indian; South Indian toggle on screen) | Birth Chart page, after *Panchang* | `lagna.rashi`, `planets[].house/rashi/degree_in_sign/retrograde` |
| Navamsa D9 | Birth Chart page; beside *Marriage* | `divisional_charts.D9` |
| Planetary positions table | Birth Chart page | `planets[]` incl. `nakshatra`, `nakshatra_pada`, `nakshatra_lord` |
| Vimshottari Mahadasha timeline + current Antardashas | *Vimshottari Dasha* | `dasha.vimshottari.timeline[].antardashas[]` |
| Yogini timeline | *Yogini Dasha* | `dasha.yogini.timeline[]` |
| Shadbala strength bars | *Planetary Analysis* | `planet_strength[]` (rupas, required, engine's strong/weak) |
| Per-planet fact strip | *Sun … Ketu Analysis* | `planets[]` + `planet_strength[]` |
| Dosha status | *Doshas* | `doshas.kaal_sarp/sade_sati/pitra` (status only) |
| D2 / D6 / D7 / D10 / D20 / D24 | beside *Wealth / Health / Children / Career / Spiritual / Education* | `divisional_charts.*` |
| All other vargas (D2–D60) | Divisional Charts appendix, before *Disclaimer* | `divisional_charts.*` |

Rules enforced in `sections/PremiumReport/charts/chartModel.ts`:

- A planet is drawn in the house **the engine returned**; an invalid house or
  sign is dropped, never "fixed".
- A chart whose data is missing shows an explicit *unavailable* note. D9 and
  the other vargas are never derived from D1 or from text.
- The "current" Dasha period is worked out from the real dates against today
  (half-open: a boundary day belongs to the new period). The engine's own
  `active` flags are not sent — they were computed on the fetch date and go
  stale.
- The Birth Chart page and the appendix are not sections: the 43 sections keep
  their order and numbers 1–43.

Not drawn, because the engine does not return the data: Bhava Bala, Ashtakavarga,
the full Shadbala component breakdown, KP planet table and Avakhada (all present
in the free Kundli PDF, which calls `/api/calculators/kundli-full` directly, but
not persisted in Stage 6's `chart_context`). Combustion, house lords and
conjunctions are listed by the engine itself as `not_provided_by_engine`.

### What the browser receives

`GET /api/premium-reports/:id` is an allowlist (`toClientReport`), not a spread:
sections are reduced to `section_id, title, kind, status, content, key_points,
unavailable_factors, error`, plus `chart` and `subject`. Dropped: the raw
`chart_context` (including `source`, which holds the engine's deployment URL and
a local path), birth coordinates, LLM usage and cost, the quality gate,
validation, coverage and per-section generation/retrieval metadata.

## PDF export

**Download PDF** produces a branded A4 PDF in the browser using the **same
engine as the free Kundli PDF** — `utils/brandedPdf.ts`, extracted unchanged
from `KundliSection.tsx`, which now calls it too. The Premium layout
(`PremiumReportPrintLayout.tsx`) follows the Kundli PDF template: festive cover
banner, logo and gold "generated" badge; a contents page; numbered gold section
badges, each section on a fresh page; the Kundli charts in the template's chart
frames; the same closing "thank you" page; and the running header (logo,
tagline, title, Acharya portrait) and footer on every page. Shared look lives in
`KundliSection/printTheme.ts` and `printPrimitives.tsx`.

The PDF is made only from the report already loaded on screen. It sends no
request, so a failed or cancelled export cannot change the report, re-run an
LLM call or touch the chart — and can simply be retried. **Print** (browser
print with the `@media print` stylesheet) remains available as a fallback.

## Running it

```bash
# 1. Stage 6 (private — bind to localhost)
cd "D:\Tradeva Premium"
REPORT_FULL_BLUEPRINT_ENABLED=true python -m uvicorn kb_report.api:app --host 127.0.0.1 --port 8100

# 2. Backend
cd backend
# backend/.env:  PREMIUM_REPORT_API_URL=http://127.0.0.1:8100
npm run dev        # or: npm run server   (from the repo root)

# 3. Frontend
cd web/frontend
# web/frontend/.env:  VITE_API_URL=http://localhost:4000
npm run dev        # or: npm run dev      (from the repo root)
```

`REPORT_FULL_BLUEPRINT_ENABLED=true` is what makes the 43-section `premium`
profile available; without it only the 5-section vertical slice runs.

## Tests

```bash
# Mocked: real auth/ownership/DB, Stage 6 stubbed by a local server speaking
# its actual wire format. Safe to run any time; needs DATABASE_URL.
cd backend && npm run test:premium-reports

# Real stack: nothing mocked but the LLM provider. Needs all services up and
# LLM_PROVIDER=mock on Stage 6 — without it, every run starts a real, paid,
# multi-minute 43-section generation.
cd backend && npm run test:premium-reports:e2e

# Markdown rendering + sanitization (jsdom, no network)
cd web/frontend && npm run test:markdown

# Chart data model: placements checked against the reference Kundli PDF,
# D9 availability, Dasha current-period logic, malformed-data fallbacks, and
# the 43-section reading order. Fixtures are real engine output passed
# through the backend allowlist.
cd web/frontend && npm run test:charts
```
