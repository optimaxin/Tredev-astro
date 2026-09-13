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

export function checkYogas(kundli: Kundli, language: 'en' | 'hi' = 'en'): YogaResult[] {
  const moonHouse = houseOf(kundli, 'moon');
  const jupiterHouse = houseOf(kundli, 'jupiter');
  const marsHouse = houseOf(kundli, 'mars');
  const sunHouse = houseOf(kundli, 'sun');
  const mercuryHouse = houseOf(kundli, 'mercury');

  const kendraDistance = ((jupiterHouse - moonHouse + 12) % 12) + 1;

  if (language === 'hi') {
    return [
      {
        name: 'गजकेसरी योग',
        present: KENDRA_HOUSES.has(kendraDistance),
        description: 'यह तब बनता है जब गुरु, चन्द्र से केंद्र (पहले, चौथे, सातवें या दसवें भाव) में स्थित हो — पारंपरिक रूप से बुद्धि, प्रतिष्ठा और स्थिर सफलता से जुड़ा हुआ है।',
      },
      {
        name: 'चन्द्र-मंगल योग',
        present: moonHouse === marsHouse,
        description: 'यह तब बनता है जब चन्द्र और मंगल एक ही भाव में स्थित हों — पारंपरिक रूप से व्यावसायिक कुशलता और आर्थिक प्रेरणा से जुड़ा हुआ है।',
      },
      {
        name: 'बुधादित्य योग',
        present: sunHouse === mercuryHouse,
        description: 'यह तब बनता है जब सूर्य और बुध एक ही भाव में स्थित हों — पारंपरिक रूप से तीक्ष्ण बुद्धि और संप्रेषण कौशल से जुड़ा हुआ है।',
      },
    ];
  }

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
