// Compositional written analysis — real per-planet house/sign placement
// combined with each planet's classical signification and each house's
// classical life-area. Deliberately not a "prediction generator": it states
// what classical Vedic astrology assigns to a placement, not a specific
// forecast, matching the framing already used by aiGuidance.ts.
import type { ChartPlanet, Kundli } from './kundli.ts';
import type { PlanetId } from './ephemeris.ts';
import { getRashi } from './zodiac.ts';
import { SHAD_PLANETS, planetDignity, type ShadPlanet } from './shadbalaConstants.ts';
import { HINDI_PLANET, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_HOUSE_ORDINAL } from './hindiVocab.ts';

const DIGNITY_NOTE: Partial<Record<ReturnType<typeof planetDignity>, (planet: string, rashi: string) => string>> = {
  exalted: (planet, rashi) => ` ${planet} is exalted in ${rashi} here — its most comfortable and empowered placement, delivering these results with unusual strength and ease.`,
  debilitated: (planet, rashi) => ` ${planet} is debilitated in ${rashi} here — its most uncomfortable placement, where it can struggle to express these themes smoothly (other factors elsewhere in the chart can still offset this).`,
  'own-sign': (planet, rashi) => ` ${planet} is in its own sign (${rashi}) here, a position of natural strength and confidence.`,
};

const DIGNITY_NOTE_HI: Partial<Record<ReturnType<typeof planetDignity>, (planet: string, rashi: string) => string>> = {
  exalted: (planet, rashi) => ` ${planet} यहाँ ${rashi} राशि में उच्च का है — इसकी सबसे सहज और सशक्त स्थिति, जो इन परिणामों को असाधारण बल और सरलता के साथ देती है।`,
  debilitated: (planet, rashi) => ` ${planet} यहाँ ${rashi} राशि में नीच का है — इसकी सबसे असहज स्थिति, जहाँ यह इन विषयों को सहजता से व्यक्त करने में संघर्ष कर सकता है (कुंडली के अन्य कारक इसे संतुलित कर सकते हैं)।`,
  'own-sign': (planet, rashi) => ` ${planet} यहाँ अपनी ही राशि (${rashi}) में है, जो स्वाभाविक बल और आत्मविश्वास की स्थिति है।`,
};

export const PLANET_SIGNIFICATIONS: Record<PlanetId, string> = {
  sun: 'self-confidence, authority, vitality and one\'s father',
  moon: 'emotions, the mind, instincts and one\'s mother',
  mars: 'courage, drive, competitiveness and physical energy',
  mercury: 'intellect, communication, analysis and commerce',
  jupiter: 'wisdom, growth, fortune and higher learning',
  venus: 'love, beauty, relationships and material comfort',
  saturn: 'discipline, responsibility, delays and long-term structure',
  uranus: 'sudden change, originality and rebellion against convention',
  neptune: 'imagination, illusion, spirituality and idealism',
  pluto: 'deep transformation, hidden power and regeneration',
  rahu: 'ambition, obsession and unconventional drive',
  ketu: 'detachment, past karma and spiritual inclination',
};

export const PLANET_SIGNIFICATIONS_HI: Record<PlanetId, string> = {
  sun: 'आत्मविश्वास, अधिकार, जीवन-शक्ति और पिता',
  moon: 'भावनाएं, मन, सहज-प्रवृत्ति और माता',
  mars: 'साहस, ऊर्जा, प्रतिस्पर्धा और शारीरिक बल',
  mercury: 'बुद्धि, संचार, विश्लेषण और वाणिज्य',
  jupiter: 'ज्ञान, वृद्धि, भाग्य और उच्च शिक्षा',
  venus: 'प्रेम, सौंदर्य, संबंध और भौतिक सुख',
  saturn: 'अनुशासन, जिम्मेदारी, विलंब और दीर्घकालिक संरचना',
  uranus: 'अचानक परिवर्तन, मौलिकता और परंपरा के विरुद्ध विद्रोह',
  neptune: 'कल्पना, भ्रम, आध्यात्मिकता और आदर्शवाद',
  pluto: 'गहन परिवर्तन, छिपी हुई शक्ति और पुनर्जन्म',
  rahu: 'महत्वाकांक्षा, जुनून और अपरंपरागत प्रवृत्ति',
  ketu: 'वैराग्य, पूर्व कर्म और आध्यात्मिक झुकाव',
};

export const HOUSE_LIFE_AREA: Record<number, string> = {
  1: 'self, physical body and general personality',
  2: 'wealth, family and speech',
  3: 'courage, siblings and short journeys',
  4: 'home, mother and inner peace',
  5: 'creativity, children and intelligence',
  6: 'health, service and daily obstacles',
  7: 'partnerships, marriage and business',
  8: 'transformation, longevity and hidden matters',
  9: 'fortune, higher learning and dharma',
  10: 'career, status and public life',
  11: 'gains, income and social circles',
  12: 'losses, foreign connections and spiritual liberation',
};

export const HOUSE_LIFE_AREA_HI: Record<number, string> = {
  1: 'स्वयं, शरीर और सामान्य व्यक्तित्व',
  2: 'धन, परिवार और वाणी',
  3: 'साहस, भाई-बहन और छोटी यात्राएं',
  4: 'घर, माता और आंतरिक शांति',
  5: 'रचनात्मकता, संतान और बुद्धि',
  6: 'स्वास्थ्य, सेवा और दैनिक बाधाएं',
  7: 'साझेदारी, विवाह और व्यापार',
  8: 'रूपांतरण, दीर्घायु और गुप्त विषय',
  9: 'भाग्य, उच्च शिक्षा और धर्म',
  10: 'करियर, प्रतिष्ठा और सार्वजनिक जीवन',
  11: 'लाभ, आय और सामाजिक दायरा',
  12: 'हानि, विदेश संबंध और आध्यात्मिक मुक्ति',
};

const ASCENDANT_BLURBS: Record<string, string> = {
  Aries: 'bold, direct, and quick to act — leading with energy and initiative.',
  Taurus: 'steady, patient, and grounded — valuing comfort, stability, and follow-through.',
  Gemini: 'curious, communicative, and adaptable — taking in and processing the world quickly.',
  Cancer: 'sensitive, nurturing, and protective — instincts and emotions running deep.',
  Leo: 'confident, expressive, and warm — naturally drawing attention and inclined to lead.',
  Virgo: 'analytical, precise, and service-minded — noticing detail others miss.',
  Libra: 'diplomatic, balanced, and relationship-focused — seeking fairness and harmony.',
  Scorpio: 'intense, private, and resilient — going deep rather than staying on the surface.',
  Sagittarius: 'optimistic, independent, and philosophical — drawn to growth and exploration.',
  Capricorn: 'disciplined, ambitious, and practical — building things that last.',
  Aquarius: 'independent, original, and idea-driven — often thinking ahead of the crowd.',
  Pisces: 'imaginative, empathetic, and intuitive — feeling and absorbing what is around them.',
};

const ASCENDANT_BLURBS_HI: Record<string, string> = {
  Aries: 'साहसी, स्पष्टवादी और शीघ्र कार्य करने वाला — ऊर्जा और पहल के साथ नेतृत्व करने वाला।',
  Taurus: 'स्थिर, धैर्यवान और व्यावहारिक — आराम, स्थिरता और दृढ़ता को महत्व देने वाला।',
  Gemini: 'जिज्ञासु, संवादप्रिय और अनुकूलनशील — संसार को शीघ्रता से समझने और ग्रहण करने वाला।',
  Cancer: 'संवेदनशील, पालन-पोषण करने वाला और सुरक्षात्मक — गहरी सहज-प्रवृत्तियों और भावनाओं वाला।',
  Leo: 'आत्मविश्वासी, अभिव्यंजक और आत्मीय — स्वाभाविक रूप से ध्यान आकर्षित करने और नेतृत्व करने वाला।',
  Virgo: 'विश्लेषणात्मक, सटीक और सेवाभावी — ऐसे विवरण देखने वाला जो अन्य चूक जाते हैं।',
  Libra: 'कूटनीतिक, संतुलित और संबंध-केंद्रित — निष्पक्षता और सामंजस्य की खोज करने वाला।',
  Scorpio: 'तीव्र, गोपनीय और दृढ़ — सतह पर रहने के बजाय गहराई में जाने वाला।',
  Sagittarius: 'आशावादी, स्वतंत्र और दार्शनिक — विकास और अन्वेषण की ओर आकर्षित।',
  Capricorn: 'अनुशासित, महत्वाकांक्षी और व्यावहारिक — स्थायी चीज़ों का निर्माण करने वाला।',
  Aquarius: 'स्वतंत्र, मौलिक और विचारप्रधान — प्रायः भीड़ से आगे सोचने वाला।',
  Pisces: 'कल्पनाशील, सहानुभूतिशील और सहज-ज्ञानी — आसपास के वातावरण को गहराई से महसूस और आत्मसात करने वाला।',
};

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Four independent sentence templates per language, picked by planet id so
// the same planet always reads the same way but consecutive planets in a
// chart don't all share one grammatical skeleton (the giveaway of a
// mail-merged paragraph). Each still states the same facts: house + life
// area, sign, and what the planet classically governs.
const OPENING_TEMPLATES: ((p: ChartPlanet, houseArea: string, sig: string) => string)[] = [
  (p, houseArea, sig) => `${cap(p.id)} falls in your ${ordinal(p.house)} house, in ${p.rashi} — the house of ${houseArea}. Classically, ${cap(p.id)} governs ${sig}, so here it colors how you handle ${houseArea}.`,
  (p, houseArea, sig) => `In your chart, ${cap(p.id)} is placed in ${p.rashi} in the ${ordinal(p.house)} house (${houseArea}). This planet's classical domain is ${sig}, which it brings to bear on that part of life.`,
  (p, houseArea, sig) => `Your ${ordinal(p.house)} house — ${houseArea} — holds ${cap(p.id)}, sitting in ${p.rashi}. ${cap(p.id)} is traditionally tied to ${sig}, and that's the flavor it lends here.`,
  (p, houseArea, sig) => `${cap(p.id)} sits in ${p.rashi}, in your ${ordinal(p.house)} house of ${houseArea}. Vedic astrology reads ${cap(p.id)} as the significator of ${sig}.`,
];

const NAKSHATRA_TEMPLATES: ((p: ChartPlanet) => string)[] = [
  p => ` It's at ${p.degreeInSign.toFixed(1)}° of the sign, in ${p.nakshatra} nakshatra (pada ${p.nakshatraPada}, ruled by ${cap(p.nakshatraLord)}), which adds its own emotional texture on top of the sign.`,
  p => ` More specifically, it's in ${p.nakshatra} nakshatra (pada ${p.nakshatraPada}) at ${p.degreeInSign.toFixed(1)}° — ruled by ${cap(p.nakshatraLord)}, this nakshatra shades the sign's broader theme.`,
  p => ` The exact degree is ${p.degreeInSign.toFixed(1)}°, placing it in ${p.nakshatra} (pada ${p.nakshatraPada}), whose lord ${cap(p.nakshatraLord)} adds a finer layer beneath the sign.`,
];

const RETRO_TEMPLATES_EN: ((name: string) => string)[] = [
  name => ` It's also retrograde right now — classical texts treat this as turning ${name}'s themes inward, more reconsidered than outwardly acted on.`,
  name => ` It's retrograde at the moment too, which traditionally means ${name}'s usual expression runs delayed or gets reworked internally before showing outwardly.`,
];

function planetParagraph(planet: ChartPlanet, language: 'en' | 'hi'): string {
  const signIndex = getRashi(planet.longitude).index;
  const isClassical = (SHAD_PLANETS as readonly PlanetId[]).includes(planet.id);
  const dignity = isClassical ? planetDignity(planet.id as ShadPlanet, signIndex) : null;
  const pick = <T,>(arr: T[]): T => arr[planet.house % arr.length];

  if (language === 'hi') {
    const houseAreaHi = HOUSE_LIFE_AREA_HI[planet.house];
    const rashiHi = HINDI_RASHI[planet.rashi] || planet.rashi;
    const planetHi = HINDI_PLANET[planet.id];
    const OPENINGS_HI = [
      `आपका ${planetHi} ${HINDI_HOUSE_ORDINAL[planet.house]} भाव (${houseAreaHi}) में, ${rashiHi} राशि में स्थित है। शास्त्रीय रूप से ${planetHi} ${PLANET_SIGNIFICATIONS_HI[planet.id]} का कारक है, इसलिए यहाँ यह इसी क्षेत्र को प्रभावित करता है।`,
      `${rashiHi} राशि में स्थित आपका ${planetHi} ${HINDI_HOUSE_ORDINAL[planet.house]} भाव — ${houseAreaHi} — में बैठा है। यह ग्रह पारंपरिक रूप से ${PLANET_SIGNIFICATIONS_HI[planet.id]} से जुड़ा है, और यही रंग यहाँ लाता है।`,
      `आपके ${HINDI_HOUSE_ORDINAL[planet.house]} भाव (${houseAreaHi}) में ${planetHi} बैठा है, ${rashiHi} राशि में। ज्योतिष में ${planetHi} को ${PLANET_SIGNIFICATIONS_HI[planet.id]} से जोड़ा जाता है।`,
    ];
    const NAKSHATRA_HI = [
      ` यह राशि के ${planet.degreeInSign.toFixed(1)}° पर, ${HINDI_NAKSHATRA[planet.nakshatra] || planet.nakshatra} नक्षत्र (चरण ${planet.nakshatraPada}, स्वामी ${HINDI_PLANET[planet.nakshatraLord as PlanetId] || planet.nakshatraLord}) में है, जो राशि के स्वभाव पर एक सूक्ष्म भावनात्मक छटा जोड़ता है।`,
      ` सटीक रूप से यह ${planet.degreeInSign.toFixed(1)}° पर ${HINDI_NAKSHATRA[planet.nakshatra] || planet.nakshatra} नक्षत्र (चरण ${planet.nakshatraPada}) में है — इसके स्वामी ${HINDI_PLANET[planet.nakshatraLord as PlanetId] || planet.nakshatraLord} राशि के व्यापक भाव के नीचे एक और परत जोड़ते हैं।`,
    ];
    const base = OPENINGS_HI[planet.house % OPENINGS_HI.length];
    const nakshatraSentence = NAKSHATRA_HI[planet.house % NAKSHATRA_HI.length];
    const dignitySentence = dignity ? (DIGNITY_NOTE_HI[dignity]?.(planetHi, rashiHi) ?? '') : '';
    const retroSentence = planet.retrograde ? ` यह अभी वक्री भी है — शास्त्र इसे ${planetHi} के विषयों को बाहर की बजाय भीतर मोड़ने या उनमें देरी व पुनर्विचार लाने के रूप में पढ़ते हैं।` : '';
    return base + nakshatraSentence + dignitySentence + retroSentence;
  }

  const houseArea = HOUSE_LIFE_AREA[planet.house];
  const planetName = cap(planet.id);
  const base = pick(OPENING_TEMPLATES)(planet, houseArea, PLANET_SIGNIFICATIONS[planet.id]);
  const nakshatraSentence = pick(NAKSHATRA_TEMPLATES)(planet);
  const dignitySentence = dignity ? (DIGNITY_NOTE[dignity]?.(planetName, planet.rashi) ?? '') : '';
  const retroSentence = planet.retrograde ? pick(RETRO_TEMPLATES_EN)(planetName) : '';
  return base + nakshatraSentence + dignitySentence + retroSentence;
}

export interface KundliAnalysis {
  lagna: string;
  moon: string;
  planets: { id: PlanetId; text: string }[];
}

export function buildKundliAnalysis(kundli: Kundli, language: 'en' | 'hi' = 'en'): KundliAnalysis {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const lagna = language === 'hi'
    ? `आपका लग्न ${HINDI_RASHI[kundli.ascendant.rashi] || kundli.ascendant.rashi} है — इसी के माध्यम से आपकी शेष कुंडली पढ़ी जाती है: ${ASCENDANT_BLURBS_HI[kundli.ascendant.rashi] || 'यह आपके व्यक्तित्व को दूसरों के सामने प्रस्तुत करने के तरीके को प्रभावित करता है।'}`
    : `Your Ascendant (Lagna) is ${kundli.ascendant.rashi} — the lens the rest of your chart is read through: ${ASCENDANT_BLURBS[kundli.ascendant.rashi] || 'it colors how you come across to others.'}`;
  const moonText = language === 'hi'
    ? `आपका चन्द्र आपके ${HINDI_HOUSE_ORDINAL[moon.house]} भाव में ${HINDI_RASHI[moon.rashi] || moon.rashi} राशि में है, और आपका जन्म नक्षत्र ${HINDI_NAKSHATRA[kundli.moonNakshatra.name] || kundli.moonNakshatra.name} है (चरण ${kundli.moonNakshatra.pada}) — यह आपकी भावनात्मक प्रकृति और सहज प्रतिक्रियाओं को आकार देता है, और आपकी विंशोत्तरी दशा की समयरेखा का आधार बिंदु है।`
    : `Your Moon is in ${moon.rashi} in your ${ordinal(moon.house)} house, and your Janma Nakshatra is ${kundli.moonNakshatra.name} (Pada ${kundli.moonNakshatra.pada}) — this shapes your emotional nature, instinctive reactions, and is the anchor point for your Vimshottari Dasha timeline.`;

  return {
    lagna,
    moon: moonText,
    planets: kundli.planets.map(p => ({ id: p.id, text: planetParagraph(p, language) })),
  };
}
