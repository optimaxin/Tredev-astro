// Avakhada Chakra — the classical set of birth-Nakshatra/Rashi-derived
// attributes (Varna, Vashya, Yoni, Gana, Nadi, Paya, Tatva) shown in every
// commercial Vedic report. All groupings reuse the exact same tables already
// verified in gunMilan.ts for Ashtakoot matching — Yoni/Gana/Nadi/Varna/
// Vashya are the same classical Nakshatra/Rashi groupings either way, so
// there is no separate "Avakhada version" to get wrong independently.
// Gemstone recommendation is the one other classical, non-disputed rule
// safe to compute without a full disputed remedial system: the Ascendant
// lord's own gemstone (Ratna Shastra) — Rudraksha is left out, since the
// nakshatra-to-rudraksha mapping isn't consistently published across
// sources and isn't worth guessing at.
import type { Kundli } from './kundli.ts';
import { getNakshatra, getRashi, RASHIS } from './zodiac.ts';
import { VARNA_CLASS, VASHYA_GROUP, YONI_ANIMAL, GANA_GROUP, NADI_GROUP, RASHI_LORD } from './gunMilan.ts';

const VARNA_NAMES = ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra'];
const VASHYA_NAMES = ['Manav (Human)', 'Vanachar (Wild)', 'Chatushpad (Quadruped)', 'Jalachar (Aquatic)', 'Keeta (Insect)'];
const YONI_NAMES = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
const GANA_NAMES = ['Deva', 'Manushya', 'Rakshasa'];
const NADI_NAMES = ['Aadi', 'Madhya', 'Antya'];
const TATVA_BY_RASHI = ['Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water'];

// Paya: Gold/Silver/Copper/Iron by which of 4 house-groups the natal Moon
// falls in, counted from the Ascendant (1,6,11 = Gold; 2,5,9 = Silver;
// 3,7,10 = Copper; 4,8,12 = Iron) — a standard, closed-form Paya rule.
const PAYA_NAMES = ['Swarna (Gold)', 'Rajat (Silver)', 'Tamra (Copper)', 'Loha (Iron)'];
const PAYA_HOUSE_GROUP: Record<number, number> = { 1: 0, 6: 0, 11: 0, 2: 1, 5: 1, 9: 1, 3: 2, 7: 2, 10: 2, 4: 3, 8: 3, 12: 3 };

const GEMSTONE_BY_PLANET: Record<string, { name: string; sanskritName: string }> = {
  sun: { name: 'Ruby', sanskritName: 'Manik' },
  moon: { name: 'Pearl', sanskritName: 'Moti' },
  mars: { name: 'Red Coral', sanskritName: 'Moonga' },
  mercury: { name: 'Emerald', sanskritName: 'Panna' },
  jupiter: { name: 'Yellow Sapphire', sanskritName: 'Pukhraj' },
  venus: { name: 'Diamond', sanskritName: 'Heera' },
  saturn: { name: 'Blue Sapphire', sanskritName: 'Neelam' },
};

export interface AvakhadaResult {
  varna: string;
  vashya: string;
  yoni: string;
  gana: string;
  nadi: string;
  paya: string;
  tatva: string;
  signLord: string;
  nakshatraLord: string;
  pada: number;
}

export interface GemstoneResult {
  rulingPlanet: string;
  gemstone: string;
  sanskritName: string;
  reason: string;
}

export function buildAvakhada(kundli: Kundli): AvakhadaResult {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const rashi = getRashi(moon.longitude);
  const nakshatra = getNakshatra(moon.longitude);

  return {
    varna: VARNA_NAMES[VARNA_CLASS[rashi.index]],
    vashya: VASHYA_NAMES[VASHYA_GROUP[rashi.index]],
    yoni: YONI_NAMES[YONI_ANIMAL[nakshatra.index]],
    gana: GANA_NAMES[GANA_GROUP[nakshatra.index] ?? 2],
    nadi: NADI_NAMES[NADI_GROUP[nakshatra.index] ?? 2],
    paya: PAYA_NAMES[PAYA_HOUSE_GROUP[moon.house]],
    tatva: TATVA_BY_RASHI[rashi.index],
    signLord: RASHI_LORD[rashi.index],
    nakshatraLord: nakshatra.lord,
    pada: nakshatra.pada,
  };
}

export function recommendGemstone(kundli: Kundli): GemstoneResult {
  const ascendantIndex = RASHIS.indexOf(kundli.ascendant.rashi as (typeof RASHIS)[number]);
  const rulingPlanet = RASHI_LORD[ascendantIndex];
  const gem = GEMSTONE_BY_PLANET[rulingPlanet];
  return {
    rulingPlanet,
    gemstone: gem.name,
    sanskritName: gem.sanskritName,
    reason: `${cap(rulingPlanet)} rules your Ascendant (${kundli.ascendant.rashi}) — in classical Ratna Shastra, wearing its gemstone is said to strengthen the planet governing your overall vitality and personality.`,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
