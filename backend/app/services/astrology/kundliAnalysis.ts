// Compositional written analysis — real per-planet house/sign placement
// combined with each planet's classical signification and each house's
// classical life-area. Deliberately not a "prediction generator": it states
// what classical Vedic astrology assigns to a placement, not a specific
// forecast, matching the framing already used by aiGuidance.ts.
import type { ChartPlanet, Kundli } from './kundli.ts';
import type { PlanetId } from './ephemeris.ts';
import { HINDI_PLANET, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_HOUSE_ORDINAL } from './hindiVocab.ts';

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

function planetParagraph(planet: ChartPlanet, language: 'en' | 'hi'): string {
  if (language === 'hi') {
    const houseAreaHi = HOUSE_LIFE_AREA_HI[planet.house];
    const retroHi = planet.retrograde ? ', और वर्तमान में वक्री है' : '';
    return `आपका ${HINDI_PLANET[planet.id]} आपके ${HINDI_HOUSE_ORDINAL[planet.house]} भाव (${houseAreaHi}) में स्थित है, जो ${HINDI_RASHI[planet.rashi] || planet.rashi} राशि में है${retroHi}। शास्त्रीय ज्योतिष के अनुसार, ${HINDI_PLANET[planet.id]} ${PLANET_SIGNIFICATIONS_HI[planet.id]} का कारक है — यहाँ स्थित होकर यह इस ऊर्जा को विशेष रूप से ${houseAreaHi} से संबंधित विषयों पर प्रदान करता है।`;
  }
  const houseArea = HOUSE_LIFE_AREA[planet.house];
  const retro = planet.retrograde ? ', and is currently retrograde' : '';
  return `Your ${cap(planet.id)} sits in your ${ordinal(planet.house)} house (${houseArea}), placed in ${planet.rashi}${retro}. In classical Vedic astrology, ${cap(planet.id)} governs ${PLANET_SIGNIFICATIONS[planet.id]} — placed here, it lends that energy specifically to matters of ${houseArea}.`;
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
