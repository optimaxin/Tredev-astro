// Chinese zodiac — a completely different, calendar-based system (12-year
// animal cycle x 5-element 10-year cycle), no ephemeris involved. Anchored
// on 2020 = Metal Rat and verified against a second well-known reference
// point (2024 = Wood Dragon) before trusting the formula.
const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const ELEMENTS_BY_YEAR_MOD10 = ['Metal', 'Metal', 'Water', 'Water', 'Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth']; // index = (year - 2020) mod 10, since 2020 is Metal

export interface ChineseZodiacResult {
  year: number;
  animal: string;
  element: string;
  label: string; // e.g. "Wood Dragon"
}

export function getChineseZodiac(year: number): ChineseZodiacResult {
  const animalIndex = (((year - 2020) % 12) + 12) % 12;
  const elementIndex = (((year - 2020) % 10) + 10) % 10;
  const animal = ANIMALS[animalIndex];
  const element = ELEMENTS_BY_YEAR_MOD10[elementIndex];
  return { year, animal, element, label: `${element} ${animal}` };
}
