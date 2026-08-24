// A small set of classical Yogas (auspicious planetary combinations) that
// have a simple, widely-agreed geometric definition — conjunction or mutual
// Kendra (angular house) placement. This is deliberately not an exhaustive
// yoga library (there are dozens of far more situational ones); these three
// are common, well-defined, and safe to compute without disputed rules.
import type { Kundli } from './kundli.ts';

export interface YogaResult {
  name: string;
  present: boolean;
  description: string;
}

const KENDRA_HOUSES = new Set([1, 4, 7, 10]);

function houseOf(kundli: Kundli, planetId: string): number {
  return kundli.planets.find(p => p.id === planetId)!.house;
}

export function checkYogas(kundli: Kundli): YogaResult[] {
  const moonHouse = houseOf(kundli, 'moon');
  const jupiterHouse = houseOf(kundli, 'jupiter');
  const marsHouse = houseOf(kundli, 'mars');
  const sunHouse = houseOf(kundli, 'sun');
  const mercuryHouse = houseOf(kundli, 'mercury');

  const kendraDistance = ((jupiterHouse - moonHouse + 12) % 12) + 1;

  return [
    {
      name: 'Gajakesari Yoga',
      present: KENDRA_HOUSES.has(kendraDistance),
      description: 'Formed when Jupiter sits in a Kendra (1st, 4th, 7th or 10th house) counted from the Moon — traditionally associated with intelligence, reputation and steady success.',
    },
    {
      name: 'Chandra-Mangal Yoga',
      present: moonHouse === marsHouse,
      description: 'Formed when the Moon and Mars share the same house — traditionally associated with business acumen and financial drive.',
    },
    {
      name: 'Budhaditya Yoga',
      present: sunHouse === mercuryHouse,
      description: 'Formed when the Sun and Mercury share the same house — traditionally associated with sharp intellect and communication skill.',
    },
  ];
}
