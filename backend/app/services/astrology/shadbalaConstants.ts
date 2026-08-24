// Classical constant tables for Shadbala/Bhavbala (Brihat Parashara Hora
// Shastra), ported from the open-source `jyotishganit` library
// (northtara/jyotishganit, MIT — the same reference already cross-checked
// for divisional charts and Ashtakavarga elsewhere in this codebase).
// Shadbala classically applies only to the 7 traditional grahas — not
// Rahu/Ketu, and not the modern outer planets — matching NAISARGIKA_VALUES.
export type ShadPlanet = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn';

export const SHAD_PLANETS: ShadPlanet[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

export const NAISARGIKA_VALUES: Record<ShadPlanet, number> = {
  sun: 60.0, moon: 51.43, venus: 42.86, jupiter: 34.29, mercury: 25.71, mars: 17.14, saturn: 8.57,
};

// Absolute exaltation longitude (0-360°) per graha — debilitation is always 180° away.
export const EXALTATION_DEGREES: Record<ShadPlanet, number> = {
  sun: 10.0, moon: 33.0, mars: 298.0, mercury: 165.0, jupiter: 95.0, venus: 357.0, saturn: 200.0,
};

// Moolatrikona and own-sign membership — sign-only (no degree sub-range),
// matching the actual scoring rule used for Saptavargaja Bala.
export const MOOLATRIKONA_SIGN: Record<ShadPlanet, number> = {
  sun: 4, moon: 3, mars: 0, mercury: 5, jupiter: 8, venus: 1, saturn: 9, // Leo, Cancer, Aries, Virgo, Sagittarius, Taurus, Capricorn
};
export const OWN_SIGNS: Record<ShadPlanet, number[]> = {
  sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5], jupiter: [8, 11], venus: [1, 6], saturn: [9, 10],
};

export const NATURAL_BENEFIC_SHADBALA: ShadPlanet[] = ['jupiter', 'venus', 'moon'];
export const NATURAL_MALEFIC_SHADBALA: ShadPlanet[] = ['sun', 'mars', 'saturn']; // Mercury is neuter, excluded

export const MALE_PLANETS_SHADBALA: ShadPlanet[] = ['sun', 'mars', 'mercury', 'jupiter', 'saturn'];
export const FEMALE_PLANETS_SHADBALA: ShadPlanet[] = ['moon', 'venus'];

// Drekkana Bala: 1st decanate (0-10°) favors masculine grahas, 2nd (10-20°)
// neutral, 3rd (20-30°) feminine.
export const DECANATE_GENDER_GROUPS: ShadPlanet[][] = [
  ['sun', 'mars', 'jupiter'],
  ['mercury', 'saturn'],
  ['moon', 'venus'],
];
export const PLANET_GENDER: Record<ShadPlanet, 0 | 1 | 2> = {
  sun: 0, mars: 0, jupiter: 0, mercury: 1, saturn: 1, moon: 2, venus: 2,
};

export const DIGBALA_STRONG_HOUSE: Record<ShadPlanet, number> = {
  sun: 10, moon: 4, mars: 10, mercury: 1, jupiter: 1, venus: 4, saturn: 7,
};

export const KENDRA_BALA_BY_HOUSE: Record<number, number> = {
  1: 60, 4: 60, 7: 60, 10: 60, 2: 30, 5: 30, 8: 30, 11: 30, 3: 15, 6: 15, 9: 15, 12: 15,
};

export const TRIBHAGA_DAY_LORDS: ShadPlanet[] = ['sun', 'mercury', 'saturn'];
export const TRIBHAGA_NIGHT_LORDS = ['moon', 'venus', 'mars'] as const;

export const WEEKDAY_LORDS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'] as const; // 0=Sunday..6=Saturday
// Chaldean planetary-hour order, read starting from Sunday's own lord (Sun):
// Sun -> Venus -> Mercury -> Moon -> Saturn -> Jupiter -> Mars -> repeat.
export const PLANETARY_HOUR_SEQUENCE = [0, 5, 3, 1, 6, 4, 2];

export const YUDDHABALA_PLANETS: ShadPlanet[] = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
export const PLANET_DIAMETER: Partial<Record<ShadPlanet, number>> = { mars: 1.5, mercury: 1.0, jupiter: 3.5, venus: 1.6, saturn: 3.0 };

export const MARS_SPECIAL_ASPECTS = [90, 210];
export const JUPITER_SPECIAL_ASPECTS = [120, 240];
export const SATURN_SPECIAL_ASPECTS = [60, 270];
export const SPECIAL_ASPECT_ORB = 15.0;
export const FULL_ASPECT_STRENGTH = 60.0;

// Bhava (house) Dig Bala — animal-nature classification per sign, with
// Sagittarius/Capricorn split at their midpoint (dual-natured signs).
export type SignNature = 'nara' | 'jalachara' | 'chatuspadha' | 'keeta';
export const BHAVA_STRENGTH_BY_NATURE: Record<SignNature, number[]> = {
  nara: [60, 50, 40, 30, 20, 10, 0, 10, 20, 30, 40, 50],
  jalachara: [30, 40, 50, 60, 50, 40, 30, 20, 10, 0, 10, 20],
  chatuspadha: [30, 20, 10, 0, 10, 20, 30, 40, 50, 60, 50, 40],
  keeta: [0, 10, 20, 30, 40, 50, 60, 50, 40, 30, 20, 10],
};
const SIGN_NATURE_BY_INDEX: SignNature[] = ['chatuspadha', 'chatuspadha', 'nara', 'jalachara', 'chatuspadha', 'nara', 'nara', 'keeta', 'nara', 'chatuspadha', 'nara', 'jalachara'];
export function signNature(signIndex: number, degreeInSign: number): SignNature {
  if (signIndex === 8) return degreeInSign < 15 ? 'nara' : 'chatuspadha'; // Sagittarius
  if (signIndex === 9) return degreeInSign < 15 ? 'chatuspadha' : 'jalachara'; // Capricorn
  return SIGN_NATURE_BY_INDEX[signIndex];
}

// Mean daily motion (deg/day) and J2000 tropical mean longitude, used only
// as the Cheshta Bala fallback — a coarse retrograde/motion-strength proxy,
// not a precision ephemeris (the ayanamsa cancels out of the Kendra this
// feeds, so tropical-vs-sidereal framing doesn't matter here — see shadbala.ts).
export const PLANET_MEAN_MOTION: Partial<Record<ShadPlanet, number>> = { mars: 0.524, mercury: 4.0923, jupiter: 0.0831, venus: 1.6021, saturn: 0.0334 };
export const PLANET_EPOCH_LONGITUDE: Partial<Record<ShadPlanet, number>> = { mercury: 252.25, venus: 181.98, mars: 355.45, jupiter: 34.35, saturn: 49.95 };

export const RUPA_SCALING = 60.0;

// Minimum required Shadbala (Rupas) for a planet to be considered
// classically "strong" — standard published BPHS thresholds.
export const MIN_REQUIRED_RUPAS: Record<ShadPlanet, number> = {
  sun: 6.5, moon: 6.0, mars: 5.0, mercury: 7.0, jupiter: 6.5, venus: 5.5, saturn: 5.0,
};
