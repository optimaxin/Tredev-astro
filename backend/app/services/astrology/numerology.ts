// Pythagorean numerology — pure arithmetic on a name and date of birth, no
// ephemeris involved at all. Master numbers (11, 22, 33) are a real,
// standard convention: they're deliberately NOT reduced further.
const MASTER_NUMBERS = new Set([11, 22, 33]);

function reduceToSingleDigit(n: number): number {
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n).split('').reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

// Standard Pythagorean letter-to-number mapping (1-9 repeating).
const LETTER_VALUES: Record<string, number> = {};
'abcdefghijklmnopqrstuvwxyz'.split('').forEach((letter, i) => {
  LETTER_VALUES[letter] = (i % 9) + 1;
});
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function sumLetters(name: string, filter: (letter: string) => boolean): number {
  return name
    .toLowerCase()
    .split('')
    .filter(ch => /[a-z]/.test(ch) && filter(ch))
    .reduce((sum, ch) => sum + LETTER_VALUES[ch], 0);
}

export interface NumerologyProfile {
  lifePathNumber: number;
  destinyNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
}

// Personal Year/Month/Day numbers — the standard numerology "horoscope"
// cycle, distinct from the fixed lifelong numbers above: Personal Year =
// reduce(birth day + birth month + the given year), Personal Month =
// reduce(Personal Year + the given month), Personal Day = reduce(Personal
// Month + the given day-of-month). Real arithmetic on the actual current
// date, not a canned per-number blurb.
export interface PersonalNumerologyCycle {
  personalYear: number;
  personalMonth: number;
  personalDay: number;
}

export function calculatePersonalCycle(dateOfBirth: Date, atDate: Date): PersonalNumerologyCycle {
  const personalYear = reduceToSingleDigit(dateOfBirth.getUTCDate() + (dateOfBirth.getUTCMonth() + 1) + atDate.getUTCFullYear());
  const personalMonth = reduceToSingleDigit(personalYear + (atDate.getUTCMonth() + 1));
  const personalDay = reduceToSingleDigit(personalMonth + atDate.getUTCDate());
  return { personalYear, personalMonth, personalDay };
}

export function calculateNumerology(dateOfBirth: Date, fullName: string): NumerologyProfile {
  const digitsOfDob = `${dateOfBirth.getUTCDate()}${dateOfBirth.getUTCMonth() + 1}${dateOfBirth.getUTCFullYear()}`
    .split('')
    .reduce((sum, d) => sum + Number(d), 0);

  return {
    lifePathNumber: reduceToSingleDigit(digitsOfDob),
    destinyNumber: reduceToSingleDigit(sumLetters(fullName, () => true)),
    soulUrgeNumber: reduceToSingleDigit(sumLetters(fullName, ch => VOWELS.has(ch))),
    personalityNumber: reduceToSingleDigit(sumLetters(fullName, ch => !VOWELS.has(ch))),
  };
}

// Numerology Match — a distinct compatibility tool, not just the single-person
// report run twice. Pythagorean numerology groups 1-9 into three triads by
// shared temperament (independent/intellectual, practical/material,
// creative/emotional); this is a widely-used simplified compatibility
// heuristic, not a precise or universally-agreed system — presented as such
// rather than a fabricated precision score.
const NUMBER_GROUPS = [[1, 5, 7], [2, 4, 8], [3, 6, 9]];
function groupOf(n: number): number {
  return NUMBER_GROUPS.findIndex(g => g.includes(n));
}

type Affinity = 'same' | 'grouped' | 'different';
function affinity(a: number, b: number): Affinity {
  if (a === b) return 'same';
  const ga = groupOf(a);
  return ga !== -1 && ga === groupOf(b) ? 'grouped' : 'different';
}
const AFFINITY_SCORE: Record<Affinity, number> = { same: 3, grouped: 2, different: 0 };

export interface NumerologyMatchResult {
  person1: NumerologyProfile;
  person2: NumerologyProfile;
  lifePathAffinity: Affinity;
  destinyAffinity: Affinity;
  soulUrgeAffinity: Affinity;
  compatibilityScore: number; // 0-9
}

export function calculateNumerologyMatch(
  person1: { dateOfBirth: Date; fullName: string },
  person2: { dateOfBirth: Date; fullName: string },
): NumerologyMatchResult {
  const p1 = calculateNumerology(person1.dateOfBirth, person1.fullName);
  const p2 = calculateNumerology(person2.dateOfBirth, person2.fullName);
  const lifePathAffinity = affinity(p1.lifePathNumber, p2.lifePathNumber);
  const destinyAffinity = affinity(p1.destinyNumber, p2.destinyNumber);
  const soulUrgeAffinity = affinity(p1.soulUrgeNumber, p2.soulUrgeNumber);

  return {
    person1: p1,
    person2: p2,
    lifePathAffinity,
    destinyAffinity,
    soulUrgeAffinity,
    compatibilityScore: AFFINITY_SCORE[lifePathAffinity] + AFFINITY_SCORE[destinyAffinity] + AFFINITY_SCORE[soulUrgeAffinity],
  };
}
