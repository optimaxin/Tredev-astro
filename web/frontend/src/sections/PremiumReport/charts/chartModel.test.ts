// Chart data-model tests for the Premium Report visualizations. Same
// convention as utils/reportMarkdown.test.ts: no framework, node:assert,
// non-zero exit on failure.
//   npm run test:charts --workspace tredevastro-frontend
//
// Fixtures (in __fixtures__/) are REAL Kundli Engine output passed through the
// backend's actual allowlist (backend/app/services/premiumReportView.ts):
//   • pdfExample  — the engine chart for the birth details printed on the
//     reference Kundli PDF ("Sparsh bansal_ENG_Kundli", 2026-09-02 00:00,
//     Agra). Every EXPECTED placement below was transcribed by hand from that
//     PDF's printed charts and tables — not derived from this code.
//   • fullReport  — the chart of the real 43-section premium report
//     (Stage 6 run 36fc75dd2927439e), with that report's section list.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChartView } from '../../../services/premiumReportService';
import {
  availableVargas, cleanPeriods, currentPeriod, formatDms, getVarga, groupByHouse, hasD1, isIsoDay, phaseOf,
  positionRows, sectionVisualKind, strengthRows, timelineSegments, toD1ChartPlanets, toVargaChartPlanets, todayMarkerPct, vimshottari, RASHIS,
} from './chartModel.ts';
import { buildReportEntries } from '../reportEntries.ts';

const here = dirname(fileURLToPath(import.meta.url));
const load = <T,>(f: string): T => JSON.parse(readFileSync(join(here, '__fixtures__', f), 'utf-8')) as T;
const pdf = load<ChartView>('pdfExample.chartView.json');
const full = load<ChartView>('fullReport.chartView.json');
const fullSections = load<{ section_id: string; title: string; status: string }[]>('fullReport.sections.json');

let failures = 0;
function check(label: string, fn: () => void) {
  try { fn(); console.log(`✓ ${label}`); }
  catch (e) { failures++; console.error(`✗ ${label}\n   ${(e as Error).message}`); }
}
const sorted = (a: string[]) => [...a].sort();

// ── D1 placement, against the reference PDF ───────────────────────────────
// Reference PDF page 3, "Lagna Chart (D1)" — house -> what is drawn in it.
const PDF_D1: Record<number, string[]> = {
  1: ['asc', 'uranus'], 2: ['mars'], 3: ['jupiter'], 4: ['sun', 'mercury', 'ketu'], 5: ['venus'], 6: [], 7: [], 8: [],
  9: ['pluto'], 10: ['rahu'], 11: ['saturn', 'neptune'], 12: ['moon'],
};

check('D1: every planet lands in the same house as on the reference PDF', () => {
  const byHouse = groupByHouse(toD1ChartPlanets(pdf));
  for (let h = 1; h <= 12; h++) assert.deepEqual(sorted(byHouse[h]), sorted(PDF_D1[h]), `house ${h}`);
});

check('D1: Lagna is Taurus and drawn in house 1', () => {
  const asc = toD1ChartPlanets(pdf).find(p => p.id === 'asc')!;
  assert.equal(pdf.lagna.rashi, 'Taurus');
  assert.equal(asc.house, 1);
  assert.equal(asc.decimalDegree, '25.72°'); // PDF: "As 25.72°"
});

check('D1: multiple planets in one house are all kept (none dropped or merged)', () => {
  const planets = toD1ChartPlanets(pdf);
  assert.equal(planets.length, 13, 'Lagna + 12 planets');
  assert.equal(new Set(planets.map(p => p.id)).size, 13, 'no duplicates');
  assert.equal(groupByHouse(planets)[4].length, 3, 'Su, Me, Ke share house 4');
});

check('D1: on-chart degree labels match the PDF', () => {
  const deg = Object.fromEntries(toD1ChartPlanets(pdf).map(p => [p.id, p.decimalDegree]));
  assert.deepEqual(
    { mo: deg.moon, ma: deg.mars, ju: deg.jupiter, su: deg.sun, me: deg.mercury, ke: deg.ketu, ve: deg.venus, sa: deg.saturn, ne: deg.neptune, pl: deg.pluto, ra: deg.rahu, ur: deg.uranus },
    { mo: '11.77°', ma: '19.66°', ju: '19.64°', su: '15.12°', me: '19.93°', ke: '5.04°', ve: '29.56°', sa: '19.41°', ne: '9.42°', pl: '9.27°', ra: '5.04°', ur: '11.43°' }
  );
});

check('D1: retrograde flags match the PDF (Sa, Ne, Pl, Ra, Ke)', () => {
  const retro = toD1ChartPlanets(pdf).filter(p => p.retrograde).map(p => p.id);
  assert.deepEqual(sorted(retro), sorted(['saturn', 'neptune', 'pluto', 'rahu', 'ketu']));
});

check('D1: each planet’s sign is the rashi the chart prints in its house (whole-sign, no recomputation)', () => {
  for (const chart of [pdf, full]) {
    const ascIdx = RASHIS.indexOf(chart.lagna.rashi as typeof RASHIS[number]);
    for (const p of toD1ChartPlanets(chart)) {
      assert.equal(RASHIS[(ascIdx + p.house - 1) % 12], p.sign, `${p.id} in house ${p.house}`);
    }
  }
});

// ── Planetary positions table ──────────────────────────────────────────────

check('positions: degrees print exactly as the PDF’s table does', () => {
  const by = Object.fromEntries(positionRows(pdf).map(p => [p.planet, formatDms(p.degree_in_sign)]));
  assert.equal(formatDms(pdf.lagna.degree_in_sign), '25° 43′ 16″');
  assert.equal(by.Sun, '15° 6′ 57″');
  assert.equal(by.Moon, '11° 46′ 10″');
  assert.equal(by.Venus, '29° 33′ 26″');
  assert.equal(by.Rahu, '5° 2′ 7″');
});

check('positions: nakshatra and lord come straight from the engine', () => {
  const by = Object.fromEntries(positionRows(pdf).map(p => [p.planet, `${p.nakshatra}/${p.nakshatra_lord}`]));
  assert.equal(by.Sun, 'Purva Phalguni/Venus');
  assert.equal(by.Moon, 'Ashwini/Ketu');
  assert.equal(by.Venus, 'Chitra/Mars');
  assert.equal(by.Saturn, 'Revati/Mercury');
  assert.equal(by.Ketu, 'Magha/Ketu');
});

check('positions: rows in conventional order, all 12 planets', () => {
  assert.deepEqual(positionRows(pdf).map(p => p.planet), ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu', 'Uranus', 'Neptune', 'Pluto']);
});

// ── D9 ─────────────────────────────────────────────────────────────────────
// Reference PDF page 3, "Navamsa Chart (D9)".
const PDF_D9: Record<number, string[]> = {
  1: ['asc', 'sun'], 2: ['mercury', 'venus', 'neptune'], 3: [], 4: ['rahu'], 5: ['jupiter', 'saturn'], 6: [], 7: [],
  8: ['mars', 'pluto'], 9: ['uranus'], 10: ['ketu'], 11: [], 12: ['moon'],
};

check('D9: drawn from the engine’s own Navamsa, matching the PDF', () => {
  const v = getVarga(pdf, 'D9');
  assert.ok(v, 'D9 available');
  assert.equal(v!.ascendant_rashi, 'Leo');
  const byHouse = groupByHouse(toVargaChartPlanets(v!));
  for (let h = 1; h <= 12; h++) assert.deepEqual(sorted(byHouse[h]), sorted(PDF_D9[h]), `D9 house ${h}`);
});

check('D9: absent data -> no chart (never derived)', () => {
  const noVargas: ChartView = { ...pdf, divisional_charts: null };
  assert.equal(getVarga(noVargas, 'D9'), null);
  assert.deepEqual(availableVargas(noVargas), []);
  const onlyD10: ChartView = { ...pdf, divisional_charts: { D10: pdf.divisional_charts!.D10 } };
  assert.equal(getVarga(onlyD10, 'D9'), null, 'D9 is not inferred from other vargas');
  assert.deepEqual(availableVargas(onlyD10), ['D10']);
});

check('divisional: malformed varga data is refused, not repaired', () => {
  const bad: ChartView = { ...pdf, divisional_charts: {
    D9: { ascendant_rashi: 'Lionsign', placements: pdf.divisional_charts!.D9.placements },
    D10: { ascendant_rashi: 'Virgo', placements: [{ planet: 'Sun', rashi: 'Virgo', house: 14 }] },
  } };
  assert.equal(getVarga(bad, 'D9'), null, 'unknown rashi');
  assert.equal(getVarga(bad, 'D10'), null, 'no valid placement left');
});

check('divisional: all 19 engine vargas are available for both real charts', () => {
  assert.equal(availableVargas(pdf).length, 19);
  assert.equal(availableVargas(full).length, 19);
});

// ── Missing / malformed D1 ─────────────────────────────────────────────────

check('D1: missing or malformed chart -> unavailable, not drawn', () => {
  assert.equal(hasD1(null), false);
  assert.equal(hasD1({ ...pdf, lagna: { rashi: 'Unknown', degree_in_sign: 1 } }), false);
  assert.equal(hasD1({ ...pdf, planets: [] }), false);
});

check('D1: an out-of-range house is dropped, never moved somewhere plausible', () => {
  const broken: ChartView = { ...pdf, planets: [...pdf.planets.filter(p => p.planet !== 'Mars'), { ...pdf.planets.find(p => p.planet === 'Mars')!, house: 13 }] };
  const ids = toD1ChartPlanets(broken).map(p => p.id);
  assert.ok(!ids.includes('mars'));
  assert.equal(ids.length, 12);
});

// ── Dasha periods ──────────────────────────────────────────────────────────

check('dasha: Mahadasha dates match the PDF (Ketu → Jun 28, 2027; Venus → Jun 28, 2047)', () => {
  const md = vimshottari(pdf);
  assert.deepEqual(md.slice(0, 3).map(m => [m.lord, m.ends_at]), [['Ketu', '2027-06-28'], ['Venus', '2047-06-28'], ['Sun', '2053-06-28']]);
  assert.equal(md.length, 9);
});

check('dasha: current period is worked out from real dates against today', () => {
  const md = vimshottari(pdf);
  assert.equal(currentPeriod(md, '2026-10-11')!.lord, 'Ketu');
  const ketu = md[0];
  // PDF Antardasha card: "VENUS  Sep 18, 2026 – Nov 07, 2026"
  const ad = currentPeriod(ketu.antardashas, '2026-10-11')!;
  assert.deepEqual([ad.lord, ad.starts_at, ad.ends_at], ['Venus', '2026-09-18', '2026-11-07']);
  assert.equal(currentPeriod(md, '2030-01-01')!.lord, 'Venus', 'moves on with the calendar');
});

check('dasha: agrees with the engine’s own "active" period on the day it was fetched', () => {
  // Stage 6 run 36fc75dd2927439e, fetched 2026-10-08: engine marked Sun MD,
  // Mercury AD and Dhanya yogini active. (The flags themselves are not sent
  // to the browser — they go stale — so this checks the date logic.)
  const md = vimshottari(full);
  const cur = currentPeriod(md, '2026-10-08')!;
  assert.deepEqual([cur.lord, cur.starts_at, cur.ends_at], ['Sun', '2022-03-25', '2028-03-24']);
  assert.equal(currentPeriod(cur.antardashas, '2026-10-08')!.lord, 'Mercury');
  assert.equal(currentPeriod(cleanPeriods(full.yogini), '2026-10-08')!.yogini, 'Dhanya');
});

check('dasha: boundaries are half-open (the boundary day belongs to the new period)', () => {
  const ketu = vimshottari(pdf)[0];
  const first = ketu.antardashas[0]; // Ketu-Ketu, ends Sep 18 2026 per PDF
  assert.equal(first.ends_at, '2026-09-18');
  assert.equal(phaseOf(first, '2026-09-17'), 'current');
  assert.equal(phaseOf(first, '2026-09-18'), 'past');
  assert.equal(currentPeriod(ketu.antardashas, '2026-09-18')!.lord, 'Venus');
});

check('dasha: past / current / future are distinguished', () => {
  const md = vimshottari(full);
  const phases = md.map(m => phaseOf(m, '2026-10-08'));
  assert.equal(phases.filter(p => p === 'current').length, 1);
  assert.ok(phases.indexOf('current') > 0 && phases.slice(0, phases.indexOf('current')).every(p => p === 'past'));
  assert.ok(phases.slice(phases.indexOf('current') + 1).every(p => p === 'future'));
});

check('dasha: malformed periods are dropped, never patched', () => {
  const list = cleanPeriods([
    { lord: 'Ketu', starts_at: '2026-02-30', ends_at: '2027-01-01' },   // impossible date
    { lord: 'Venus', starts_at: '2027-01-01', ends_at: '2026-01-01' },  // ends before it starts
    { lord: 'Sun', starts_at: '2027-01-01', ends_at: '2033-01-01' },
  ]);
  assert.deepEqual(list.map(p => p.lord), ['Sun']);
  assert.equal(isIsoDay('2026-02-30'), false);
  assert.equal(isIsoDay('2026-02-28'), true);
  assert.deepEqual(vimshottari(null), []);
});

check('dasha: timeline bars are sized by the periods’ real lengths', () => {
  const md = vimshottari(pdf);
  const segs = timelineSegments(md, '2026-10-11');
  const total = segs.reduce((s, x) => s + x.widthPct, 0);
  assert.ok(Math.abs(total - 100) < 1e-6, 'covers the whole bar');
  const venus = segs.find(s => s.period.lord === 'Venus')!, sun = segs.find(s => s.period.lord === 'Sun')!;
  assert.ok(Math.abs(venus.widthPct / sun.widthPct - 20 / 6) < 0.01, 'Venus 20y vs Sun 6y');
  assert.ok(todayMarkerPct(md, '2026-10-11')! < 1, 'today sits near the start of this newborn chart');
  assert.equal(todayMarkerPct(md, '1900-01-01'), null);
});

// ── Strength ───────────────────────────────────────────────────────────────

check('shadbala: engine rupas are used as-is; unusable rows dropped', () => {
  const rows = strengthRows(pdf);
  assert.ok(rows.length >= 7);
  assert.ok(rows.every(r => r.shadbala_rupas > 0 && r.min_required_rupas > 0));
  assert.deepEqual(strengthRows({ ...pdf, planet_strength: [{ planet: 'Sun', shadbala_rupas: NaN, min_required_rupas: 6.5, is_strong: true }] }), []);
  assert.deepEqual(strengthRows({ ...pdf, planet_strength: null }), []);
});

// ── Reading order ──────────────────────────────────────────────────────────

const fullReport = {
  chart: full,
  sections: fullSections.map(s => ({ ...s, kind: 'llm' as const, content: 'x', status: s.status as 'completed' })),
};

check('order: the 43 sections keep their exact order and numbers 1..43', () => {
  const entries = buildReportEntries(fullReport);
  const secs = entries.filter(e => e.kind === 'section');
  assert.equal(secs.length, 43);
  assert.deepEqual(secs.map(e => e.section!.section_id), fullSections.map(s => s.section_id));
  assert.deepEqual(secs.map(e => e.number), Array.from({ length: 43 }, (_, i) => i + 1));
});

check('order: Birth Chart plate sits right after Panchang; appendix right before Disclaimer', () => {
  const keys = buildReportEntries(fullReport).map(e => e.key);
  assert.equal(keys[keys.indexOf('panchang') + 1], 'birth-chart');
  assert.equal(keys[keys.indexOf('disclaimer') - 1], 'divisional-charts');
  assert.equal(keys.length, 45, '43 sections + 2 chart pages');
});

check('order: no chart -> no chart pages; D9-only -> plate but no empty appendix', () => {
  assert.equal(buildReportEntries({ ...fullReport, chart: null }).length, 43);
  const d9only = buildReportEntries({ ...fullReport, chart: { ...full, divisional_charts: { D9: full.divisional_charts!.D9 } } });
  assert.ok(d9only.some(e => e.kind === 'birth-chart'));
  assert.ok(!d9only.some(e => e.kind === 'appendix'));
});

check('section visuals: each sits beside its related reading, only with real data', () => {
  assert.equal(sectionVisualKind('vimshottari_dasha', pdf), 'vimshottari');
  assert.equal(sectionVisualKind('yogini_dasha', pdf), 'yogini');
  assert.equal(sectionVisualKind('planetary_analysis', pdf), 'strength');
  assert.equal(sectionVisualKind('planet_saturn', pdf), 'planet');
  assert.equal(sectionVisualKind('doshas', pdf), 'doshas');
  assert.equal(sectionVisualKind('career', pdf), 'varga');
  assert.equal(sectionVisualKind('marriage', pdf), 'varga');
  for (const prose of ['lagna', 'remedies', 'gemstones', 'final_summary', 'disclaimer', 'cover']) {
    assert.equal(sectionVisualKind(prose, pdf), null, `${prose} gets no chart`);
  }
  // Optional complements disappear when their data is missing...
  const bare: ChartView = { ...pdf, planet_strength: null, doshas: null, divisional_charts: null };
  for (const id of ['planetary_analysis', 'doshas', 'career', 'marriage']) assert.equal(sectionVisualKind(id, bare), null, id);
  // ...but a Dasha section still shows (an explicit "unavailable" state).
  assert.equal(sectionVisualKind('vimshottari_dasha', { ...pdf, vimshottari: null }), 'vimshottari');
  assert.equal(sectionVisualKind('planet_sun', null), null);
});

console.log(failures === 0 ? '\nAll chart-model tests passed.' : `\n${failures} test(s) FAILED.`);
if (failures > 0) process.exit(1);
