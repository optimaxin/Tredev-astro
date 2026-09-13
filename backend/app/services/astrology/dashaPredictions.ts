// Per-Mahadasha written predictions — same compositional, non-speculative
// approach as kundliAnalysis.ts (real house + sign placement + classical
// signification), extended to each of the 9 Vimshottari periods. Deliberately
// does not fabricate specific life events (marriage timing, child's gender,
// etc.) the way some commercial reports do — it states what classical Vedic
// astrology assigns to the placement, not a forecast of particular events.
import type { Kundli } from './kundli.ts';
import type { MahadashaPeriod } from './vimshottariDasha.ts';
import { PLANET_SIGNIFICATIONS, PLANET_SIGNIFICATIONS_HI, HOUSE_LIFE_AREA, HOUSE_LIFE_AREA_HI, ordinal, cap } from './kundliAnalysis.ts';
import { HINDI_PLANET, HINDI_RASHI, HINDI_HOUSE_ORDINAL } from './hindiVocab.ts';

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
      const text = `${lordHi} आपके ${HINDI_HOUSE_ORDINAL[planet.house]} भाव (${houseAreaHi}) में ${HINDI_RASHI[planet.rashi] || planet.rashi} राशि में स्थित है। शास्त्रीय रूप से, ${lordHi} ${PLANET_SIGNIFICATIONS_HI[period.lord as keyof typeof PLANET_SIGNIFICATIONS_HI]} का कारक है — इस महादशा के दौरान, यह विषय विशेष रूप से ${houseAreaHi} के इर्द-गिर्द उभरता है, जिसमें ${planet.rashi ? HINDI_RASHI[planet.rashi] || planet.rashi : ''} राशि में स्थिति से ${toneHi} का पुट रहता है।`;
      return { lord: period.lord, text };
    }
    if (!planet) {
      return { lord: period.lord, text: `${cap(period.lord)} Mahadasha — this period is timed from your Moon's nakshatra; ${cap(period.lord)}'s classical significations of ${PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS] ?? 'its karmic themes'} come to the fore.` };
    }
    const houseArea = HOUSE_LIFE_AREA[planet.house];
    const tone = SIGN_TONE[planet.rashi] || 'its own distinct energy';
    const text = `${cap(period.lord)} sits in your ${ordinal(planet.house)} house (${houseArea}) in ${planet.rashi}. Classically, ${cap(period.lord)} governs ${PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS]} — during this Mahadasha, that theme comes forward specifically around ${houseArea}, carried with ${tone} from its placement in ${planet.rashi}.`;
    return { lord: period.lord, text };
  });
}
