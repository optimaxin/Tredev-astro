// Per-Mahadasha written predictions — same compositional, non-speculative
// approach as kundliAnalysis.ts (real house + sign placement + classical
// signification), extended to each of the 9 Vimshottari periods. Deliberately
// does not fabricate specific life events (marriage timing, child's gender,
// etc.) the way some commercial reports do — it states what classical Vedic
// astrology assigns to the placement, not a forecast of particular events.
import type { Kundli } from './kundli.ts';
import type { MahadashaPeriod } from './vimshottariDasha.ts';
import { PLANET_SIGNIFICATIONS, HOUSE_LIFE_AREA, ordinal, cap } from './kundliAnalysis.ts';

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

export interface DashaPrediction {
  lord: string;
  text: string;
}

export function buildDashaPredictions(kundli: Kundli, mahadashaTimeline: MahadashaPeriod[]): DashaPrediction[] {
  return mahadashaTimeline.map(period => {
    const planet = kundli.planets.find(p => p.id === period.lord);
    if (!planet) {
      return { lord: period.lord, text: `${cap(period.lord)} Mahadasha — this period is timed from your Moon's nakshatra; ${cap(period.lord)}'s classical significations of ${PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS] ?? 'its karmic themes'} come to the fore.` };
    }
    const houseArea = HOUSE_LIFE_AREA[planet.house];
    const tone = SIGN_TONE[planet.rashi] || 'its own distinct energy';
    const text = `${cap(period.lord)} sits in your ${ordinal(planet.house)} house (${houseArea}) in ${planet.rashi}. Classically, ${cap(period.lord)} governs ${PLANET_SIGNIFICATIONS[period.lord as keyof typeof PLANET_SIGNIFICATIONS]} — during this Mahadasha, that theme comes forward specifically around ${houseArea}, carried with ${tone} from its placement in ${planet.rashi}.`;
    return { lord: period.lord, text };
  });
}
