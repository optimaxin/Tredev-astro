// REAL-BROWSER check of the Premium Report charts, reading order, mobile
// layout, access control and PDF export — plus a regression run of the free
// Kundli PDF, which shares the same PDF engine (utils/brandedPdf.ts).
//
// Nothing is mocked: it drives both frontends against the live backend
// (auth, ownership, allowlist) and Stage 6. Prerequisites:
//   • Stage 6 serving a 43-section report whose chart matches
//     src/sections/PremiumReport/charts/__fixtures__/fullReport.* (Stage 6
//     run 36fc75dd2927439e — serve a COPY via REPORT_STORE_DIR, and run
//     Stage 6 with LLM_PROVIDER=mock so nothing paid can start);
//   • backend on :4000, main frontend on :5173, standalone app on :5180;
//   • OWNER = an account that owns REPORT_ID (premium_reports ledger),
//     INTRUDER = any other account; both with password "password123".
// Run from the repo root (so `playwright` resolves):
//   OWNER=... INTRUDER=... [REPORT_ID=...] [OUT_DIR=...] node web/frontend/e2e/premiumReportCharts.e2e.mjs
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAIN = 'http://localhost:5173', STANDALONE = 'http://localhost:5180', API = 'http://127.0.0.1:4000';
const OUT = process.env.OUT_DIR || join(tmpdir(), 'premium-report-e2e');
mkdirSync(OUT, { recursive: true });
const RID = process.env.REPORT_ID || '36fc75dd2927439e';
const OWNER = process.env.OWNER, INTRUDER = process.env.INTRUDER;
const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'sections', 'PremiumReport', 'charts', '__fixtures__');
const sections = JSON.parse(readFileSync(`${FIX}/fullReport.sections.json`, 'utf-8'));
const chart = JSON.parse(readFileSync(`${FIX}/fullReport.chartView.json`, 'utf-8'));

let failures = 0;
const results = [];
const expect = (c, l) => { results.push([!!c, l]); if (c) console.log(`  ✓ ${l}`); else { failures++; console.error(`  ✗ ${l}`); } };

async function session(email) {
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password123' }) }).then(x => x.json());
  if (!r.success) throw new Error(`login failed ${email}`);
  return [r.data.accessToken, r.data.refreshToken];
}

const browser = await chromium.launch();
const errors = [];
async function open(url, { width = 1440, height = 900, state, email = OWNER, theme, sessionStash } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`console ${m.text()}`); });
  const tokens = email ? await session(email) : [null, null];
  await page.addInitScript(([a, r, st, th, stash]) => {
    if (a) { localStorage.setItem('auth_access_token', a); localStorage.setItem('auth_refresh_token', r); }
    if (th) localStorage.setItem('theme', th);
    if (stash) sessionStorage.setItem('kundliPdfResume', stash);
    if (st) history.replaceState(st, '', '');
  }, [tokens[0], tokens[1], state ?? null, theme ?? null, sessionStash ?? null]);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { ctx, page };
}

// Point-in-polygon over the chart's OWN house polygons (rendered in house
// order 1..12 by NorthIndianChart) — checks where each label was actually drawn.
async function drawnHouses(page, sel) {
  return page.evaluate(sel => {
    const fig = document.querySelector(sel);
    const svg = fig.querySelector('svg');
    const polys = Array.from(svg.querySelectorAll('polygon')).filter(p => p.getAttribute('fill') === 'transparent')
      .map(p => p.getAttribute('points').split(' ').map(pt => pt.split(',').map(Number)));
    const inside = ([x, y], pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const out = {};
    for (const t of svg.querySelectorAll('text')) {
      const label = t.textContent.trim();
      if (!/^[A-Z][a-z]$/.test(label)) continue; // planet abbreviations only (As, Su, Mo, ...)
      const pt = [Number(t.getAttribute('x')), Number(t.getAttribute('y'))];
      const h = polys.findIndex(p => inside(pt, p)) + 1;
      (out[h] ||= []).push(label);
    }
    return { houses: out, polygonCount: polys.length };
  }, sel);
}
const ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Uranus: 'Ur', Neptune: 'Ne', Pluto: 'Pl' };
const expectedHouses = list => { const o = {}; for (const p of list) (o[p.house] ||= []).push(ABBR[p.planet]); (o[1] ||= []).push('As'); for (const k in o) o[k].sort(); return o; };
const norm = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]).sort((a, b) => a[0] - b[0]));

const VIEW = { page: 'premium-report-view', selectedId: RID, concern: null };

// ── [A] Main site viewer, desktop ──────────────────────────────────────────
{
  console.log('\n[A] main site viewer — desktop, real 43-section report');
  const { ctx, page } = await open(MAIN, { state: VIEW });
  await page.locator('[data-testid="birth-chart-plate"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1200);

  const articleIds = await page.locator('article[id^="section-"]').evaluateAll(a => a.map(x => x.id.replace('section-', '')));
  expect(articleIds.length === 43, `43 sections rendered (got ${articleIds.length})`);
  expect(JSON.stringify(articleIds) === JSON.stringify(sections.map(s => s.section_id)), '43 sections in the exact backend order');

  const toc = await page.locator('nav[aria-label="Report sections"] li').allInnerTexts();
  expect(toc.length === 45, `TOC has 43 sections + 2 chart pages (got ${toc.length})`);
  const tocIdx = t => toc.findIndex(x => x.includes(t));
  expect(tocIdx('Birth Chart') === tocIdx('Panchang at Birth') + 1, 'Birth Chart page listed right after Panchang');
  expect(tocIdx('Divisional Charts') === tocIdx('Disclaimer') - 1, 'Divisional Charts listed right before Disclaimer');
  expect(toc[tocIdx('Disclaimer')].startsWith('43'), 'Disclaimer keeps number 43');

  const order = await page.locator('main [data-entry-key]').evaluateAll(a => a.map(x => x.getAttribute('data-entry-key')));
  expect(order[order.indexOf('panchang') + 1] === 'birth-chart', 'plate rendered right after Panchang section');

  // D1 — where each label was actually DRAWN vs the engine's houses
  const d1 = await drawnHouses(page, '[data-testid="chart-d1"]');
  expect(d1.polygonCount === 12, '12 house polygons drawn');
  expect(JSON.stringify(norm(d1.houses)) === JSON.stringify(norm(expectedHouses(chart.planets))), `D1 labels drawn in the engine's houses ${JSON.stringify(norm(d1.houses))}`);
  const lagnaNum = await page.locator('[data-testid="chart-d1"] svg text').evaluateAll(ts => ts.map(t => t.textContent.trim()));
  expect(lagnaNum.includes('12'), 'rashi numbers drawn (Pisces Lagna = 12 at house 1)');

  const d9 = await drawnHouses(page, '[data-testid="chart-d9"]');
  const d9v = chart.divisional_charts.D9.placements;
  expect(JSON.stringify(norm(d9.houses)) === JSON.stringify(norm(expectedHouses(d9v))), 'D9 labels drawn in the engine\'s Navamsa houses');

  const rows = await page.locator('[data-testid="positions-table"] tbody tr').count();
  expect(rows === 13, `positions table: Ascendant + 12 planets (got ${rows})`);
  const satRow = await page.locator('[data-testid="positions-table"] tr[data-planet="Saturn"]').innerText();
  const sat = chart.planets.find(p => p.planet === 'Saturn');
  expect(satRow.includes(sat.rashi) && satRow.includes(sat.nakshatra), `Saturn row shows engine sign/nakshatra (${satRow.replace(/\s+/g, ' ')})`);

  // Dasha — current as of today (2026-10-11): Sun MD, Mercury AD
  const curMd = await page.locator('[data-testid="dasha-vimshottari"] tr[data-phase="current"]').first().innerText();
  expect(curMd.startsWith('Sun'), `current Mahadasha highlighted: ${curMd.split('\t')[0]}`);
  const curAd = await page.locator('[data-testid="dasha-antardasha"] tr[data-phase="current"]').innerText();
  expect(curAd.includes('Mercury'), `current Antardasha highlighted: ${curAd.split('\t')[0]}`);
  // First table = Mahadashas (the Antardasha table follows it inside the same figure).
  const phases = await page.locator('[data-testid="dasha-vimshottari"] table').first().locator('tbody tr').evaluateAll(r => r.map(x => x.dataset.phase));
  expect(phases.filter(p => p === 'current').length === 1 && phases[0] === 'past' && phases.at(-1) === 'future', `past/current/future distinguished (${phases.join(',')})`);

  for (const [sid, sel] of [['career', 'chart-d10'], ['marriage', 'chart-d9'], ['children_family', 'chart-d7'], ['planet_saturn', 'facts-saturn'], ['planetary_analysis', 'shadbala'], ['doshas', 'doshas'], ['yogini_dasha', 'dasha-yogini']]) {
    const n = await page.locator(`#section-${sid} [data-testid="${sel}"]`).count();
    expect(n === 1, `${sid}: real-data visual "${sel}" placed beside its reading`);
  }
  const careerText = await page.locator('#section-career').innerText();
  expect(careerText.length > 800, 'career interpretation text still present alongside the chart');
  const lagnaVis = await page.locator('#section-lagna [data-section-visual]').count();
  expect(lagnaVis === 0, 'pure-prose sections get no chart');

  const appendixCharts = await page.locator('[data-testid="varga-appendix"] figure').count();
  expect(appendixCharts === 18, `appendix shows the 18 other vargas (got ${appendixCharts})`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 1, `no horizontal overflow (${overflow}px)`);

  await page.locator('header').first().screenshot({ path: `${OUT}/charts-01-cover.png` }).catch(() => {});
  await page.screenshot({ path: `${OUT}/charts-01-cover-full.png` });
  await page.locator('[data-testid="birth-chart-plate"]').screenshot({ path: `${OUT}/charts-02-birth-chart.png` });
  await page.locator('#section-vimshottari_dasha').screenshot({ path: `${OUT}/charts-03-dasha.png` });
  await page.locator('#section-planetary_analysis [data-testid="shadbala"]').screenshot({ path: `${OUT}/charts-04-shadbala.png` });
  await page.locator('#section-career').screenshot({ path: `${OUT}/charts-05-career.png` });
  await page.locator('[data-testid="varga-appendix"]').screenshot({ path: `${OUT}/charts-06-appendix.png` });

  // South Indian toggle
  await page.locator('[data-testid="chart-d1"] button', { hasText: 'South Indian' }).click();
  await page.waitForTimeout(300);
  const south = await page.locator('[data-testid="chart-d1"] svg text').evaluateAll(ts => ts.map(t => t.textContent ?? ''));
  expect(south.some(t => t.includes('South Indian')), 'South Indian layout available on screen');
  await page.locator('[data-testid="chart-d1"]').screenshot({ path: `${OUT}/charts-07-south.png` });

  // ── [C] PDF from the same page ──
  console.log('\n[C] Download PDF (shared branded engine)');
  const t0 = Date.now();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 420000 }),
    page.locator('[data-testid="download-pdf"]').first().click(),
  ]);
  const pdfPath = `${OUT}/premium-report.pdf`;
  await download.saveAs(pdfPath);
  expect(download.suggestedFilename().endsWith('_Premium_Report.pdf'), `PDF saved: ${download.suggestedFilename()} in ${Math.round((Date.now() - t0) / 1000)}s`);
  const pdfErr = await page.locator('[role="alert"]').allInnerTexts();
  expect(!pdfErr.some(t => t.includes('Couldn’t create the PDF')), 'no PDF error shown');
  await ctx.close();
}

// ── [B] Mobile ─────────────────────────────────────────────────────────────
{
  console.log('\n[B] main site viewer — mobile 390x844');
  const { ctx, page } = await open(MAIN, { width: 390, height: 844, state: VIEW });
  await page.locator('[data-testid="birth-chart-plate"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  const pan = await page.evaluate(() => { window.scrollTo(300, 2000); const x = window.scrollX; window.scrollTo(0, 0); return x; });
  expect(pan === 0, `page cannot be panned sideways on mobile (scrollX=${pan})`);
  const cut = await page.evaluate(() => {
    const W = document.documentElement.clientWidth, res = [];
    for (const el of document.querySelectorAll('main *')) {
      const rc = el.getBoundingClientRect(); if (rc.right <= W + 1 || rc.width === 0) continue;
      let a = el.parentElement, own = false;
      while (a && a !== document.body) { const st = getComputedStyle(a); if (st.overflowX !== 'visible' || st.position === 'fixed') { own = true; break; } a = a.parentElement; }
      if (!own && !(el.tagName === 'NAV' && getComputedStyle(el).visibility === 'hidden')) res.push(el.className);
    }
    return res;
  });
  expect(cut.length === 0, `no report content cut off at the right edge (${cut.length})`);
  const tocVis = await page.locator('nav[aria-label="Report sections"]').evaluate(n => getComputedStyle(n).visibility);
  expect(tocVis === 'hidden', `closed Contents drawer is out of the tab order (visibility: ${tocVis})`);
  await page.locator('button', { hasText: /^Contents$/ }).click();
  await page.waitForTimeout(500);
  const tocOpenVis = await page.locator('nav[aria-label="Report sections"]').evaluate(n => getComputedStyle(n).visibility);
  expect(tocOpenVis === 'visible', 'opened drawer is visible and usable');
  await page.locator('[aria-label="Close contents"]').click();
  await page.waitForTimeout(400);
  const box = await page.locator('[data-testid="chart-d1"] svg').boundingBox();
  expect(box && box.width > 250 && box.x >= 0 && box.x + box.width <= 390, `D1 chart fits the phone width (${Math.round(box?.width)}px)`);
  const sb = await page.locator('[data-testid="shadbala"]').evaluate(f => { const fr = f.getBoundingClientRect().right; return Array.from(f.querySelectorAll('span')).every(x => x.getBoundingClientRect().right <= fr + 0.5); });
  expect(sb, 'Shadbala values fully visible on mobile');
  await page.locator('[data-testid="birth-chart-plate"]').screenshot({ path: `${OUT}/charts-08-mobile-plate.png` });
  await page.locator('[data-testid="shadbala"]').screenshot({ path: `${OUT}/charts-08b-mobile-shadbala.png` });
  await page.locator('#section-vimshottari_dasha [data-testid="dasha-vimshottari"]').screenshot({ path: `${OUT}/charts-09-mobile-dasha.png` });
  await ctx.close();
}

// ── [D] Dark theme ─────────────────────────────────────────────────────────
{
  console.log('\n[D] dark theme');
  const { ctx, page } = await open(MAIN, { state: VIEW, theme: 'dark' });
  await page.locator('[data-testid="birth-chart-plate"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('[data-testid="birth-chart-plate"]').screenshot({ path: `${OUT}/charts-10-dark.png` });
  expect(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'renders under the dark theme');
  await ctx.close();
}

// ── [E] Unauthorized ──────────────────────────────────────────────────────
{
  console.log('\n[E] another user cannot see the chart or report');
  const { ctx, page } = await open(MAIN, { state: VIEW, email: INTRUDER });
  await page.waitForTimeout(6000);
  const text = await page.locator('body').innerText();
  expect(text.includes('isn’t available'), 'intruder sees the unavailable state');
  expect(await page.locator('[data-testid="chart-d1"]').count() === 0, 'no chart drawn for the intruder');
  expect(!text.includes('Sample Chart') && !text.includes('Lagna / Ascendant'), 'no subject name or section content leaks');
  await ctx.close();
}

// ── [F] Standalone app ─────────────────────────────────────────────────────
{
  console.log('\n[F] standalone Premium app renders the same document');
  const { ctx, page } = await open(STANDALONE, { state: { view: 'view', reportId: RID } });
  await page.locator('[data-testid="birth-chart-plate"]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  const ids = await page.locator('article[id^="section-"]').evaluateAll(a => a.map(x => x.id.replace('section-', '')));
  expect(JSON.stringify(ids) === JSON.stringify(sections.map(s => s.section_id)), 'standalone: 43 sections, same order');
  const d1 = await drawnHouses(page, '[data-testid="chart-d1"]');
  expect(JSON.stringify(norm(d1.houses)) === JSON.stringify(norm(expectedHouses(chart.planets))), 'standalone: D1 drawn identically');
  expect(await page.locator('[data-testid="download-pdf"]').count() >= 1, 'standalone: Download PDF available');
  await page.screenshot({ path: `${OUT}/charts-11-standalone.png` });
  await ctx.close();
}

// ── [G] Free Kundli PDF regression (refactored engine) ────────────────────
{
  console.log('\n[G] free Kundli PDF still generates through the shared engine');
  const stash = JSON.stringify({ details: { name: 'Sparsh bansal', placeName: 'Agra, Uttar Pradesh, India', date: '2026-09-02', time: '00:00', timezoneOffsetMinutes: 330, latitude: 27.1922, longitude: 78.0001 } });
  const { ctx, page } = await open(MAIN, { state: { page: 'free-kundli', selectedId: null, concern: null }, sessionStash: stash });
  const btn = page.locator('button', { hasText: /^Download PDF$/ }).first();
  await btn.waitFor({ timeout: 90000 });
  const t0 = Date.now();
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 480000 }), btn.click()]);
  await download.saveAs(`${OUT}/kundli-regression.pdf`);
  expect(download.suggestedFilename() === 'Sparsh bansal_ENG_Kundli.pdf', `Kundli PDF saved: ${download.suggestedFilename()} in ${Math.round((Date.now() - t0) / 1000)}s`);
  await ctx.close();
}

await browser.close();
const real = errors.filter(e => !/favicon|net::ERR_|status of 40[14]|\/api\/auth\/refresh/.test(e));
if (real.length) { console.log('\nerrors:'); real.slice(0, 10).forEach(e => console.log('  -', e.slice(0, 220))); }
expect(real.length === 0, 'no uncaught page/console errors');
writeFileSync(`${OUT}/charts-check-results.json`, JSON.stringify(results, null, 1));
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures ? 1 : 0);
