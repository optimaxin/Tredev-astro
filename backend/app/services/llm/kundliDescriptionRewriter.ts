// Rewrites TredevAstro's template-generated Kundli descriptions (planet
// placements, Mahadasha predictions, Ascendant blurb, yoga/gemstone/rudraksha
// text — see kundliAnalysis.ts, dashaPredictions.ts, ascendantPredictions.ts,
// yogas.ts, avakhada.ts) into natural, conversational language via NVIDIA NIM,
// without touching the astrological calculation engine or any of those
// templates themselves. Every description still comes from the real
// computed chart; this only rephrases the sentence.
//
// Deliberately one call per LANGUAGE (en or hi), not both at once: the
// existing Kundli pipeline only ever computes one language per request
// (see kundliFullBuilder.ts's `language` param) — there is no English
// original sitting around to rewrite when a Hindi report was requested, and
// generating an unused second language on every call would double the LLM
// spend for text nobody reads. Caching is per (text, language) pair instead.
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { config } from '../../core/config.ts';
import { chatCompleteWithFallback } from './nvidiaNimClient.ts';
import { getCachedRewrites, saveRewrites, type DescriptionCacheWrite } from '../../repositories/kundliDescriptionCacheRepository.ts';
import type { KundliFullResult } from '../astrology/kundliFullBuilder.ts';

// Bump this when SYSTEM_PROMPT (or the request/response shape built around
// it) changes — every cached row is keyed on it, so a bump naturally
// regenerates everything on next request instead of silently reusing
// rewrites produced under the old rules.
const PROMPT_VERSION = 'v1';

const BATCH_SIZE = 12;
// Hard cap on how long the whole rewrite step may run for one request —
// several batches at LLM_TIMEOUT each could otherwise stack up to minutes.
// Whatever hasn't been rewritten by the deadline just keeps its original
// template text; nothing in the response is ever left blank.
const OVERALL_BUDGET_MS = 45_000;

const SYSTEM_PROMPT_EN = `You are an editor for an Indian Vedic astrology app. You are given short astrological descriptions generated from a real, already-computed birth chart (real planet/house/sign placements, real Mahadasha periods). Rewrite each one into natural, conversational, everyday English — the way a knowledgeable astrologer would explain it to an ordinary person, not an academic textbook or a dramatic fortune-telling ad.

Rules:
- Preserve the original astrological meaning exactly. Never invent planetary positions, doshas, yogas, or predictions not present in the input.
- Never add a claim the input doesn't make. Never flip a positive description into a negative one or vice versa. Never make a mild description sound dramatic.
- Keep it concise — similar length to the input, not longer.
- If an input is too short, garbled, or ambiguous to rewrite safely, set "needs_review": true for it and leave "rewritten" equal to the input text unchanged.
- Return ONLY a JSON object of the exact shape: {"items": [{"id": "<same id as input>", "rewritten": "<string>", "needs_review": <boolean>}]}. One entry per input item, same order, same "id".`;

const SYSTEM_PROMPT_HI = `आप एक भारतीय वैदिक ज्योतिष ऐप के संपादक हैं। आपको एक वास्तविक, पहले से गणना की गई जन्म कुंडली (वास्तविक ग्रह/भाव/राशि स्थिति, वास्तविक महादशा अवधि) से बने छोटे ज्योतिषीय विवरण दिए जाते हैं। हर विवरण को स्वाभाविक, रोज़मर्रा की बोलचाल की हिंदी में फिर से लिखें — जैसे एक जानकार ज्योतिषी किसी सामान्य व्यक्ति को समझा रहा हो, न कि कोई शास्त्रीय/संस्कृतनिष्ठ किताब या नाटकीय भविष्यवाणी विज्ञापन।

नियम:
- मूल ज्योतिषीय अर्थ को बिल्कुल सुरक्षित रखें। इनपुट में न दी गई कोई ग्रह स्थिति, दोष, योग या भविष्यवाणी कभी न जोड़ें।
- इनपुट में न हो ऐसा कोई दावा कभी न जोड़ें। सकारात्मक विवरण को नकारात्मक (या इसके उलट) कभी न बनाएं। किसी सामान्य विवरण को नाटकीय न बनाएं।
- अत्यधिक संस्कृतनिष्ठ शब्दावली, क्लिष्ट साहित्यिक भाषा और अंग्रेज़ी से रोबोटिक अनुवाद जैसी भाषा से बचें। भाषा औसत भारतीय उपयोगकर्ता के लिए आसानी से समझ में आनी चाहिए।
- संक्षिप्त रखें — इनपुट जितनी ही लंबाई में, उससे अधिक नहीं।
- यदि कोई इनपुट इतना छोटा, अस्पष्ट या उलझा हुआ है कि उसे सुरक्षित रूप से दोबारा नहीं लिखा जा सकता, तो उसके लिए "needs_review": true सेट करें और "rewritten" को इनपुट के टेक्स्ट जैसा ही अपरिवर्तित छोड़ दें।
- केवल इसी ठीक संरचना में एक JSON ऑब्जेक्ट लौटाएं: {"items": [{"id": "<इनपुट जैसा ही id>", "rewritten": "<string>", "needs_review": <boolean>}]}। हर इनपुट आइटम के लिए एक entry, वही क्रम, वही "id"।`;

// Exported for tests/kundliDescriptionRewriter.sanity.mjs — not used outside this file in production.
export const responseSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    rewritten: z.string().min(1),
    needs_review: z.boolean(),
  })),
});

interface Slot {
  key: string;
  text: string;
}

export function collectSlots(full: KundliFullResult): Slot[] {
  const slots: Slot[] = [
    { key: 'analysis.lagna', text: full.analysis.lagna },
    { key: 'analysis.moon', text: full.analysis.moon },
    ...full.analysis.planets.map((p, i) => ({ key: `analysis.planets.${i}`, text: p.text })),
    { key: 'ascendantPredictions.description', text: full.ascendantPredictions.description },
    ...full.dashaPredictions.map((d, i) => ({ key: `dashaPredictions.${i}`, text: d.text })),
    ...full.yogas.map((y, i) => ({ key: `yogas.${i}`, text: y.description })),
    { key: 'gemstones.life.reason', text: full.gemstones.life.reason },
    { key: 'gemstones.lucky.reason', text: full.gemstones.lucky.reason },
    { key: 'gemstones.fortune.reason', text: full.gemstones.fortune.reason },
    { key: 'rudraksha.howToWear', text: full.rudraksha.howToWear },
    { key: 'rudraksha.reason', text: full.rudraksha.reason },
  ];
  return slots.filter(s => s.text?.trim().length > 0);
}

export function applyRewrites(full: KundliFullResult, textByKey: Map<string, string>): KundliFullResult {
  const clone = structuredClone(full);
  const apply = (key: string, set: (text: string) => void) => {
    const text = textByKey.get(key);
    if (text) set(text);
  };
  apply('analysis.lagna', t => { clone.analysis.lagna = t; });
  apply('analysis.moon', t => { clone.analysis.moon = t; });
  clone.analysis.planets.forEach((p, i) => apply(`analysis.planets.${i}`, t => { p.text = t; }));
  apply('ascendantPredictions.description', t => { clone.ascendantPredictions.description = t; });
  clone.dashaPredictions.forEach((d, i) => apply(`dashaPredictions.${i}`, t => { d.text = t; }));
  clone.yogas.forEach((y, i) => apply(`yogas.${i}`, t => { y.description = t; }));
  apply('gemstones.life.reason', t => { clone.gemstones.life.reason = t; });
  apply('gemstones.lucky.reason', t => { clone.gemstones.lucky.reason = t; });
  apply('gemstones.fortune.reason', t => { clone.gemstones.fortune.reason = t; });
  apply('rudraksha.howToWear', t => { clone.rudraksha.howToWear = t; });
  apply('rudraksha.reason', t => { clone.rudraksha.reason = t; });
  return clone;
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Rewrites one batch of texts via the LLM. Returns a map of hash -> rewritten
// text for every item that came back valid; anything missing from the map
// (invalid JSON, a dropped item, total failure) keeps its original text at
// the call site — never thrown, never surfaced as an error to the user.
async function rewriteBatch(items: { hash: string; text: string }[], language: 'en' | 'hi'): Promise<Map<string, { text: string; needsReview: boolean; model: string }>> {
  const out = new Map<string, { text: string; needsReview: boolean; model: string }>();
  const payload = items.map((it, i) => ({ id: String(i), text: it.text }));
  const systemPrompt = language === 'hi' ? SYSTEM_PROMPT_HI : SYSTEM_PROMPT_EN;

  let parsed: z.infer<typeof responseSchema>;
  let model: string;
  try {
    const { content, model: usedModel } = await chatCompleteWithFallback([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ items: payload }) },
    ]);
    model = usedModel;
    parsed = responseSchema.parse(JSON.parse(content));
  } catch (e) {
    console.error('[kundliDescriptionRewriter] batch rewrite failed, keeping original text:', e instanceof Error ? e.message : e);
    return out; // empty — every item in this batch falls back to its original text
  }

  for (const result of parsed.items) {
    const index = Number(result.id);
    const source = items[index];
    if (!source) continue; // model returned an id we didn't send — ignore rather than trust it
    out.set(source.hash, {
      // A flagged item keeps the ORIGINAL text regardless of what the model
      // put in "rewritten" — needs_review means "don't trust this rewrite",
      // not "here's a draft to ship anyway".
      text: result.needs_review ? source.text : result.rewritten,
      needsReview: result.needs_review,
      model,
    });
  }
  return out;
}

// Fast path, called synchronously from the route: looks up whatever
// rewrites are ALREADY cached from a previous request and applies them —
// pure DB reads, no LLM call, so this never makes the user wait. A chart
// requested for the first time just renders with its original template text
// (never blank, never an error) until warmDescriptionCache below has had a
// chance to fill the cache in the background.
export async function rewriteKundliFull(full: KundliFullResult, language: 'en' | 'hi'): Promise<KundliFullResult> {
  if (!config.nvidia.apiKey) return full; // not configured — existing behavior, unchanged

  const slots = collectSlots(full);
  if (slots.length === 0) return full;

  try {
    const hashes = [...new Set(slots.map(s => hashText(s.text)))];
    const cached = await getCachedRewrites(hashes, language, PROMPT_VERSION);
    const cachedByHash = new Map(cached.map(c => [c.textHash, c.rewrittenText]));

    const textByKey = new Map<string, string>();
    for (const s of slots) {
      const rewritten = cachedByHash.get(hashText(s.text));
      if (rewritten) textByKey.set(s.key, rewritten);
    }
    return applyRewrites(full, textByKey);
  } catch (e) {
    console.error('[kundliDescriptionRewriter] cache lookup failed, serving original descriptions:', e instanceof Error ? e.message : e);
    return full;
  }
}

// Slow path — NOT awaited by the route. Calls the LLM for whatever isn't
// cached yet and writes the results to kundli_description_rewrites, so the
// NEXT request for this same chart (or any other chart sharing the same
// template sentence — the cache key is content, not birth details) gets it
// instantly via rewriteKundliFull above. A slow/unreliable NVIDIA endpoint
// only ever delays how soon the nicer text shows up, never the response.
export async function warmDescriptionCache(full: KundliFullResult, language: 'en' | 'hi'): Promise<void> {
  if (!config.nvidia.apiKey) return;

  const slots = collectSlots(full);
  if (slots.length === 0) return;

  try {
    const uniqueByHash = new Map<string, string>();
    for (const s of slots) uniqueByHash.set(hashText(s.text), s.text);

    const cached = await getCachedRewrites([...uniqueByHash.keys()], language, PROMPT_VERSION);
    const cachedHashes = new Set(cached.map(c => c.textHash));
    const misses = [...uniqueByHash.entries()].filter(([hash]) => !cachedHashes.has(hash)).map(([hash, text]) => ({ hash, text }));
    if (misses.length === 0) return;

    const toSave: DescriptionCacheWrite[] = [];
    const deadline = Date.now() + OVERALL_BUDGET_MS;
    for (const batch of chunk(misses, BATCH_SIZE)) {
      if (Date.now() >= deadline) break; // ran out of budget — remaining misses just stay uncached for now
      const results = await rewriteBatch(batch, language);
      for (const item of batch) {
        const result = results.get(item.hash);
        if (!result) continue;
        toSave.push({ textHash: item.hash, language, promptVersion: PROMPT_VERSION, originalText: item.text, rewrittenText: result.text, needsReview: result.needsReview, model: result.model });
      }
    }
    if (toSave.length > 0) await saveRewrites(toSave);
  } catch (e) {
    console.error('[kundliDescriptionRewriter] background cache warm failed:', e instanceof Error ? e.message : e);
  }
}
