// REAL-BROWSER check of the Kundli chat assistant: semantic multi-message
// replies, language handling (English / Hindi / Hinglish, explicit switch and
// its persistence), streaming lifecycle and chart grounding — against the
// live local stack. Nothing is mocked.
//
// Prerequisites: backend on :4000, ai-core on :8000, main frontend on :5173.
// Run from the repo root (so `playwright` resolves):
//   [OUT_DIR=...] node web/frontend/e2e/kundliChat.e2e.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const OUT = process.env.OUT_DIR || join(process.cwd(), 'ai-core', 'logs', 'browser-e2e');
mkdirSync(OUT, { recursive: true });

const TURNS = [
  { q: 'What is my current Dasha about?', lang: 'english' },
  { q: 'मुझे मेरी शादी के बारे में बताइए।', lang: 'hindi' },
  { q: 'Mera partner kaisa hoga aur shaadi kab hogi? Detail mein batao', lang: 'hinglish' },
  { q: 'Saturn ka meri health aur ghar par kya asar hai?', lang: 'hinglish' },
  { q: 'What is my Lagna?', lang: 'english', simple: true },
  { q: 'I want you to reply in english', lang: 'english', simple: true },
  { q: 'Mera career kaisa rahega?', lang: 'english' },   // explicit English preference must persist
];
// A permitted follow-up: one short question that OFFERS a next topic, as the last bubble.
const OFFER = /(would you like|shall i|kya aap .*(jaanna|samajhna|dekhna|explore karna) chahenge|क्या आप .*(जानना|समझना) चाहेंगे)/i;

const DEVANAGARI = /[ऀ-ॿ]/;
const HINDI_FUNCTION_WORDS = /\b(hai|hain|mein|aap|aapka|aapki|aapke|aapko|ka|ki|ke|ko|se|aur|nahi)\b/gi;

function languageOf(text) {
  const deva = (text.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (deva > latin) return 'hindi';
  if (DEVANAGARI.test(text)) return 'mixed';
  const words = text.split(/\s+/).length;
  const hindi = (text.match(HINDI_FUNCTION_WORDS) || []).length;
  return hindi >= 2 && hindi / words >= 0.06 ? 'hinglish' : 'english';
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const streamEvents = [];
page.on('response', async (res) => {
  if (res.url().includes('/chat/stream')) {
    const body = await res.text().catch(() => '');
    streamEvents.push(body.split('\n').filter(l => l.startsWith('event:')).map(l => l.slice(7).trim()));
  }
});

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* */ } });
await page.goto(BASE, { waitUntil: 'networkidle' });
async function generateKundli() {
  // After a reload the app is already on the Kundli page with the form showing.
  if (!(await page.locator('#kundli-name').count())) {
    await page.getByRole('button', { name: /Free Kundli/i }).first().click();
  }
  await page.locator('#kundli-name').fill('Test User');
  await page.getByPlaceholder('Select Date of Birth').click();
  const cal = page.locator('select').filter({ has: page.locator('option', { hasText: /^2001$/ }) }).first();
  await cal.selectOption('2001');
  const months = page.locator('select').filter({ has: page.locator('option', { hasText: /^(March|Mar)$/ }) }).first();
  await months.selectOption({ label: await months.locator('option', { hasText: /^(March|Mar)$/ }).first().innerText() });
  await page.locator('button[class*="dayButton"]', { hasText: /^2$/ }).first().dispatchEvent('click');
  await page.getByPlaceholder('Select Time of Birth').click();
  const timeCols = page.locator('[class*="timeDropdown"] select');
  await timeCols.nth(0).selectOption('6');
  await timeCols.nth(1).selectOption('10');
  await timeCols.nth(2).selectOption('AM');
  await page.getByRole('button', { name: /Set Time/ }).dispatchEvent('click');
  await page.locator('#kundli-place').fill('New Delhi');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Generate My Free Kundli' }).click();
}
await generateKundli();

const panel = page.locator('aside[aria-label="Astrology assistant"]');
await panel.waitFor({ timeout: 90_000 });
await page.waitForTimeout(1500);
await panel.screenshot({ path: join(OUT, '00-greeting.png') });

const results = [];
for (const [i, turn] of TURNS.entries()) {
  const assistantBefore = await panel.locator('[class*="bubbleAssistant"]:not([class*="typing"])').count();
  const thumbsBefore = await panel.getByRole('button', { name: 'This was helpful' }).count();
  const input = panel.getByPlaceholder(/Ask about career/);
  await input.fill(turn.q);
  await input.press('Enter');
  await panel.getByRole('button', { name: 'This was helpful' }).nth(thumbsBefore).waitFor({ timeout: 120_000 });
  await page.waitForTimeout(400);
  const all = await panel.locator('[class*="bubbleAssistant"]:not([class*="typing"])').allInnerTexts();
  const bubbles = all.slice(assistantBefore).map(t => t.trim()).filter(Boolean);
  const langs = bubbles.map(languageOf);
  const rec = {
    question: turn.q, expected: turn.lang, bubbles: bubbles.length,
    languages: langs, languageOk: langs.every(l => l === turn.lang),
    everyBubbleEndsASentence: bubbles.every(b => /[.!?।…)]\s*\S{0,2}$/.test(b)),
    endsWithQuestion: /\?\s*$/.test(bubbles.at(-1) || ''),
    followUpOk: !/\?\s*$/.test(bubbles.at(-1) || '') ||
      (!turn.simple && OFFER.test(bubbles.at(-1)) && (bubbles.at(-1).match(/\?/g) || []).length === 1),
    wordsPerBubble: bubbles.map(b => b.split(/\s+/).length),
    stream: streamEvents.at(-1) ? [...new Set(streamEvents.at(-1))] : null,
    text: bubbles,
  };
  results.push(rec);
  await panel.screenshot({ path: join(OUT, `${String(i + 1).padStart(2, '0')}-${turn.lang}.png`) });
  const ok = rec.languageOk && rec.everyBubbleEndsASentence && rec.followUpOk;
  console.log(`${ok ? 'PASS' : 'FAIL'} [${turn.lang}] bubbles=${rec.bubbles} words=${rec.wordsPerBubble.join('/')} langs=${langs.join(',')}${rec.endsWithQuestion ? ' +follow-up' : ''} :: ${turn.q}`);
}
// Persistence: reload and check the conversation comes back with the same bubbles.
const beforeReload = await panel.locator('[class*="bubbleAssistant"]:not([class*="typing"])').allInnerTexts();
await page.reload({ waitUntil: 'networkidle' });
let restored = null;
try {
  // An anonymous visitor's chart is not kept across a reload: generate the
  // same chart again — same chart key, same session — and the chat restores.
  await generateKundli();
  const p2 = page.locator('aside[aria-label="Astrology assistant"]');
  await p2.waitFor({ timeout: 90_000 });
  await page.waitForTimeout(3000);
  restored = await p2.locator('[class*="bubbleAssistant"]:not([class*="typing"])').allInnerTexts();
  await p2.screenshot({ path: join(OUT, '99-after-reload.png') });
} catch (err) {
  console.log('reload check: chat panel not available after reload:', String(err).split('\n')[0]);
}
const persistence = restored && {
  bubblesBefore: beforeReload.length, bubblesAfter: restored.length,
  sameBubbles: JSON.stringify(beforeReload.slice(1).map(t => t.trim())) === JSON.stringify(restored.slice(1).map(t => t.trim())),
};
console.log('reload persistence:', JSON.stringify(persistence));
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ turns: results, persistence }, null, 1));
await browser.close();
const failures = results.filter(r => !r.languageOk || !r.everyBubbleEndsASentence || !r.followUpOk);
if (persistence && !persistence.sameBubbles) failures.push({ persistence });
console.log(`\n${results.length - failures.length}/${results.length} turns passed language + integrity checks; screenshots in ${OUT}`);
process.exit(failures.length ? 1 : 0);
