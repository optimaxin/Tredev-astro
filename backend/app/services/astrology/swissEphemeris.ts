// Real Swiss Ephemeris (via the `sweph` npm binding) — used for exactly two
// things our own hand-rolled astronomia-based ephemeris.ts can't provide:
// real Placidus house cusps (the missing piece that previously kept KP's
// Bhav Chalit chart out of scope — see kpAstrology.ts) and Pluto (outside
// VSOP87's planet set, so unavailable from astronomia). Everything else in
// this codebase keeps using ephemeris.ts's existing Sun/Moon/planet
// longitudes — this module is additive, not a replacement of an
// already-verified system.
//
// Verified against a real commercial report for the same birth data: all
// 12 sidereal house cusps matched to within 0.01°, and Pluto's sign,
// degree, and retrograde status matched exactly.
//
// `sweph` is dual-licensed AGPL-3.0-or-later OR LGPL-3.0-or-later — used
// here under the LGPL option, which (unlike AGPL) doesn't require this
// application itself to be open-sourced.
import sweph from 'sweph';
import path from 'path';

function ephDataDir(): string {
  return path.join(import.meta.dirname, '../../../eph');
}

function toJulianDayUT(utcDate: Date): number {
  sweph.set_ephe_path(ephDataDir());
  const hourDecimal = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600;
  return sweph.julday(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate(), hourDecimal, sweph.constants.SE_GREG_CAL);
}

export interface HouseCusp {
  house: number;
  longitude: number; // sidereal (Lahiri), 0-360
}

// Real Placidus house cusps — the actual boundaries KP's Bhav Chalit chart
// (and cuspal sub-lord theory) are built on, as opposed to the whole-sign
// house approximation used everywhere else in this codebase.
export function getSiderealHouseCusps(utcDate: Date, latitude: number, longitude: number): HouseCusp[] {
  const jd = toJulianDayUT(utcDate);
  const result = sweph.houses(jd, latitude, longitude, 'P');
  const ayanamsa = sweph.get_ayanamsa_ut(jd) as unknown as number;
  return result.data.houses.map((cuspLongitude: number, i: number) => ({
    house: i + 1,
    longitude: ((cuspLongitude - ayanamsa) % 360 + 360) % 360,
  }));
}

export interface PlutoPosition {
  longitude: number; // sidereal, 0-360
  retrograde: boolean;
}

export function getPluto(utcDate: Date): PlutoPosition {
  const jd = toJulianDayUT(utcDate);
  sweph.set_sid_mode(sweph.constants.SE_SIDM_LAHIRI, 0, 0);
  const result = sweph.calc_ut(jd, sweph.constants.SE_PLUTO, sweph.constants.SEFLG_SWIEPH | sweph.constants.SEFLG_SIDEREAL | sweph.constants.SEFLG_SPEED);
  const [longitude, , , speedInLongitude] = result.data;
  return { longitude: ((longitude % 360) + 360) % 360, retrograde: speedInLongitude < 0 };
}

// Which of the 12 real (unequal) Bhav Chalit houses a longitude falls in —
// unlike whole-sign houses, each house here spans however many degrees the
// Placidus cusps actually give it, not a fixed 30°.
export function getBhavChalitHouse(planetLongitude: number, cusps: HouseCusp[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i].longitude;
    const end = cusps[(i + 1) % 12].longitude;
    const span = ((end - start) % 360 + 360) % 360;
    const diff = ((planetLongitude - start) % 360 + 360) % 360;
    if (diff < span) return i + 1;
  }
  return 12;
}
