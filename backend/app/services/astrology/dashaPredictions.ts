// Per-Mahadasha written predictions — same compositional, non-speculative
// approach as kundliAnalysis.ts (real house + sign placement + classical
// signification), extended to each of the 9 Vimshottari periods. Deliberately
// does not fabricate specific life events (marriage timing, child's gender,
// etc.) the way some commercial reports do — it states what classical Vedic
// astrology assigns to the placement, not a forecast of particular events.
import type { Kundli } from './kundli.ts';
import type { MahadashaPeriod } from './vimshottariDasha.ts';
import { PLANET_SIGNIFICATIONS, PLANET_SIGNIFICATIONS_HI, HOUSE_LIFE_AREA, HOUSE_LIFE_AREA_HI, ordinal, cap } from './kundliAnalysis.ts';
import { HINDI_PLANET, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_HOUSE_ORDINAL } from './hindiVocab.ts';
import { getRashi } from './zodiac.ts';
import { SHAD_PLANETS, planetDignity, type ShadPlanet, type PlanetDignity } from './shadbalaConstants.ts';

const DASHA_DIGNITY_NOTE: Partial<Record<PlanetDignity, (planet: string) => string>> = {
  exalted: planet => ` ${planet} is exalted in its natal sign, its strongest classical placement — during this Mahadasha, that strength generally lets its significations play out with more ease and less struggle than an average dasha would.`,
  debilitated: planet => ` ${planet} is debilitated in its natal sign, its weakest classical placement — during this Mahadasha, its significations may demand more visible effort before showing results, though the rest of the chart can offset this.`,
  'own-sign': planet => ` ${planet} sits in its own sign natally, a position of natural strength — this Mahadasha tends to run with steadier, more self-directed confidence than an average one.`,
};

const DASHA_DIGNITY_NOTE_HI: Partial<Record<PlanetDignity, (planet: string) => string>> = {
  exalted: planet => ` ${planet} अपनी जन्म राशि में उच्च का है, इसकी सबसे मज़बूत शास्त्रीय स्थिति — इस महादशा के दौरान, यह बल सामान्यतः इसके फलों को औसत दशा की तुलना में अधिक सहजता से प्रकट होने देता है।`,
  debilitated: planet => ` ${planet} अपनी जन्म राशि में नीच का है, इसकी सबसे कमज़ोर शास्त्रीय स्थिति — इस महादशा के दौरान, इसके फल दिखने से पहले अधिक स्पष्ट प्रयास की मांग कर सकते हैं, हालांकि कुंडली के अन्य कारक इसे संतुलित कर सकते हैं।`,
  'own-sign': planet => ` ${planet} जन्म कुंडली में अपनी ही राशि में स्थित है, जो स्वाभाविक बल की स्थिति है — यह महादशा सामान्य दशा की तुलना में अधिक स्थिर और आत्म-निर्देशित आत्मविश्वास के साथ चलती है।`,
};

const SIGN_TONE: Record<string, string> = {
  Aries: 'a bold, fast-moving, initiating energy',
  Taurus: 'a steady, patient, comfort-seeking energy',
  Gemini: 'a curious, communicative, quick-shifting energy',
  Cancer: 'a sensitive, nurturing, emotionally-led energy',
  Leo: 'a confident, expressive, recognition-seeking energy',
  Virgo: 'an analytical, detail-focused, service-oriented energy',
  Libra: 'a diplomatic, relationship-focused, balance-seeking energy',
  Scorpio: 'an intense, private, transformative energy',
  Sagittarius: 'an optimistic, expansive, freedom-seeking energy',
  Capricorn: 'a disciplined, ambitious, long-term-building energy',
  Aquarius: 'an independent, unconventional, idea-driven energy',
  Pisces: 'an imaginative, empathetic, boundary-dissolving energy',
};

const SIGN_TONE_HI: Record<string, string> = {
  Aries: 'साहसी, तीव्र गति वाली, पहल करने वाली ऊर्जा',
  Taurus: 'स्थिर, धैर्यवान, आराम चाहने वाली ऊर्जा',
  Gemini: 'जिज्ञासु, संवादप्रिय, शीघ्र बदलने वाली ऊर्जा',
  Cancer: 'संवेदनशील, पालन-पोषण करने वाली, भावनाओं से संचालित ऊर्जा',
  Leo: 'आत्मविश्वासी, अभिव्यंजक, मान्यता चाहने वाली ऊर्जा',
  Virgo: 'विश्लेषणात्मक, विवरण-केंद्रित, सेवाभावी ऊर्जा',
  Libra: 'कूटनीतिक, संबंध-केंद्रित, संतुलन चाहने वाली ऊर्जा',
  Scorpio: 'तीव्र, गोपनीय, रूपांतरकारी ऊर्जा',
  Sagittarius: 'आशावादी, विस्तृत, स्वतंत्रता चाहने वाली ऊर्जा',
  Capricorn: 'अनुशासित, महत्वाकांक्षी, दीर्घकालिक-निर्माण करने वाली ऊर्जा',
  Aquarius: 'स्वतंत्र, अपरंपरागत, विचार-प्रधान ऊर्जा',
  Pisces: 'कल्पनाशील, सहानुभूतिशील, सीमाओं को घोलने वाली ऊर्जा',
};

export interface DashaPrediction {
  lord: string;
  text: string;
}

// Dignity only exists in this classical system for the 7 traditional
// grahas — Rahu/Ketu and the outer planets have no exaltation/own-sign table.
function isClassical(lord: string): lord is ShadPlanet {
  return (SHAD_PLANETS as readonly string[]).includes(lord);
}

// Three independent phrasings per language, picked by house number so
// consecutive Mahadashas in the same timeline don't all read off one
// grammatical skeleton.
const DASHA_OPENERS_EN: ((lord: string, house: string, area: string, sig: string, rashi: string, tone: string) => string)[] = [
  (lord, house, area, sig, rashi, tone) => `${lord} sits in your ${house} house (${area}) in ${rashi}. Classically, ${lord} governs ${sig} — during this Mahadasha, expect that theme to surface around ${area}, carrying ${tone} from its placement in ${rashi}.`,
  (lord, house, area, sig, rashi, tone) => `This Mahadasha belongs to ${lord}, placed in your ${house} house — ${area} — in ${rashi}. ${lord}'s classical domain is ${sig}, so this period tends to bring ${tone}, working through matters of ${area}.`,
  (lord, house, area, sig, rashi, tone) => `${lord}, the ruling planet of this Mahadasha, is placed in ${rashi} in your ${house} house of ${area}. Its classical significations — ${sig} — play out here with ${tone}.`,
];
const DASHA_OPENERS_HI: ((lord: string, house: string, area: string, sig: string, rashi: string, tone: string) => string)[] = [
  (lord, house, area, sig, rashi, tone) => `${lord} आपके ${house} भाव (${area}) में ${rashi} राशि में स्थित है। शास्त्रीय रूप से ${lord} ${sig} का कारक है — इस महादशा में यह विषय ${area} के इर्द-गिर्द उभरता है, ${rashi} राशि से ${tone} का पुट लिए हुए।`,
  (lord, house, area, sig, rashi, tone) => `यह महादशा ${lord} की है, जो आपके ${house} भाव — ${area} — में ${rashi} राशि में बैठा है। ${lord} का शास्त्रीय कारक ${sig} है, इसलिए यह अवधि ${area} से जुड़े विषयों में ${tone} लेकर आती है।`,
  (lord, house, area, sig, rashi, tone) => `इस महादशा के स्वामी ${lord}, आपके ${house} भाव (${area}) में ${rashi} राशि में स्थित हैं। इनका शास्त्रीय कारक — ${sig} — यहाँ ${tone} के साथ प्रकट होता है।`,
];

export function buildDashaPredictions(kundli: Kundli, mahadashaTimeline: MahadashaPeriod[], language: 'en' | 'hi' = 'en'): DashaPrediction[] {
  return mahadashaTimeline.map(period => {
    const planet = kundli.planets.find(p => p.id === period.lord);
    if (language === 'hi') {
      const lordHi = HINDI_PLANET[period.lord as keyof typeof HINDI_PLANET] ?? period.lord;
      if (!planet) {
        return { lord: period.lord, text: `${lordHi} महादशा — यह अवधि आपके चन्द्र नक्षत्र से गिनी जाती है; ${lordHi} के शास्त्रीय कारक ${PLANET_SIGNIFICATIONS_HI[period.lord as keyof typeof PLANET_SIGNIFICATIONS_HI] ?? 'इसके कर्म-संबंधी विषय'} इस दौरान प्रमुख रहते हैं।` };
      }
      const houseAreaHi = HOUSE_LIFE_AREA_HI[planet.house];
      const toneHi = SIGN_TONE_HI[planet.rashi] || 'अपनी विशिष्ट ऊर्जा';
      const rashiHi = HINDI_RASHI[planet.rashi] || planet.rashi;
      const nakshatraSentenceHi = ` यह ${HINDI_NAKSHATRA[planet.nakshatra] || planet.nakshatra} नक्षत्र (चरण ${planet.nakshatraPada}) में भी स्थित है, जो इस महादशा को एक अतिरिक्त, अधिक सूक्ष्म भावनात्मक रंग देता है।`;
      const dignityHi = isClassical(period.lord) ? (DASHA_DIGNITY_NOTE_HI[planetDignity(period.lord as ShadPlanet, getRashi(planet.longitude).index)]?.(lordHi) ?? '') : '';
      const opener = DASHA_OPENERS_HI[planet.house % DASHA_OPENERS_HI.length];
      const text = opener(lordHi, HINDI_HOUSE_ORDINAL[planet.house], houseAreaHi, PLANET_SIGNIFICATIONS_HI[period.lord as keyof typeof PLANET_SIGNIFICATIONS_HI], rashiHi, toneHi) + nakshatraSentenceHi + dignityHi;
      return { lord: period.lord, text };
    }
    if (!planet) {
      return { lord: period.lord, text: `${cap(period.lord)} Mahadasha — this period is timed from your Moon's nakshatra; ${cap(period.lord)}'s classical significations of ${PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS] ?? 'its karmic themes'} come to the fore.` };
    }
    const houseArea = HOUSE_LIFE_AREA[planet.house];
    const tone = SIGN_TONE[planet.rashi] || 'its own distinct energy';
    const nakshatraSentence = ` It is also placed in the ${planet.nakshatra} nakshatra (pada ${planet.nakshatraPada}), which lends this Mahadasha an extra, finer-grained emotional undertone.`;
    const dignitySentence = isClassical(period.lord) ? (DASHA_DIGNITY_NOTE[planetDignity(period.lord as ShadPlanet, getRashi(planet.longitude).index)]?.(cap(period.lord)) ?? '') : '';
    const opener = DASHA_OPENERS_EN[planet.house % DASHA_OPENERS_EN.length];
    const text = opener(cap(period.lord), ordinal(planet.house), houseArea, PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS], planet.rashi, tone) + nakshatraSentence + dignitySentence;
    return { lord: period.lord, text };
  });
}
