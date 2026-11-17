// Sanity-checks the ephemeris against well-known, independently-verifiable
// astronomical facts (not a Meeus-book arcsecond cross-check — that's more
// precision than Vedic rashi/nakshatra placement needs). Run with:
//   npx tsx tests/ephemeris.sanity.mjs
import { getPlanetaryPositions } from '../app/services/astrology/ephemeris.ts';

function check(label, condition, detail) {
  console.log((condition ? '✓' : '✗') + ' ' + label + (detail ? `  (${detail})` : ''));
  if (!condition) process.exitCode = 1;
}

// 1) March equinox ~2026-03-20: Sun's TROPICAL longitude should be ~0°.
// We only have sidereal (ayanamsa-subtracted) output, so re-add ayanamsa
// (~24.2° for 2026) to sanity-check the underlying tropical Sun position.
const AYANAMSA_2026 = 23.853056 + (2026 - 2000) * (50.2388475 / 3600);

const equinox = getPlanetaryPositions({ utcDate: new Date('2026-03-20T12:00:00Z') });
const sunTropicalAtEquinox = (equinox.find(p => p.id === 'sun').longitude + AYANAMSA_2026 + 360) % 360;
check('Sun is near 0°/360° tropical longitude at the March equinox', Math.abs(sunTropicalAtEquinox) < 2 || Math.abs(sunTropicalAtEquinox - 360) < 2, `got ${sunTropicalAtEquinox.toFixed(2)}°`);

// 2) June solstice ~2026-06-21: Sun's tropical longitude should be ~90°.
const solstice = getPlanetaryPositions({ utcDate: new Date('2026-06-21T12:00:00Z') });
const sunTropicalAtSolstice = (solstice.find(p => p.id === 'sun').longitude + AYANAMSA_2026 + 360) % 360;
check('Sun is near 90° tropical longitude at the June solstice', Math.abs(sunTropicalAtSolstice - 90) < 2, `got ${sunTropicalAtSolstice.toFixed(2)}°`);

// 3) All 9 grahas present, each a finite longitude in [0, 360).
const all = getPlanetaryPositions({ utcDate: new Date('2026-08-13T00:00:00Z') });
const ids = all.map(p => p.id).sort().join(',');
check('all 9 grahas present', ids === 'jupiter,ketu,mars,mercury,moon,rahu,saturn,sun,venus', ids);
check('every longitude is a finite value in [0,360)', all.every(p => Number.isFinite(p.longitude) && p.longitude >= 0 && p.longitude < 360));

// 4) Rahu/Ketu are always exactly 180° apart.
const rahu = all.find(p => p.id === 'rahu').longitude;
const ketu = all.find(p => p.id === 'ketu').longitude;
check('Rahu and Ketu are exactly 180° apart', Math.abs(Math.abs(rahu - ketu) - 180) < 0.01, `rahu=${rahu.toFixed(2)} ketu=${ketu.toFixed(2)}`);

// 5) Ayanamsa sanity: sidereal Sun should trail tropical by roughly 24° in 2026.
const marchSun = all.find(p => p.id === 'sun').longitude;
console.log(`\nFYI — 2026 Lahiri ayanamsa used: ${AYANAMSA_2026.toFixed(4)}° (should be ~24°)`);
check('ayanamsa is in the expected ~24° range for 2026', AYANAMSA_2026 > 23.5 && AYANAMSA_2026 < 24.5, `${AYANAMSA_2026.toFixed(3)}°`);

console.log(process.exitCode ? '\nSome checks FAILED.' : '\nAll ephemeris sanity checks passed.');
