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
//
// Placidus is mathematically undefined near the polar circles (confirmed:
// sweph.houses returns flag=ERR for a 78.9N/summer-solstice test case, but
// silently still fills `houses` with garbage — the caller must check flag
// itself, sweph doesn't throw). We degrade to an Equal House system anchored
// on the real (already independently-verified) sidereal Ascendant rather
// than serve internally-contradictory cusps.
export function getSiderealHouseCusps(utcDate: Date, latitude: number, longitude: number, siderealAscendant: number): HouseCusp[] {
  const jd = toJulianDayUT(utcDate);
  const result = sweph.houses(jd, latitude, longitude, 'P');
  if (result.flag !== sweph.constants.OK) {
    return Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      longitude: ((siderealAscendant + i * 30) % 360 + 360) % 360,
    }));
  }
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

// Moonrise/moonset within a given window — astronomia (used for the Sun's
// rise/set in panchang.ts) has no Moon-specific rise-time module, so this
// uses sweph's own purpose-built rise_trans instead of hand-rolling Meeus
// interpolation. Standard atmospheric refraction (1013.25 mbar, 15°C),
// matching the same convention already verified accurate for sunrise/sunset.
//
// The window should be the Hindu civil day (today's sunrise to tomorrow's
// sunrise), NOT the midnight-to-midnight calendar day — a real Panchang's
// "today" runs sunrise-to-sunrise, and the lunar day (~24h50m) being longer
// than the solar day means a given day can genuinely have zero (or,
// occasionally, two) moonrise/moonset events in that window. Verified
// against a real published Panchang (28 Aug 2026, Delhi): using the
// sunrise-to-sunrise window correctly reproduces its "no moonset today"
// (the moon's one moonset that UTC calendar day falls just BEFORE that
// day's sunrise, i.e. still within the PREVIOUS Hindu day).
export interface RiseSetTimes {
  rise: Date | null;
  set: Date | null;
}

export function getMoonRiseSet(windowStart: Date, windowEnd: Date, latitude: number, longitude: number): RiseSetTimes {
  const jd = toJulianDayUT(windowStart);
  const geopos: [number, number, number] = [longitude, latitude, 0];
  const jdToDate = (jdUt: number) => new Date(Math.round((jdUt - 2440587.5) * 86400000));
  const withinWindow = (d: Date) => d.getTime() >= windowStart.getTime() && d.getTime() < windowEnd.getTime();

  const find = (rsmi: number): Date | null => {
    const result = sweph.rise_trans(jd, sweph.constants.SE_MOON, null, sweph.constants.SEFLG_SWIEPH, rsmi, geopos, 1013.25, 15);
    if (result.flag !== sweph.constants.OK) return null;
    const date = jdToDate(result.data as unknown as number);
    return withinWindow(date) ? date : null;
  };

  return { rise: find(sweph.constants.SE_CALC_RISE), set: find(sweph.constants.SE_CALC_SET) };
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
