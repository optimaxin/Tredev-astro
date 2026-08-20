import { calculateGunMilan } from '../app/services/astrology/gunMilan.ts';

function check(label, condition, detail) {
  console.log((condition ? '✓' : '✗') + ' ' + label + (detail ? `  (${detail})` : ''));
  if (!condition) process.exitCode = 1;
}

// Same person "matched with themselves": several kootas should behave in a
// specific, classically-correct way — NOT simply "all maxed out". Same
// Nadi is the textbook Nadi Dosha (0/8), which is *supposed* to trigger
// here, since both charts share every placement including Nadi group.
const selfMatch = calculateGunMilan(45, 45); // same longitude both sides
const nadi = selfMatch.kootas.find(k => k.name === 'Nadi');
check('identical charts trigger Nadi Dosha (0 points) — this is correct, not a bug', nadi.points === 0, `got ${nadi.points}`);
const yoni = selfMatch.kootas.find(k => k.name === 'Yoni');
check('identical charts get a perfect Yoni score (same yoni)', yoni.points === 4, `got ${yoni.points}`);
const varna = selfMatch.kootas.find(k => k.name === 'Varna');
check('identical charts get a perfect Varna score (same varna)', varna.points === 1, `got ${varna.points}`);

// Bounds: every koota's score must sit within its own declared max, and the
// total must never exceed 36 — across a spread of real longitude pairs.
const samplePairs = [
  [10, 200], [95, 340], [0, 359], [123.4, 45.6], [270, 15], [200, 210],
];
let allWithinBounds = true;
for (const [a, b] of samplePairs) {
  const result = calculateGunMilan(a, b);
  for (const k of result.kootas) {
    if (k.points < 0 || k.points > k.maxPoints) allWithinBounds = false;
  }
  if (result.totalPoints < 0 || result.totalPoints > 36) allWithinBounds = false;
}
check('every koota score stays within [0, its max] and totals stay within [0, 36] across sample pairs', allWithinBounds);

// Total must equal the sum of the 8 individual koota scores (no silent drift).
const sample = calculateGunMilan(88, 210);
const sum = sample.kootas.reduce((s, k) => s + k.points, 0);
check('total equals the sum of the 8 kootas', Math.abs(sample.totalPoints - sum) < 1e-9, `total=${sample.totalPoints} sum=${sum}`);

console.log(process.exitCode ? '\nSome checks FAILED.' : '\nAll Guna Milan sanity checks passed.');
