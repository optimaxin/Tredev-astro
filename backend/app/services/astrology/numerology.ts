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
