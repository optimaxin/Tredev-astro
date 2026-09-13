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
import { HINDI_PLANET, HINDI_RASHI, HINDI_NAKSHATRA } from './hindiVocab.ts';

const VARNA_NAMES = ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra'];
const VARNA_NAMES_HI = ['ब्राह्मण', 'क्षत्रिय', 'वैश्य', 'शूद्र'];
const VASHYA_NAMES = ['Manav (Human)', 'Vanachar (Wild)', 'Chatushpad (Quadruped)', 'Jalachar (Aquatic)', 'Keeta (Insect)'];
const VASHYA_NAMES_HI = ['मानव', 'वनचर', 'चतुष्पद', 'जलचर', 'कीट'];
const YONI_NAMES = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'];
const YONI_NAMES_HI = ['अश्व', 'गज', 'मेष', 'सर्प', 'श्वान', 'मार्जार', 'मूषक', 'गौ', 'महिष', 'व्याघ्र', 'मृग', 'वानर', 'नकुल', 'सिंह'];
const GANA_NAMES = ['Deva', 'Manushya', 'Rakshasa'];
const GANA_NAMES_HI = ['देव', 'मनुष्य', 'राक्षस'];
const NADI_NAMES = ['Aadi', 'Madhya', 'Antya'];
const NADI_NAMES_HI = ['आदि', 'मध्य', 'अन्त्य'];
const TATVA_BY_RASHI = ['Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water'];
const TATVA_BY_RASHI_HI = ['अग्नि', 'पृथ्वी', 'वायु', 'जल', 'अग्नि', 'पृथ्वी', 'वायु', 'जल', 'अग्नि', 'पृथ्वी', 'वायु', 'जल'];

// Paya: Gold/Silver/Copper/Iron by which of 4 house-groups the natal Moon
// falls in, counted from the Ascendant (1,6,11 = Gold; 2,5,9 = Silver;
// 3,7,10 = Copper; 4,8,12 = Iron) — a standard, closed-form Paya rule.
const PAYA_NAMES = ['Swarna (Gold)', 'Rajat (Silver)', 'Tamra (Copper)', 'Loha (Iron)'];
const PAYA_NAMES_HI = ['स्वर्ण', 'रजत', 'ताम्र', 'लोह'];
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
// Hindi is the same Devanagari word for both `name` and `sanskritName` here
// (unlike English, where "Ruby" and its Sanskrit name "Manik" are visibly
// different words) — metal/finger/mantra/color stay as-is regardless of
// language (out of scope for this pass; mantras are always Sanskrit anyway).
const GEMSTONE_NAME_HI: Record<string, string> = {
  sun: 'माणिक्य', moon: 'मोती', mars: 'मूंगा', mercury: 'पन्ना', jupiter: 'पुखराज', venus: 'हीरा', saturn: 'नीलम',
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
const RUDRAKSHA_BY_MUKHI_HI: Record<number, RudrakshaInfo> = {
  1: { deity: 'शिव', benefits: ['शुद्ध चेतना का प्रतीक है और मृत्यु के भय को दूर करने वाला माना जाता है।', 'धारण करने वाले को निर्णय लेने में एकाग्र और स्पष्ट-चित्त बनाए रखने में सहायक है।', 'पारंपरिक रूप से आध्यात्मिक नेतृत्व और आत्म-साक्षात्कार से जुड़ा हुआ है।'] },
  2: { deity: 'अर्धनारीश्वर', benefits: ['धारण करने वाले और उसके साथी के बीच भावनात्मक संतुलन और सामंजस्य लाने वाला माना जाता है।', 'घनिष्ठ संबंधों और पारिवारिक जीवन में बंधन को मजबूत करने वाला माना जाता है।', 'पूरक ऊर्जाओं (शिव-शक्ति) की एकता से जुड़ा हुआ है।'] },
  3: { deity: 'अग्नि', benefits: ['पूर्व पापों और नकारात्मक कर्मों को भस्म करने वाला माना जाता है।', 'पारंपरिक रूप से इच्छाशक्ति, आत्मविश्वास और शारीरिक ऊर्जा बढ़ाने के लिए उपयोग किया जाता है।', 'अपराधबोध या हीन भावना को दूर करने में सहायक माना जाता है।'] },
  4: { deity: 'ब्रह्मा', benefits: ['रचनात्मकता, ज्ञान और बेहतर संप्रेषण क्षमता से जुड़ा हुआ है।', 'स्मरण शक्ति को तीव्र करने वाला माना जाता है और विद्यार्थियों तथा लेखकों के लिए सहायक है।', 'पारंपरिक रूप से ब्रह्मा जी की बुद्धि रूपी कृपा पाने हेतु धारण किया जाता है।'] },
  5: { deity: 'रुद्र', benefits: ['सबसे सामान्य और बहुउपयोगी रुद्राक्ष, जो अधिकतर लोगों के दैनिक धारण के लिए उपयुक्त है।', 'मानसिक शांति, अच्छे स्वास्थ्य और स्थिर समृद्धि लाने वाला माना जाता है।', 'शरीर के भीतर पंच तत्वों को संतुलित करने वाला माना जाता है।'] },
  6: { deity: 'कार्तिकेय', benefits: ['साहस, निर्भयता और सशक्त व्यक्तित्व प्रदान करने वाला माना जाता है।', 'पारंपरिक रूप से भावनात्मक आघात और हृदय-वेदना को कम करने के लिए उपयोग किया जाता है।', 'शुक्र के अशुभ प्रभावों को कम करने और प्रेम संबंधों में सामंजस्य लाने में सहायक माना जाता है।'] },
  7: { deity: 'महालक्ष्मी', benefits: ['धन, समृद्धि और सम्पन्नता में आने वाली बाधाओं को दूर करने से जुड़ा हुआ है।', 'पारंपरिक रूप से शनि के कठिन प्रभावों को कम करने के लिए धारण किया जाता है, जिसमें साढ़े साती भी शामिल है।', 'करियर और आर्थिक मामलों में स्थिरता लाने वाला माना जाता है।'] },
  8: { deity: 'गणेश', benefits: ['नए कार्य आरंभ करने से पहले बाधाओं को दूर करने और स्पष्टता लाने वाला माना जाता है।', 'पारंपरिक रूप से राहु के अप्रत्याशित प्रभावों को संतुलित करने के लिए उपयोग किया जाता है।', 'दबाव की स्थिति में सही निर्णय लेने में सहायक माना जाता है।'] },
  9: { deity: 'दुर्गा', benefits: ['साहस, सुरक्षा और आंतरिक शक्ति से जुड़ा हुआ है।', 'पारंपरिक रूप से केतु से जुड़े वैराग्य और भ्रम को संतुलित करने के लिए उपयोग किया जाता है।', 'अंतर्ज्ञान और आध्यात्मिक ऊर्जा को जागृत करने वाला माना जाता है।'] },
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
const RUDRAKSHA_PRECAUTIONS_HI = [
  'पहली बार धारण करने से पहले मनके को गंगाजल (या स्वच्छ जल) से धो लें।',
  'इसे दिखावे के बजाय सहज रूप से धारण करें, और पहना हुआ मनका किसी और को न दें।',
  'यदि मनका टूट जाए, तो उसे पहनना बंद कर सम्मानपूर्वक विसर्जित कर दें।',
  'परंपरा के अनुसार, अंतिम संस्कार में जाते समय या मदिरा एवं मांसाहार का सेवन करते समय इसे धारण करने से बचें।',
  'सोने से पहले इसे उतार दें और अपने पूजा स्थान के पास रखें।',
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

export function buildAvakhada(kundli: Kundli, language: 'en' | 'hi' = 'en'): AvakhadaResult {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const rashi = getRashi(moon.longitude);
  const nakshatra = getNakshatra(moon.longitude);
  const hi = language === 'hi';

  return {
    varna: (hi ? VARNA_NAMES_HI : VARNA_NAMES)[VARNA_CLASS[rashi.index]],
    vashya: (hi ? VASHYA_NAMES_HI : VASHYA_NAMES)[VASHYA_GROUP[rashi.index]],
    yoni: (hi ? YONI_NAMES_HI : YONI_NAMES)[YONI_ANIMAL[nakshatra.index]],
    gana: (hi ? GANA_NAMES_HI : GANA_NAMES)[GANA_GROUP[nakshatra.index] ?? 2],
    nadi: (hi ? NADI_NAMES_HI : NADI_NAMES)[NADI_GROUP[nakshatra.index] ?? 2],
    paya: (hi ? PAYA_NAMES_HI : PAYA_NAMES)[PAYA_HOUSE_GROUP[moon.house]],
    tatva: (hi ? TATVA_BY_RASHI_HI : TATVA_BY_RASHI)[rashi.index],
    signLord: hi ? HINDI_PLANET[RASHI_LORD[rashi.index] as keyof typeof HINDI_PLANET] : RASHI_LORD[rashi.index],
    nakshatraLord: hi ? HINDI_PLANET[nakshatra.lord as keyof typeof HINDI_PLANET] : nakshatra.lord,
    pada: nakshatra.pada,
  };
}

function gemstoneFor(purpose: GemstoneResult['purpose'], rulingPlanet: string, reason: string, language: 'en' | 'hi'): GemstoneResult {
  const gem = GEMSTONE_BY_PLANET[rulingPlanet];
  const name = language === 'hi' ? GEMSTONE_NAME_HI[rulingPlanet] : gem.name;
  const sanskritName = language === 'hi' ? GEMSTONE_NAME_HI[rulingPlanet] : gem.sanskritName;
  return { purpose, rulingPlanet, gemstone: name, sanskritName, metal: gem.metal, finger: gem.finger, mantra: gem.mantra, color: gem.color, reason };
}

export function recommendGemstones(kundli: Kundli, language: 'en' | 'hi' = 'en'): GemstoneRecommendations {
  const ascendantIndex = RASHIS.indexOf(kundli.ascendant.rashi as (typeof RASHIS)[number]);
  const lifeLord = RASHI_LORD[ascendantIndex];
  const luckyLord = RASHI_LORD[(ascendantIndex + 4) % 12]; // 5th house — Purva Punya, classical "luck" house
  const fortuneLord = RASHI_LORD[(ascendantIndex + 8) % 12]; // 9th house — Bhagya, classical "fortune" house

  if (language === 'hi') {
    return {
      life: gemstoneFor('Life Stone', lifeLord, `${HINDI_PLANET[lifeLord as keyof typeof HINDI_PLANET]} आपकी लग्न राशि (${HINDI_RASHI[kundli.ascendant.rashi]}) का स्वामी है — जीवन रत्न को समग्र जीवन शक्ति, आत्म-छवि और सामान्य सौभाग्य को मजबूत करने के लिए आजीवन धारण किया जाता है।`, language),
      lucky: gemstoneFor('Lucky Stone', luckyLord, `${HINDI_PLANET[luckyLord as keyof typeof HINDI_PLANET]} आपके पंचम भाव (पूर्व पुण्य, सौभाग्य और पूर्वजन्म के पुण्यों का भाव) का स्वामी है — भाग्य रत्न पारंपरिक रूप से नए अवसरों के द्वार खोलने के लिए धारण किया जाता है।`, language),
      fortune: gemstoneFor('Fortune Stone', fortuneLord, `${HINDI_PLANET[fortuneLord as keyof typeof HINDI_PLANET]} आपके नवम भाव (भाग्य और धर्म का भाव) का स्वामी है — सौभाग्य रत्न पारंपरिक रूप से बाधाओं पर विजय पाने और समृद्धि आकर्षित करने के लिए धारण किया जाता है।`, language),
    };
  }
  return {
    life: gemstoneFor('Life Stone', lifeLord, `${cap(lifeLord)} rules your Ascendant (${kundli.ascendant.rashi}) — a life stone is meant to be worn throughout life to strengthen your overall vitality, self-image, and general fortune.`, language),
    lucky: gemstoneFor('Lucky Stone', luckyLord, `${cap(luckyLord)} rules your 5th house (Purva Punya, the house of luck and past-life merit) — a lucky stone is traditionally worn to open doors to opportunity.`, language),
    fortune: gemstoneFor('Fortune Stone', fortuneLord, `${cap(fortuneLord)} rules your 9th house (Bhagya, the house of fortune and dharma) — a fortune stone is traditionally worn to help overcome obstacles and attract prosperity.`, language),
  };
}

export function recommendRudraksha(kundli: Kundli, language: 'en' | 'hi' = 'en'): RudrakshaResult {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const nakshatra = getNakshatra(moon.longitude);
  const mukhi = RUDRAKSHA_MUKHI_BY_PLANET[nakshatra.lord];
  const info = language === 'hi' ? RUDRAKSHA_BY_MUKHI_HI[mukhi] : RUDRAKSHA_BY_MUKHI[mukhi];
  if (language === 'hi') {
    const planetHi = HINDI_PLANET[nakshatra.lord as keyof typeof HINDI_PLANET];
    const nakshatraHi = HINDI_NAKSHATRA[nakshatra.name] ?? nakshatra.name;
    return {
      rulingPlanet: nakshatra.lord,
      mukhi,
      deity: info.deity,
      benefits: info.benefits,
      howToWear: `मनके को गंगाजल (या स्वच्छ जल) से साफ करें, फिर इसे माला या कंगन के रूप में धारण करें — अधिमानतः सोमवार या शिव को समर्पित किसी अन्य दिन — "ॐ नमः शिवाय" या ${planetHi} के मंत्र का जाप करते हुए।`,
      precautions: RUDRAKSHA_PRECAUTIONS_HI,
      reason: `${planetHi} आपके जन्म नक्षत्र (${nakshatraHi}) का स्वामी है — इससे संबंधित ${mukhi} मुखी रुद्राक्ष, जो ${info.deity} से जुड़ा है, इस ग्रह के लिए शास्त्रीय उपचारात्मक मनका है।`,
    };
  }
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

// Classical planet -> color name and planet -> number (Chaldean numerology,
// the standard Sun=1/Moon=2/.../Ketu=7/Saturn=8/Mars=9 mapping used
// wherever "ruling number" of a planet comes up). RASHI_LORD only ever
// returns one of these 7 (a sign is never ruled by Rahu/Ketu in classical
// Parashari astrology), but the table is kept complete for Rahu/Ketu too
// since other callers (Nakshatra lord, which CAN be Rahu/Ketu) may want it.
const COLOR_BY_PLANET: Record<string, string> = {
  sun: 'Red / Orange', moon: 'White', mars: 'Red', mercury: 'Green',
  jupiter: 'Yellow', venus: 'White / Pastel Pink', saturn: 'Blue / Black',
  rahu: 'Smoky Grey', ketu: 'Brown / Multicolor',
};
const NUMBER_BY_PLANET: Record<string, number> = {
  sun: 1, moon: 2, jupiter: 3, rahu: 4, mercury: 5, venus: 6, ketu: 7, saturn: 8, mars: 9,
};

export interface LuckyAttributes {
  rulingPlanet: string;
  color: string;
  colorHex: string;
  number: number;
  luckyDates: number[];
  reason: string;
}

// Ruling planet = Ascendant lord — the same "Life Stone" convention
// recommendGemstones already uses, so Lucky Color/Number stays consistent
// with the rest of this person's own remedial recommendations rather than
// being a second, disconnected rule.
export function getLuckyAttributes(kundli: Kundli): LuckyAttributes {
  const ascendantIndex = RASHIS.indexOf(kundli.ascendant.rashi as (typeof RASHIS)[number]);
  const rulingPlanet = RASHI_LORD[ascendantIndex];
  const number = NUMBER_BY_PLANET[rulingPlanet];
  // Digital root of each date-of-month (1-31) — dates 1..31 whose digits
  // reduce to the ruling number, the standard numerology convention
  // (e.g. number 1 -> dates 1, 10, 19, 28).
  const luckyDates = Array.from({ length: 31 }, (_, i) => i + 1).filter(d => ((d - 1) % 9) + 1 === number);

  return {
    rulingPlanet,
    color: COLOR_BY_PLANET[rulingPlanet],
    colorHex: GEMSTONE_BY_PLANET[rulingPlanet].color,
    number,
    luckyDates,
    reason: `${cap(rulingPlanet)} rules your Ascendant (${kundli.ascendant.rashi}) — the same ruling planet your Life Stone is based on. Classical numerology assigns ${cap(rulingPlanet)} the number ${number}; dates in a month whose digits reduce to ${number} are considered favorable for that planet.`,
  };
}
