// REAL-BROWSER release suite for the Kundli chat assistant: 30 separate
// conversations (each with its own birth chart, so its own chat session)
// covering Hindi -> Hinglish and Hinglish -> English switching, career,
// relationship and Dasha questions, follow-ups, long history, reload
// persistence, and short and detailed answers. Every check reads the
// message bubbles the UI actually rendered. Nothing is mocked.
//
// Prerequisites: backend on :4000, ai-core on :8000, main frontend on :5173.
// Run from the repo root:  [OUT_DIR=...] [ONLY=1,5] node web/frontend/e2e/kundliChatSuite.e2e.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.FRONTEND_URL || 'http://localhost:5173';
const OUT = process.env.OUT_DIR || join(process.cwd(), 'ai-core', 'logs', 'browser-e2e-suite');
mkdirSync(OUT, { recursive: true });

const en = (q, o = {}) => ({ q, lang: 'english', ...o });
const hl = (q, o = {}) => ({ q, lang: 'hinglish', ...o });
const hi = (q, o = {}) => ({ q, lang: 'hindi', ...o });
const S = { simple: true };

// [category, birth (year, month, day, hour, AM/PM), turns, reload?]
const CONVERSATIONS = [
  ['hindi->hinglish', [1990, 'January', 5, 7, 'AM'], [hi('मेरा करियर कैसा रहेगा?'), hl('Aur shaadi kab tak hogi?')]],
  ['hindi->hinglish', [1992, 'February', 11, 9, 'AM'], [hi('मेरी राशि क्या है?', S), hl('Mera lagna kya hai?', S), hl('Mere liye kaunsa business sahi rahega?')]],
  ['hindi->hinglish', [1988, 'March', 17, 11, 'AM'], [hi('मेरी वर्तमान दशा क्या है?'), hl('Iska meri naukri par kya asar hoga?')]],
  ['hindi->hinglish', [1995, 'April', 23, 2, 'PM'], [hi('मेरे रिश्तों के बारे में बताइए।'), hl('Partner kaisa hoga?')], true],
  ['hindi->hinglish', [1985, 'May', 2, 4, 'PM'], [hi('शनि मेरी कुंडली में कहाँ है?'), hl('Shani ka ghar par kya asar hai?')]],
  ['hinglish->english', [1997, 'June', 8, 6, 'PM'], [hl('Mera career kaisa rahega?'), en('I want you to reply in english', S), en('Shaadi kab hogi?')], true],
  ['hinglish->english', [1993, 'July', 14, 8, 'PM'], [hl('Meri dasha kya chal rahi hai?'), en('What does this period mean for my finances?')]],
  ['hinglish->english', [1999, 'August', 20, 10, 'PM'], [hl('Mera Moon kis house mein hai?', S), en('What does that say about my emotions?')]],
  ['hinglish->english', [1987, 'September', 26, 5, 'AM'], [hl('Mere relationships kaise rahenge?'), en('Please answer in English from now on.', S), en('And my career?')], true],
  ['career', [2000, 'October', 3, 7, 'AM'], [en('How will my career be?'), en('Is a government job or business better for me?')]],
  ['career', [1991, 'November', 9, 9, 'AM'], [hl('Kya is saal mujhe job change karni chahiye?'), hl('Kaunsa field mere liye best hai?')]],
  ['career', [1989, 'December', 15, 11, 'AM'], [hi('मेरे लिए कौन सा करियर अच्छा है?'), hi('क्या मुझे विदेश में नौकरी मिल सकती है?')]],
  ['relationship', [1996, 'January', 21, 1, 'PM'], [en('What does my chart say about my love life?'), en('Will I have a love marriage or an arranged marriage?')]],
  ['relationship', [1994, 'February', 27, 3, 'PM'], [hl('Meri shaadi kab hogi?'), hl('Mera jeevansathi kaisa hoga?')]],
  ['relationship', [1986, 'March', 4, 5, 'PM'], [hi('मेरी शादी के बारे में बताइए।'), hi('शादी में कोई देरी तो नहीं है?')], true],
  ['dasha', [2001, 'April', 10, 7, 'PM'], [en('What is my current Mahadasha?'), en('What is my current Antardasha and when does it end?')]],
  ['dasha', [1998, 'May', 16, 9, 'PM'], [hl('Meri Mahadasha kab khatam hogi?'), hl('Agli Antardasha kaisi rahegi?')]],
  ['dasha', [1984, 'June', 22, 6, 'AM'], [hi('मेरी महादशा और अंतर्दशा क्या है?'), hi('यह दशा मेरे स्वास्थ्य के लिए कैसी है?')]],
  ['follow-up', [1990, 'July', 28, 8, 'AM'], [en('Tell me about my finances.'), en('Can you explain that in more detail?'), en('What about savings?')]],
  ['follow-up', [1993, 'August', 1, 10, 'AM'], [hl('Meri health kaisi rahegi?'), hl('Aur detail mein batao'), hl('Isme kya dhyan rakhna chahiye?')]],
  ['follow-up', [1997, 'September', 7, 12, 'PM'], [hi('मेरे परिवार के बारे में बताइए।'), hi('माँ के साथ संबंध कैसे रहेंगे?'), hi('धन्यवाद', S)]],
  ['long-history', [1992, 'October', 13, 2, 'PM'], [
    en('What is my Lagna?', S), hl('Mera career kaisa rahega?'), hi('मेरी शादी कब होगी?'), hl('Meri dasha kya hai?'),
    en('How are my finances?'), hl('Health ke baare mein kuch hai?'), hl('theek hai', S), en('What about my education?'),
    hl('Mere liye kaunsa din shubh hai?'), en('I want you to reply in english', S), en('Mera ghar kab banega?'),
    en('Thanks, that helps.', S)], true],
  ['long-history', [1988, 'November', 19, 4, 'PM'], [
    hl('Mera lagna kya hai?', S), hl('Iska meri personality par kya asar hai?'), hl('Career mein growth kab hogi?'),
    hl('Business karun ya job?'), hl('Shaadi kab tak hogi?'), hl('Partner kaisa hoga?'), hl('Meri dasha kya hai?'),
    hl('Is dasha mein kya dhyan rakhun?')]],
  ['short', [1995, 'December', 25, 6, 'PM'], [en('What is my Lagna?', S), en('Which house is my Venus in?', S), en('What is my moon sign?', S)]],
  ['short', [1986, 'January', 30, 8, 'PM'], [hl('Mera lagna kya hai?', S), hl('Jupiter kis house mein hai?', S), hl('Meri rashi kya hai?', S)]],
  ['short', [1999, 'February', 6, 10, 'PM'], [hi('मेरा लग्न क्या है?', S), hi('बुध किस भाव में है?', S)]],
  ['detailed', [1987, 'March', 12, 5, 'AM'], [en('Give me a detailed career analysis with timing.')]],
  ['detailed', [2002, 'April', 18, 7, 'AM'], [hl('Mera partner kaisa hoga aur shaadi kab hogi? Detail mein batao')]],
  ['detailed', [1991, 'May', 24, 9, 'AM'], [hi('मेरी शादी का पूरा विश्लेषण बताइए — योग, जीवनसाथी, समय और दशा।')], true],
  ['greeting+career', [1994, 'June', 29, 11, 'AM'], [en('Hi', S), hl('Mera career kaisa rahega?'), en('thanks', S)]],
];

const OFFER = /(would you like|shall i|do you want me to|kya aap .*(jaanna|samajhna|dekhna|explore karna|janna) chah|क्या आप .*(जानना|समझना|देखना) चाहेंगे|बताऊँ|बताऊं)/i;
const LEAK = /\bnvidia\b|\bnemotron\b|language model|नेमोट्रॉन|एनवीआईडीआईए|भाषा मॉडल|›|chart data|retrieved knowledge|knowledge base/i;
// The canned replies, including the identity reply that replaces an answer
// which was only the model describing itself (no question here asks "who are you").
const CANNED = /(ask it once more|ek baar phir poochiye|एक बार फिर पूछिए|couldn't load your birth chart|Kundli load nahi|AI astrology assistant|AI ज्योतिष सहायक)/i;
const HINDI_FUNCTION_WORDS = /\b(hai|hain|mein|aap|aapka|aapki|aapke|aapko|ka|ki|ke|ko|se|aur|nahi)\b/gi;

function languageOf(text) {
  const deva = (text.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (deva > latin) return 'hindi';
  if (deva) return 'mixed';
  const words = text.split(/\s+/).length;
  const hindi = (text.match(HINDI_FUNCTION_WORDS) || []).length;
  return hindi >= 2 && hindi / words >= 0.06 ? 'hinglish' : (hindi >= 1 && words < 12 ? 'hinglish?' : 'english');
}
function bubbleLanguageOk(expected, bubble) {
  const got = languageOf(bubble);
  if (expected === 'hinglish') return got === 'hinglish' || got === 'hinglish?' || (got === 'english' && bubble.split(/\s+/).length < 12);
  if (expected === 'english') return got === 'english' || (got === 'hinglish?' && !/[ऀ-ॿ]/.test(bubble));
  return got === expected;
}
const MONTH_SHORT = m => m.slice(0, 3);

async function generateKundli(page, [year, month, day, hour, ampm]) {
  if (!(await page.locator('#kundli-name').count())) {
    await page.getByRole('button', { name: /Free Kundli/i }).first().click();
  }
  await page.locator('#kundli-name').fill('Suite User');
  await page.getByPlaceholder('Select Date of Birth').click();
  const years = page.locator('select').filter({ has: page.locator('option', { hasText: new RegExp(`^${year}$`) }) }).first();
  await years.selectOption(String(year));
  const monthRx = new RegExp(`^(${month}|${MONTH_SHORT(month)})$`);
  const months = page.locator('select').filter({ has: page.locator('option', { hasText: monthRx }) }).first();
  await months.selectOption({ label: await months.locator('option', { hasText: monthRx }).first().innerText() });
  await page.locator('button[class*="dayButton"]', { hasText: new RegExp(`^${day}$`) }).first().dispatchEvent('click');
  await page.getByPlaceholder('Select Time of Birth').click();
  const timeCols = page.locator('[class*="timeDropdown"] select');
  await timeCols.nth(0).selectOption(String(hour));
  await timeCols.nth(1).selectOption('10');
  await timeCols.nth(2).selectOption(ampm);
  await page.getByRole('button', { name: /Set Time/ }).dispatchEvent('click');
  await page.locator('#kundli-place').fill('New Delhi');
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Generate My Free Kundli' }).click();
}

const ASSISTANT = '[class*="bubbleAssistant"]:not([class*="typing"])';
const only = (process.env.ONLY || '').split(',').filter(Boolean).map(Number);
const browser = await chromium.launch();
const conversations = [];

for (const [ci, [category, birth, turns, reload]] of CONVERSATIONS.entries()) {
  if (only.length && !only.includes(ci + 1)) continue;
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const page = await context.newPage();
  const streamEvents = [];
  page.on('response', async (res) => {
    if (res.url().includes('/chat/stream')) {
      const body = await res.text().catch(() => '');
      streamEvents.push(body.split('\n').filter(l => l.startsWith('event:')).map(l => l.slice(7).trim()));
    }
  });
  const conv = { n: ci + 1, category, birth, turns: [], persistence: null, error: null };
  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await generateKundli(page, birth);
    const panel = page.locator('aside[aria-label="Astrology assistant"]');
    await panel.waitFor({ timeout: 90_000 });
    await page.waitForTimeout(1500);
    for (const turn of turns) {
      const before = await panel.locator(ASSISTANT).count();
      const thumbs = await panel.getByRole('button', { name: 'This was helpful' }).count();
      const input = panel.getByPlaceholder(/Ask about career/);
      await input.fill(turn.q);
      await input.press('Enter');
      await panel.getByRole('button', { name: 'This was helpful' }).nth(thumbs).waitFor({ timeout: 150_000 });
      await page.waitForTimeout(400);
      const bubbles = (await panel.locator(ASSISTANT).allInnerTexts()).slice(before).map(t => t.trim()).filter(Boolean);
      const last = bubbles.at(-1) || '';
      const questions = bubbles.filter(b => /\?\s*$/.test(b));
      const words = bubbles.map(b => b.split(/\s+/).length);
      const events = streamEvents.at(-1) ? [...new Set(streamEvents.at(-1))] : [];
      const rec = {
        question: turn.q, expected: turn.lang, simple: !!turn.simple, bubbles: bubbles.length, words,
        totalWords: words.reduce((a, b) => a + b, 0), languages: bubbles.map(languageOf),
        languageOk: bubbles.length > 0 && bubbles.every(b => bubbleLanguageOk(turn.lang, b)),
        sentencesComplete: bubbles.every(b => /[.!?।…)\]"'”’]\s*\S{0,2}$/.test(b)),
        followUps: questions.length,
        followUpOk: questions.length === 0 || (questions.length === 1 && /\?\s*$/.test(last) && OFFER.test(last)
          && last.split(/\s+/).length <= 15 && !turn.simple),
        oversized: words.filter(w => w > 60).length,
        leak: bubbles.some(b => LEAK.test(b)),
        canned: bubbles.some(b => CANNED.test(b)),
        streamed: events.includes('start') && events.includes('done') && events.some(e => e.startsWith('segment')),
        text: bubbles,
      };
      rec.pass = rec.languageOk && rec.sentencesComplete && rec.followUpOk && !rec.oversized && !rec.leak
        && !rec.canned && rec.streamed;
      conv.turns.push(rec);
      console.log(`${rec.pass ? 'PASS' : 'FAIL'} #${ci + 1} [${category}/${turn.lang}] bubbles=${rec.bubbles} words=${words.join('/')}`
        + `${rec.followUps ? ' +follow-up' : ''}${rec.canned ? ' CANNED' : ''}${rec.leak ? ' LEAK' : ''}`
        + `${rec.languageOk ? '' : ' LANG:' + rec.languages.join(',')} :: ${turn.q}`);
    }
    await panel.screenshot({ path: join(OUT, `conv-${String(ci + 1).padStart(2, '0')}.png`) });
    if (reload) {
      const beforeReload = (await panel.locator(ASSISTANT).allInnerTexts()).map(t => t.trim());
      await page.reload({ waitUntil: 'networkidle' });
      await generateKundli(page, birth);           // same chart -> same session -> chat restores
      const p2 = page.locator('aside[aria-label="Astrology assistant"]');
      await p2.waitFor({ timeout: 90_000 });
      await page.waitForTimeout(3000);
      const restored = (await p2.locator(ASSISTANT).allInnerTexts()).map(t => t.trim());
      conv.persistence = { before: beforeReload.length, after: restored.length,
        same: JSON.stringify(beforeReload.slice(1)) === JSON.stringify(restored.slice(1)) };
      await p2.screenshot({ path: join(OUT, `conv-${String(ci + 1).padStart(2, '0')}-reloaded.png`) });
      console.log(`  reload #${ci + 1}: ${JSON.stringify(conv.persistence)}`);
    }
  } catch (err) {
    conv.error = String(err).split('\n')[0];
    console.log(`ERROR #${ci + 1} [${category}]: ${conv.error}`);
    await page.screenshot({ path: join(OUT, `conv-${String(ci + 1).padStart(2, '0')}-error.png`) }).catch(() => {});
  }
  conversations.push(conv);
  await context.close();
  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ conversations }, null, 1));
}
await browser.close();

const turns = conversations.flatMap(c => c.turns);
const count = key => turns.filter(t => t[key]).length;
const summary = {
  conversations: conversations.length,
  conversationsAllPass: conversations.filter(c => !c.error && c.turns.every(t => t.pass) && (!c.persistence || c.persistence.same)).length,
  errors: conversations.filter(c => c.error).length,
  turns: turns.length, turnsPass: count('pass'),
  languageOk: count('languageOk'), sentencesComplete: count('sentencesComplete'), followUpOk: count('followUpOk'),
  withFollowUp: turns.filter(t => t.followUps).length, oversizedBubbles: turns.reduce((a, t) => a + t.oversized, 0),
  leaks: count('leak'), canned: count('canned'), streamed: count('streamed'),
  reloads: conversations.filter(c => c.persistence).length,
  reloadsSame: conversations.filter(c => c.persistence && c.persistence.same).length,
  bubbleWords: turns.flatMap(t => t.words),
};
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ summary, conversations }, null, 1));
console.log('\nSUMMARY', JSON.stringify({ ...summary, bubbleWords: undefined }));
process.exit(summary.conversationsAllPass === summary.conversations ? 0 : 1);
