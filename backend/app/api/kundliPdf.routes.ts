import { Router } from 'express';
import { chromium, type Browser, type Page } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { rateLimit } from '../middleware/rateLimit.ts';

export const kundliPdfRouter = Router();

// The campaign microsite's own print-only route (ganesh-chaturthi/src/
// PrintKundliPage.tsx) — a real, already-running app instance, not a
// second copy of the report's markup/styles maintained here. Navigating a
// headless browser there and calling page.pdf() gets native vector
// text/charts via Chromium's own print engine, replacing the multi-minute
// client-side html2canvas-per-block raster capture KundliSection normally
// does (that path is untouched for the main site).
const CAMPAIGN_APP_URL = (process.env.CAMPAIGN_APP_URL || 'http://localhost:1409').replace(/\/+$/, '');

// A fresh browser process per request, closed in the route's `finally` —
// NOT reused across requests. On a 512MB host (Render's free tier), a
// long-lived shared Chromium process sits resident the entire time the
// server is up, permanently eating the memory every other request also
// needs, which was tipping the whole instance into an OOM kill (not just
// this endpoint failing). Launching fresh and closing immediately after
// means Chromium's memory cost is only ever paid during an actual PDF
// request, not as a constant background tax.
function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    // Small/free-tier hosts (Render's free plan included) give containers
    // a tiny /dev/shm — Chromium's default shared-memory usage overflows
    // that and crashes the whole browser process (not just the page),
    // which is what was actually behind the 502s, not merely a missing
    // browser binary. --disable-dev-shm-usage makes it fall back to disk
    // instead of /dev/shm; --no-sandbox is required in most containers
    // that don't grant the extra privileges Chromium's sandbox wants.
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
}

// Launching a real browser per request is real server resource cost —
// tighter than the general calculator limiter (30/min).
const limiter = rateLimit({ windowMs: 60_000, max: 6 });

// Serializes every PDF request onto one queue so at most one Chromium
// instance is ever alive at once. On a 512MB host, two people generating a
// PDF at the same moment is enough on its own to OOM-kill the whole
// instance even with everything else above in place — this trades a bit of
// wait time under concurrent load for not going down entirely.
let pdfQueue: Promise<unknown> = Promise.resolve();
function withPdfLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = pdfQueue.then(fn, fn);
  pdfQueue = run.then(() => undefined, () => undefined);
  return run;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

// Playwright's header/footer templates render in their own isolated pass —
// an <img src="https://..."> there is a real network fetch that print
// pagination doesn't reliably wait on (came out as a broken-image icon in
// testing, not a missing/wrong URL). Inlining the bytes as a data: URI
// removes that race entirely, and also drops the assumption that the
// backend and the campaign app share a filesystem — they're deployed
// separately, so fetching over HTTP (once, then cached) is the only path
// that works in both dev and prod. These two images never change at
// runtime, so caching forever for the life of this process is fine.
const imageDataUriCache = new Map<string, Promise<string>>();
function getImageDataUri(path: string): Promise<string> {
  let cached = imageDataUriCache.get(path);
  if (!cached) {
    cached = fetch(`${CAMPAIGN_APP_URL}${path}`)
      .then(res => res.arrayBuffer())
      .then(buf => `data:image/png;base64,${Buffer.from(buf).toString('base64')}`);
    imageDataUriCache.set(path, cached);
  }
  return cached;
}

// Height of the running header's reserved band — everything below (the
// logo/Acharya sizing, PAGE_MARGIN.top) is derived from this one number so
// they can't drift out of sync with each other.
const HEADER_HEIGHT_PX = 96;

// Playwright renders the header/footer template inside a box sized to the
// page's own margin — NOT the report's own cream page background, so
// without an explicit background here that whole reserved band (most
// visible on the cover, which has no other header content to hide it
// behind) shows through as a plain white strip. Every template below fills
// its box with this to match KundliPrintLayout's own page background.
const PAGE_BG = '#FAF7F0';

// Real link, not plain text — the store name in both footer variants opens
// tredevastore.com. Gold, not the same muted color as the surrounding
// text, so it actually reads as a link rather than blending in.
function buildStoreLink(language: 'en' | 'hi'): string {
  return `<a href="https://tredevastore.com/" style="color: #B58A3B; font-weight: bold; text-decoration: underline;">${language === 'hi' ? 'स्टोर' : 'Store'}</a>`;
}

// Playwright's header/footer templates are the ONLY way to get real,
// automatically-updating page numbers (the .pageNumber/.totalPages classes)
// out of native page.pdf() — they render in their own isolated frame with
// no access to the printed page's own stylesheet, so every style needed
// (including a base font) has to be inlined here, and images need an
// absolute URL rather than a page-relative path. This replicates the
// running header/footer the OLD client-side jsPDF pipeline drew by hand
// (logo + brand + name on every page, Acharya photo on the right, a footer
// with the cross-promo line + page number). The Acharya photo is set to
// the FULL header height with the row bottom-aligned and no padding under
// it specifically, so its bottom edge lands exactly on the gold rule —
// logo/text sit slightly clear of the rule instead, via their own
// padding-bottom, which is the "gap" the rest of the header content needs
// that the photo deliberately doesn't get.
function buildHeaderTemplate(name: string, logoDataUri: string, acharyaDataUri: string, language: 'en' | 'hi'): string {
  const safeName = escapeHtml(name);
  const titleSuffix = language === 'hi' ? 'की कुंडली' : "'s Kundli";
  const tagline = language === 'hi' ? 'आपका आकाश। आपकी कहानी।' : 'Your Sky. Your Story.';
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; width: 100%; box-sizing: border-box; height: ${HEADER_HEIGHT_PX}px; padding: 0 28px; display: flex; align-items: flex-end; justify-content: space-between; background: ${PAGE_BG}; border-bottom: 2px solid #B58A3B; -webkit-print-color-adjust: exact;">
      <div style="display: flex; align-items: center; gap: 14px; padding-bottom: 12px;">
        <img src="${logoDataUri}" style="width: 54px; height: 54px; object-fit: contain;" />
        <div>
          <div style="font-size: 20px; font-weight: bold; color: #5A4628;">TredevAstro</div>
          <div style="font-size: 13px; color: #968C78;">${tagline}</div>
        </div>
      </div>
      <div style="font-size: 24px; font-weight: bold; color: #786949; padding-bottom: 10px;">${language === 'hi' ? `${safeName} ${titleSuffix}` : `${safeName}${titleSuffix}`}</div>
      <img src="${acharyaDataUri}" style="height: ${HEADER_HEIGHT_PX}px; object-fit: contain;" />
    </div>
  `;
}

// The cover pass still reserves the same header band (see the pageRanges
// split comment below — both passes must paginate identically), but shows
// only the brand mark, no Acharya photo or report title — the cover's own
// content already carries the title. Same PAGE_BG fix as the content
// header: without it this band showed as a plain white strip above the
// banner, since Playwright's header frame isn't part of the page's own
// cream background.
function buildCoverHeaderTemplate(logoDataUri: string, language: 'en' | 'hi'): string {
  const tagline = language === 'hi' ? 'आपका आकाश। आपकी कहानी।' : 'Your Sky. Your Story.';
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; width: 100%; box-sizing: border-box; height: ${HEADER_HEIGHT_PX}px; padding: 0 28px; display: flex; align-items: center; background: ${PAGE_BG}; -webkit-print-color-adjust: exact;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${logoDataUri}" style="width: 54px; height: 54px; object-fit: contain;" />
        <div>
          <div style="font-size: 20px; font-weight: bold; color: #5A4628;">TredevAstro</div>
          <div style="font-size: 13px; color: #968C78;">${tagline}</div>
        </div>
      </div>
    </div>
  `;
}

// Same reasoning as HEADER_HEIGHT_PX — must equal PAGE_MARGIN.bottom
// exactly. Unlike the header templates, these footer ones were missing an
// explicit height entirely: Chromium sizes an unconstrained template div
// to its own natural content height, which is shorter than the reserved
// margin band, leaving the leftover space unpainted (plain white,
// regardless of the div's own background) — that's the white strip seen
// right above the footer text on every content page.
const FOOTER_HEIGHT_PX = 42;

function buildContentFooterTemplate(language: 'en' | 'hi'): string {
  const visitLine = language === 'hi' ? `हमारी अन्य साइटें देखें: ${buildStoreLink(language)} &middot; Learn` : `Visit our other sites: ${buildStoreLink(language)} &middot; Learn`;
  const pageLabel = language === 'hi' ? 'पृष्ठ' : 'Page';
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; width: 100%; box-sizing: border-box; height: ${FOOTER_HEIGHT_PX}px; padding: 8px 28px 0; display: flex; align-items: flex-start; justify-content: space-between; background: ${PAGE_BG}; border-top: 1px solid #B58A3B; font-size: 8.5px; color: #8C8062; -webkit-print-color-adjust: exact;">
      <span>${visitLine}</span>
      <span>${pageLabel} <span class="pageNumber"></span></span>
    </div>
  `;
}

// The cover page's own footer is a single centered line (not the left/right
// split every other page uses) — matches the reference report exactly. It's
// always literally "Page 1" (this pass only ever prints page 1), so no
// .pageNumber span is needed here.
function buildCoverFooterTemplate(language: 'en' | 'hi'): string {
  const visitLine = language === 'hi'
    ? `हमारी अन्य साइटें देखें: ${buildStoreLink(language)} &middot; Learn &middot; पृष्ठ 1`
    : `Visit our other sites: ${buildStoreLink(language)} &middot; Learn &middot; Page 1`;
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; width: 100%; box-sizing: border-box; height: ${FOOTER_HEIGHT_PX}px; padding: 8px 28px 0; text-align: center; background: ${PAGE_BG}; border-top: 1px solid #B58A3B; font-size: 8.5px; color: #8C8062; -webkit-print-color-adjust: exact;">
      ${visitLine}
    </div>
  `;
}

// Same margin for both passes below is deliberate, not an oversight — see
// that comment further down. Top is HEADER_HEIGHT_PX plus a clear gap, not
// the exact header height — content starting AT the gold rule (no gap)
// visually overlapped the rule itself (first section heading's own glyph
// ascent crept above it). Bottom matches FOOTER_HEIGHT_PX exactly, same
// reasoning as the header/top pairing.
const PAGE_MARGIN = { top: `${HEADER_HEIGHT_PX + 32}px`, bottom: `${FOOTER_HEIGHT_PX}px`, left: '0', right: '0' };

kundliPdfRouter.post('/', limiter, async (req, res) => {
  const { name, displayName, dob, tob, place, latitude, longitude, timezoneOffsetMinutes, language: rawLanguage } = req.body || {};
  if (!name || !dob || !tob || !place || typeof latitude !== 'number' || typeof longitude !== 'number' || typeof timezoneOffsetMinutes !== 'number') {
    res.status(400).json({ error: 'Missing or invalid birth details' });
    return;
  }
  const language: 'en' | 'hi' = rawLanguage === 'hi' ? 'hi' : 'en';
  // What actually gets shown ON the report (cover title, running header) —
  // the frontend sends a Devanagari-transliterated version here when Hindi
  // is selected. `name` itself stays untouched below for the download
  // filename, which is sanitized with a Latin-only regex.
  const nameForDisplay = typeof displayName === 'string' && displayName.trim() ? displayName : String(name);

  const qs = new URLSearchParams({
    name: nameForDisplay, dob: String(dob), tob: String(tob), place: String(place),
    lat: String(latitude), lng: String(longitude), tz: String(timezoneOffsetMinutes),
    lang: language,
  });
  const targetUrl = `${CAMPAIGN_APP_URL}/print-kundli?${qs.toString()}`;

  let browser: Browser | undefined;
  let page: Page | undefined;
  await withPdfLock(async () => {
  try {
    const [launchedBrowser, logoDataUri, acharyaDataUri] = await Promise.all([
      launchBrowser(),
      getImageDataUri('/logo.png'),
      getImageDataUri('/images/acharya.png'),
    ]);
    browser = launchedBrowser;
    page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    // PrintKundliPage flips document.title once its own kundli-full fetch
    // resolves (or fails) — this is the actual "content is ready" signal,
    // not a fixed delay guess.
    // A string expression (not a closure) — this backend's tsconfig has no
    // DOM lib, so a closure referencing `document` won't typecheck even
    // though it only ever runs inside the page, never in this Node process.
    await page.waitForFunction('document.title === "PDF_READY" || document.title === "PDF_ERROR"', { timeout: 25_000 });
    if (await page.title() === 'PDF_ERROR') {
      throw new Error('Kundli computation failed on the print page');
    }
    // Fonts/chart-SVG paint can lag one frame behind the React commit that
    // flips the title — a short settle window avoids capturing mid-paint.
    await page.waitForTimeout(500);

    // The reference report (Extra/*-janam-kundli.pdf, the original
    // client-side jsPDF output) treats the cover page differently from
    // every other page: no running header, no watermark, and a single
    // centered footer line instead of the usual left/right split — but
    // Playwright's page.pdf() applies ONE header/footer template to the
    // WHOLE document, with no per-page conditional. Two page.pdf() calls
    // against the same already-rendered page, sliced with `pageRanges` and
    // merged after, is what gets a real per-page difference: pageRanges
    // only filters which already-paginated pages make it into that call's
    // output (like a browser print dialog's "pages 2-10"), so .pageNumber
    // in the second pass still reads the document's REAL absolute page
    // number (2, 3, 4...), not a range-relative 1, 2, 3 — as long as both
    // passes paginate identically, which is exactly why PAGE_MARGIN (and
    // the watermark toggle below) must be the ONLY things that differ
    // between them, never the margin/page geometry itself.
    // String expressions (not closures) — see the DOM-lib note earlier in
    // this file for why.
    await page.evaluate('(() => { const w = document.getElementById("pdf-watermark"); if (w) w.style.display = "none"; })()');
    const coverPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildCoverHeaderTemplate(logoDataUri, language),
      footerTemplate: buildCoverFooterTemplate(language),
      margin: PAGE_MARGIN,
      pageRanges: '1',
    });

    await page.evaluate('(() => { const w = document.getElementById("pdf-watermark"); if (w) w.style.display = "block"; })()');
    const restPdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: buildHeaderTemplate(nameForDisplay, logoDataUri, acharyaDataUri, language),
      footerTemplate: buildContentFooterTemplate(language),
      margin: PAGE_MARGIN,
      pageRanges: '2-',
    });

    // Chromium's own footprint (the dominant cost on a 512MB host) is only
    // needed up to this point — both PDF buffers are already captured, so
    // close it now instead of holding it open through the pdf-lib merge
    // below, rather than leaving that to the `finally` at the very end.
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
    page = undefined;
    browser = undefined;

    const merged = await PDFDocument.create();
    const [coverDoc, restDoc] = await Promise.all([PDFDocument.load(coverPdf), PDFDocument.load(restPdf)]);
    const [coverPage] = await merged.copyPages(coverDoc, [0]);
    merged.addPage(coverPage);
    const restPages = await merged.copyPages(restDoc, restDoc.getPageIndices());
    restPages.forEach(p => merged.addPage(p));
    const mergedBytes = await merged.save();

    const safeName = String(name).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'kundli';
    const langTag = language === 'hi' ? 'HIN' : 'ENG';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_${langTag}_Kundli.pdf"`);
    res.send(Buffer.from(mergedBytes));
  } catch (err) {
    console.error('Kundli PDF generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed — please try again.' });
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
  });
});
