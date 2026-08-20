import { getAscendant } from '../app/services/astrology/ephemeris.ts';

function check(label, condition, detail) {
  console.log((condition ? '✓' : '✗') + ' ' + label + (detail ? `  (${detail})` : ''));
  if (!condition) process.exitCode = 1;
}

// New Delhi, one fixed date, sampled every 6 hours — the ascendant should
// sweep through roughly a full 360° cycle in 24h (it's driven by Earth's
// rotation, ~1°/4min), confirming the formula responds correctly to time.
const lat = 28.6139, lon = 77.2090;
const day = '2026-08-13T';
const times = ['00:00:00Z', '06:00:00Z', '12:00:00Z', '18:00:00Z'];
const values = times.map(t => getAscendant(new Date(day + t), lat, lon));
console.log('Ascendant at 6h steps (New Delhi):', values.map(v => v.toFixed(1)));

check('all ascendant values are finite and in [0,360)', values.every(v => Number.isFinite(v) && v >= 0 && v < 360));

// Sum of the 4 forward gaps (wrapping through 360) should be close to 360°
// once around the clock — this is the real invariant, robust to exactly
// which sign is rising when.
let totalMotion = 0;
for (let i = 0; i < 4; i++) {
  const a = values[i], b = values[(i + 1) % 4];
  totalMotion += ((b - a) + 360) % 360;
}
check('ascendant completes ~1 full rotation over 24h', Math.abs(totalMotion - 360) < 15, `total forward motion = ${totalMotion.toFixed(1)}°`);

// Changing latitude at a fixed instant should change the ascendant
// (oblique ascension) — same moment, equator vs New Delhi's latitude.
const sameInstant = new Date('2026-08-13T06:00:00Z');
const ascEquator = getAscendant(sameInstant, 0, lon);
const ascDelhi = getAscendant(sameInstant, lat, lon);
check('latitude measurably affects the ascendant', Math.abs(ascEquator - ascDelhi) > 0.5, `equator=${ascEquator.toFixed(2)} delhi=${ascDelhi.toFixed(2)}`);

console.log(process.exitCode ? '\nSome checks FAILED.' : '\nAll ascendant sanity checks passed.');
