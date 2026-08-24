// Avakhada Chakra — the classical set of birth-Nakshatra/Rashi-derived
// attributes (Varna, Vashya, Yoni, Gana, Nadi, Paya, Tatva) shown in every
// commercial Vedic report. All groupings reuse the exact same tables already
// verified in gunMilan.ts for Ashtakoot matching — Yoni/Gana/Nadi/Varna/
// Vashya are the same classical Nakshatra/Rashi groupings either way, so
// there is no separate "Avakhada version" to get wrong independently.
//
// Gemstones: three classical, non-disputed picks — Life stone (Ascendant
// lord), Lucky stone (5th house/Purva Punya lord), Fortune stone (9th house
// lord) — each with its standard Navagraha beej mantra and metal/finger,
// cross-checked against the same well-published pattern (Sun/Jupiter/Mars
// mantra and Sun/Jupiter wear examples matched a commercial reference
// report exactly).
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

interface GemstoneInfo { name: string; sanskritName: string; metal: string; finger: string; mantra: string; color: string; }
const GEMSTONE_BY_PLANET: Record<string, GemstoneInfo> = {
  sun: { name: 'Ruby', sanskritName: 'Manik', metal: 'Gold', finger: 'Ring finger', mantra: 'Om Hraam Hreem Hraum Sah Suryaya Namah', color: '#d1373f' },
  moon: { name: 'Pearl', sanskritName: 'Moti', metal: 'Silver', finger: 'Little finger', mantra: 'Om Shraam Shreem Shraum Sah Chandraya Namah', color: '#f2f0e6' },
  mars: { name: 'Red Coral', sanskritName: 'Moonga', metal: 'Gold or Copper', finger: 'Ring finger', mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', color: '#e8583a' },
  mercury: { name: 'Emerald', sanskritName: 'Panna', metal: 'Gold or Silver', finger: 'Little finger', mantra: 'Om Braam Breem Braum Sah Budhaya Namah', color: '#3fa06a' },
  jupiter: { name: 'Yellow Sapphire', sanskritName: 'Pukhraj', metal: 'Gold', finger: 'Index finger', mantra: 'Om Graam Greem Graum Sah Gurave Namah', color: '#e8c547' },
  venus: { name: 'Diamond', sanskritName: 'Heera', metal: 'Silver or Platinum', finger: 'Middle finger', mantra: 'Om Draam Dreem Draum Sah Shukraya Namah', color: '#eef3f7' },
  saturn: { name: 'Blue Sapphire', sanskritName: 'Neelam', metal: 'Silver or Panchdhatu', finger: 'Middle finger', mantra: 'Om Praam Preem Praum Sah Shanaye Namah', color: '#2e4d8f' },
};

interface RudrakshaInfo { deity: string; benefits: string[]; }
const RUDRAKSHA_BY_MUKHI: Record<number, RudrakshaInfo> = {
  1: { deity: 'Shiva', benefits: ['Represents pure consciousness and is said to remove the fear of death.', 'Helps the wearer stay focused and clear-headed in decision-making.', 'Traditionally associated with spiritual leadership and self-realization.'] },
  2: { deity: 'Ardhanarishvara', benefits: ['Said to bring emotional balance and harmony between the wearer and their partner.', 'Believed to strengthen bonds in close relationships and family life.', 'Associated with unity of complementary energies (Shiva-Shakti).'] },
  3: { deity: 'Agni', benefits: ['Said to burn away past sins and negative karma.', 'Traditionally used to boost willpower, confidence, and physical vitality.', 'Believed to help overcome guilt or inferiority complexes.'] },
  4: { deity: 'Brahma', benefits: ['Associated with creativity, knowledge, and improved communication skills.', 'Said to sharpen memory and support students and writers.', 'Traditionally worn to invoke Brahma\'s blessing of wisdom.'] },
  5: { deity: 'Rudra', benefits: ['The most common and versatile Rudraksha, suited to daily wear by most people.', 'Said to bring peace of mind, good health, and steady prosperity.', 'Believed to balance the five elements within the body.'] },
  6: { deity: 'Kartikeya', benefits: ['Said to bestow courage, fearlessness, and a strong personality.', 'Traditionally used to ease emotional trauma and heartbreak.', 'Believed to reduce the malefic effects of Venus and support romantic harmony.'] },
  7: { deity: 'Mahalakshmi', benefits: ['Associated with wealth, abundance, and removing obstacles to prosperity.', 'Traditionally worn to ease the effects of a difficult Saturn (Shani), including Sade Sati.', 'Said to bring stability to career and financial matters.'] },
  8: { deity: 'Ganesha', benefits: ['Said to remove obstacles and bring clarity before starting new ventures.', 'Traditionally used to counter the unpredictable effects of Rahu.', 'Believed to support sound decision-making under pressure.'] },
  9: { deity: 'Durga', benefits: ['Associated with courage, protection, and inner strength.', 'Traditionally used to counter the detachment and confusion associated with Ketu.', 'Said to awaken intuition and spiritual energy.'] },
};
// Rudraksha-by-planet — the one part of Rudraksha classification that is
// consistent across sources (unlike nakshatra-specific tables, which vary).
const RUDRAKSHA_MUKHI_BY_PLANET: Record<string, number> = {
  sun: 1, moon: 2, mars: 3, mercury: 4, jupiter: 5, venus: 6, saturn: 7, rahu: 8, ketu: 9,
};
const RUDRAKSHA_PRECAUTIONS = [
  'Wash the bead with Gangajal (or clean water) before wearing it for the first time.',
  'Keep it discreet rather than flaunting it, and avoid handing a worn bead to someone else.',
  'If the bead breaks, dispose of it respectfully rather than continuing to wear it.',
  'Avoid wearing it to a funeral or while consuming alcohol or non-vegetarian food, per tradition.',
  'Remove it before sleeping and keep it near your place of worship.',
];

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
  purpose: 'Life Stone' | 'Lucky Stone' | 'Fortune Stone';
  rulingPlanet: string;
  gemstone: string;
  sanskritName: string;
  metal: string;
  finger: string;
  mantra: string;
  color: string;
  reason: string;
}

export interface GemstoneRecommendations {
  life: GemstoneResult;
  lucky: GemstoneResult;
  fortune: GemstoneResult;
}

export interface RudrakshaResult {
  rulingPlanet: string;
  mukhi: number;
  deity: string;
  benefits: string[];
  howToWear: string;
  precautions: string[];
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

function gemstoneFor(purpose: GemstoneResult['purpose'], rulingPlanet: string, reason: string): GemstoneResult {
  const gem = GEMSTONE_BY_PLANET[rulingPlanet];
  return { purpose, rulingPlanet, gemstone: gem.name, sanskritName: gem.sanskritName, metal: gem.metal, finger: gem.finger, mantra: gem.mantra, color: gem.color, reason };
}

export function recommendGemstones(kundli: Kundli): GemstoneRecommendations {
  const ascendantIndex = RASHIS.indexOf(kundli.ascendant.rashi as (typeof RASHIS)[number]);
  const lifeLord = RASHI_LORD[ascendantIndex];
  const luckyLord = RASHI_LORD[(ascendantIndex + 4) % 12]; // 5th house — Purva Punya, classical "luck" house
  const fortuneLord = RASHI_LORD[(ascendantIndex + 8) % 12]; // 9th house — Bhagya, classical "fortune" house

  return {
    life: gemstoneFor('Life Stone', lifeLord, `${cap(lifeLord)} rules your Ascendant (${kundli.ascendant.rashi}) — a life stone is meant to be worn throughout life to strengthen your overall vitality, self-image, and general fortune.`),
    lucky: gemstoneFor('Lucky Stone', luckyLord, `${cap(luckyLord)} rules your 5th house (Purva Punya, the house of luck and past-life merit) — a lucky stone is traditionally worn to open doors to opportunity.`),
    fortune: gemstoneFor('Fortune Stone', fortuneLord, `${cap(fortuneLord)} rules your 9th house (Bhagya, the house of fortune and dharma) — a fortune stone is traditionally worn to help overcome obstacles and attract prosperity.`),
  };
}

export function recommendRudraksha(kundli: Kundli): RudrakshaResult {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const nakshatra = getNakshatra(moon.longitude);
  const mukhi = RUDRAKSHA_MUKHI_BY_PLANET[nakshatra.lord];
  const info = RUDRAKSHA_BY_MUKHI[mukhi];
  return {
    rulingPlanet: nakshatra.lord,
    mukhi,
    deity: info.deity,
    benefits: info.benefits,
    howToWear: `Clean the bead with Gangajal (or clean water), then wear it as a pendant or bracelet — ideally on a Monday or another day sacred to Shiva — while chanting "Om Namah Shivaya" or the mantra for ${cap(nakshatra.lord)}.`,
    precautions: RUDRAKSHA_PRECAUTIONS,
    reason: `${cap(nakshatra.lord)} rules your birth Nakshatra (${nakshatra.name}) — its ${mukhi} Mukhi Rudraksha, associated with ${info.deity}, is the classical remedial bead for that planet.`,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
