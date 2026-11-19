import assert from 'node:assert/strict';
import { buildKundliFull } from '../app/services/astrology/kundliFullBuilder.ts';
import { rewriteKundliFull, collectSlots, applyRewrites, responseSchema } from '../app/services/llm/kundliDescriptionRewriter.ts';

function check(label, condition, detail) {
  console.log((condition ? '✓' : '✗') + ' ' + label + (detail ? `  (${detail})` : ''));
  if (!condition) process.exitCode = 1;
}

const birth = { date: '1995-06-15', time: '08:30', timezoneOffsetMinutes: 330, latitude: 28.6139, longitude: 77.2090 };
const full = buildKundliFull(birth, 'en');

// Force the unconfigured path regardless of whether .env has a real key —
// must be a true no-op, not an error.
const realKey = process.env.NVIDIA_API_KEY;
delete process.env.NVIDIA_API_KEY;
const { config } = await import('../app/core/config.ts');
config.nvidia.apiKey = undefined;
const unchanged = await rewriteKundliFull(full, 'en');
check('rewriteKundliFull no-ops (returns original) when NVIDIA_API_KEY is unset', unchanged === full);
if (realKey) config.nvidia.apiKey = realKey;

// collectSlots / applyRewrites round-trip — the part that doesn't touch the network.
const slots = collectSlots(full);
check('collectSlots finds a non-trivial number of description strings', slots.length >= 10, `found ${slots.length}`);
check('every collected slot has non-empty text', slots.every(s => typeof s.text === 'string' && s.text.trim().length > 0));

const textByKey = new Map(slots.map(s => [s.key, `REWRITTEN: ${s.text}`]));
const rewritten = applyRewrites(full, textByKey);
check('applyRewrites does not mutate the original object', full.analysis.lagna === unchanged.analysis.lagna && !full.analysis.lagna.startsWith('REWRITTEN:'));
check('applyRewrites substitutes every collected slot', collectSlots(rewritten).every(s => s.text.startsWith('REWRITTEN:')));
check('a slot left out of textByKey keeps its original text (safe-fallback shape)', applyRewrites(full, new Map()).analysis.lagna === full.analysis.lagna);

// Response schema — the contract the LLM's JSON reply must satisfy.
const valid = responseSchema.safeParse({ items: [{ id: '0', rewritten: 'Some text.', needs_review: false }] });
check('responseSchema accepts a well-formed reply', valid.success);
const invalid = responseSchema.safeParse({ items: [{ id: '0', rewritten: '', needs_review: false }] });
check('responseSchema rejects an empty rewritten string', !invalid.success);
const malformed = responseSchema.safeParse({ items: 'not an array' });
check('responseSchema rejects a malformed reply', !malformed.success);
