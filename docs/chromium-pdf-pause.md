# Chromium Kundli PDF — paused 2026-09-18

## Why
The server-side PDF route launches a real headless Chromium process per
request (Playwright). On the current host this was heavy enough to make the
rest of the site sluggish, so it's paused until we move it off the main box
or move to a hosted-browser service. **No code was deleted** — everything
below is still in the repo, just switched off / not called.

Update (same day, round 2): initially the route was just gated behind a
runtime flag (returning a 503) and the Download PDF button still showed and
worked via the client-side fallback. Then it was paused harder: the Download
PDF button was removed from the UI, and the backend stopped importing/
registering the Chromium route.

Update (same day, round 3): per an explicit "get Chromium off the backend
to free up space" request, `playwright` and `pdf-lib` are now fully
**uninstalled** from `backend/package.json` (not just unimported) — this is
what actually stops `npm install` from downloading the Chromium browser
binary (150–300MB+) on every install/deploy, which is the real disk-space
cost, not just the RAM cost of launching it. `kundliPdf.routes.ts` itself is
still in the repo untouched, just excluded from the backend's `tsconfig.json`
(see #6) since it can no longer typecheck without those packages installed.

## What changed (6 edits, all easily reversible)

1. `backend/app/api/kundliPdf.routes.ts`
   - Added `const PDF_GENERATION_PAUSED = true;` right after the router is
     created, and an early `return res.status(503)...` at the top of the
     `POST '/'` handler when it's true. (Now moot since the route isn't
     registered at all — see #2 — but left in place as a second guard in
     case the route is re-registered without also flipping this back.)
   - **To re-enable:** set that constant back to `false`. Nothing else in
     the file changed.

2. `backend/app/main.ts`
   - Commented out `import { kundliPdfRouter } from './api/kundliPdf.
     routes.ts';` and `app.use('/api/kundli-pdf', kundliPdfRouter);`.
   - Effect: `POST /api/kundli-pdf` now 404s (route doesn't exist), and the
     `playwright` package is never imported into the backend process at
     all — this is the actual "reduce backend load" change; a 503 from a
     registered-but-gated route still pays the cost of the module import.
   - **To re-enable:** uncomment both lines.

3. `frontend/src/sections/KundliSection/KundliSection.tsx`
   - Removed the "Download PDF" `<button>` (id `kundli-download-pdf-btn`)
     from the chart-header button row entirely. The PDF language toggle
     (English/हिन्दी) and "Edit Details" button are untouched — the
     language toggle also drives the on-screen chart's language, not just
     the PDF, so it stays.
   - `handleDownloadPdfClick`, `downloadPdfClientSide`,
     `downloadPdfFromServer`, the `pdfState`-driven countdown/status UI, and
     the hidden `KundliPrintLayout` capture block are all still in the file,
     untouched — they just have no button wired to trigger them anymore.
   - **To re-enable:** restore the button (see git history for this file
     around 2026-09-18, or re-add a `<button onClick={handleDownloadPdfClick}
     disabled={pdfState === 'generating'} id="kundli-download-pdf-btn">`
     with the same label logic that was there before).

4. `frontend/src/pages/PageRenderer.tsx` (main site's Free Kundli page)
   - Removed the `serverPdfUrl={\`${API_URL}/api/kundli-pdf\`}` prop from
     `<KundliSection />` (and the now-unused `API_URL` import).
   - Effect: `KundliSection` falls back to its own pre-existing client-side
     PDF generation (html2canvas + jsPDF, `downloadPdfClientSide` /
     `downloadPdfFromServer` branch in `KundliSection.tsx`) — slower
     (multi-minute capture with a countdown UI) but costs the server nothing.
   - **To re-enable:** add the prop back:
     `<KundliSection serverPdfUrl={\`${API_URL}/api/kundli-pdf\`} />`
     (re-add the `API_URL` import from `'../services/apiUrl'`).

5. `ganesh-chaturthi/src/data/tools.tsx` (campaign microsite's Free Kundli tool)
   - Same removal: the `free-kundli` tool's `<KundliSection ... />` no
     longer gets `serverPdfUrl`, so it also falls back to the client-side
     path. The campaign specifically chose the server path originally
     because it needs to convert visitors fast (seconds vs. minutes) — this
     is the main UX cost of the pause.
   - **To re-enable:** add back
     `serverPdfUrl={\`${API_URL}/api/kundli-pdf\`}` to that tool's
     `<KundliSection>` call, and re-add
     `import { API_URL } from '../../../frontend/src/services/apiUrl';`.

6. `backend/package.json` and `backend/tsconfig.json`
   - Ran `npm uninstall playwright pdf-lib` in `backend/` — both packages
     and their transitive deps are gone from `node_modules` and
     `package.json`. Also removed the `"postinstall": "playwright install
     chromium"` script, which was the actual line downloading the Chromium
     browser binary on every `npm install`.
   - Added `"exclude": ["app/api/kundliPdf.routes.ts"]` to
     `backend/tsconfig.json` so that one orphaned file (which still imports
     `playwright`/`pdf-lib`) doesn't fail typecheck — it's excluded from
     compilation, not deleted.
   - **To re-enable:** `cd backend && npm install playwright pdf-lib`,
     re-add `"postinstall": "playwright install chromium"` to
     `package.json`, and remove the `exclude` line from `tsconfig.json`.

## What's untouched (still fully working, just unreachable right now)
- `backend/app/api/kundliPdf.routes.ts` — the whole Chromium/Playwright
  pipeline: launches a browser, navigates to the campaign's headless
  `/print-kundli` route, waits for `PDF_READY`/`PDF_ERROR`, takes two
  `page.pdf()` passes (cover vs. rest, for the per-page header/footer
  difference), merges them with `pdf-lib`. All of this is dead code only
  because of the `PDF_GENERATION_PAUSED` flag above it, and it won't
  typecheck or run again until `playwright`/`pdf-lib` are reinstalled (#6).
- `ganesh-chaturthi/src/PrintKundliPage.tsx` — the headless print-only route
  the backend navigates Chromium to. Still there, still works if hit
  directly; just nothing calls it anymore while paused.
- The "unknown time of birth" disclaimer support added the same day
  (`timeUnknown` query param → `KundliPrintLayout`'s "Not provided" +
  warning line) is already wired through this whole pipeline and will work
  immediately once it's re-enabled — nothing extra needed there.

## The real fix, for later (already half-built)
`kundliPdf.routes.ts` already supports pointing at a **hosted** Chromium
instance instead of launching one locally:

```
BROWSERLESS_WS_ENDPOINT=wss://chrome.browserless.io?token=...
```

When that env var is set, `launchBrowser()` connects to that remote browser
instead of spawning a local process — this is the actual long-term fix for a
small host (a local Chromium process is 150–300MB+ resident RAM, which is
what was competing with everything else). Setting that up and confirming it
under load is the recommended next step before flipping
`PDF_GENERATION_PAUSED` back to `false` for a local launch.

## Checklist to re-enable
- [ ] Either provision `BROWSERLESS_WS_ENDPOINT` (recommended) or confirm the
      host now has enough spare RAM and disk for a local Chromium launch.
- [ ] `cd backend && npm install playwright pdf-lib`.
- [ ] Re-add `"postinstall": "playwright install chromium"` to
      `backend/package.json`.
- [ ] Remove `"exclude": ["app/api/kundliPdf.routes.ts"]` from
      `backend/tsconfig.json`.
- [ ] Uncomment the `kundliPdfRouter` import + `app.use('/api/kundli-pdf', ...)`
      line in `backend/app/main.ts`.
- [ ] Flip `PDF_GENERATION_PAUSED` to `false` in `kundliPdf.routes.ts`.
- [ ] Re-add the Download PDF `<button>` in `KundliSection.tsx`'s chart
      header (the click handler and all supporting state are still there).
- [ ] Re-add `serverPdfUrl` in `frontend/src/pages/PageRenderer.tsx`.
- [ ] Re-add `serverPdfUrl` in `ganesh-chaturthi/src/data/tools.tsx`.
- [ ] Smoke-test a PDF download on both the main site and the campaign
      microsite (EN + HI, with and without "I don't know my exact time of
      birth" checked).
