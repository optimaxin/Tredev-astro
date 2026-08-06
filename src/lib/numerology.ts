// Classical Pythagorean numerology. Deterministic, no external data needed.

const LETTER_VALUES: Record<string, number> = {};
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letter, i) => {
  LETTER_VALUES[letter] = (i % 9) + 1;
});
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

const MASTER_NUMBERS = new Set([11, 22, 33]);

function reduceNumber(n: number): number {
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n)
      .split("")
      .reduce((sum, d) => sum + Number(d), 0);
  }
  return n;
}

function sumLetters(name: string, filter: (letter: string) => boolean): number {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, "").split("");
  const total = letters.filter(filter).reduce((sum, l) => sum + (LETTER_VALUES[l] ?? 0), 0);
  return reduceNumber(total);
}

export type NumerologyResult = {
  lifePath: number;
  destiny: number;
  soulUrge: number;
  personality: number;
};

export function calculateNumerology(name: string, dob: string): NumerologyResult {
  const digits = dob.replace(/[^0-9]/g, "");
  const dobSum = digits.split("").reduce((sum, d) => sum + Number(d), 0);

  return {
    lifePath: reduceNumber(dobSum),
    destiny: sumLetters(name, () => true),
    soulUrge: sumLetters(name, (l) => VOWELS.has(l)),
    personality: sumLetters(name, (l) => !VOWELS.has(l)),
  };
}

export const NUMEROLOGY_MEANINGS: Record<number, string> = {
  1: "Leadership, independence, and pioneering drive.",
  2: "Diplomacy, partnership, and sensitivity to others.",
  3: "Creativity, self-expression, and communication.",
  4: "Discipline, structure, and steady hard work.",
  5: "Freedom, adaptability, and love of change.",
  6: "Responsibility, nurturing, and harmony at home.",
  7: "Introspection, analysis, and a search for deeper truth.",
  8: "Ambition, authority, and material accomplishment.",
  9: "Compassion, idealism, and humanitarian outlook.",
  11: "Master number — intuition and spiritual insight.",
  22: "Master number — the master builder, turning big visions into reality.",
  33: "Master number — the master teacher, healing through selfless service.",
};
