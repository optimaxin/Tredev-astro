// Shared between the Vastu Calculator (pages/calculators/CalculatorPages.tsx)
// and the Kundli result view (sections/KundliSection/KundliSection.tsx) —
// both show the same "read your chart's own Vastu zones" card, so the zone
// list and the significator-planet logic live here once.
import type { KundliResult } from '../services/calculatorService';
import { PLANET_META } from './planetMeta';

export type VastuZoneKey = 'entrance' | 'kitchen' | 'bedroom' | 'pooja' | 'toilet' | 'staircase';

export const VASTU_ZONES: { key: VastuZoneKey; label: { en: string; hi: string } }[] = [
  { key: 'entrance', label: { en: 'Main Entrance', hi: 'मुख्य द्वार' } },
  { key: 'kitchen', label: { en: 'Kitchen', hi: 'रसोई' } },
  { key: 'bedroom', label: { en: 'Master Bedroom', hi: 'मुख्य शयनकक्ष' } },
  { key: 'pooja', label: { en: 'Pooja Room', hi: 'पूजा कक्ष' } },
  { key: 'toilet', label: { en: 'Toilet / Bathroom', hi: 'शौचालय / स्नानघर' } },
  { key: 'staircase', label: { en: 'Staircase', hi: 'सीढ़ियां' } },
];

// Each zone's classical significator planet — the chart placement that
// decides how favorable that zone is for this specific person.
const VASTU_ZONE_SIGNIFICATOR: Record<VastuZoneKey, string> = {
  entrance: 'sun', kitchen: 'mars', bedroom: 'venus', pooja: 'jupiter', toilet: 'saturn', staircase: 'mercury',
};
const PLANET_OWN_SIGNS: Record<string, string[]> = {
  sun: ['Leo'], mars: ['Aries', 'Scorpio'], mercury: ['Gemini', 'Virgo'],
  jupiter: ['Sagittarius', 'Pisces'], venus: ['Taurus', 'Libra'], saturn: ['Capricorn', 'Aquarius'],
};
const PLANET_EXALTATION_SIGN: Record<string, string> = {
  sun: 'Aries', mars: 'Capricorn', mercury: 'Virgo', jupiter: 'Cancer', venus: 'Pisces', saturn: 'Libra',
};
const PLANET_DEBILITATION_SIGN: Record<string, string> = {
  sun: 'Libra', mars: 'Cancer', mercury: 'Pisces', jupiter: 'Capricorn', venus: 'Virgo', saturn: 'Aries',
};
const DUSTHANA_HOUSES = [6, 8, 12];

export type VastuChartVerdict = 'favorable' | 'neutral' | 'caution';

export const VASTU_CHART_VERDICT_META: Record<VastuChartVerdict, { en: string; hi: string; color: string }> = {
  favorable: { en: 'Favorable', hi: 'शुभ', color: '#2f8f4e' },
  neutral: { en: 'Workable', hi: 'सामान्य', color: '#8a7524' },
  caution: { en: 'Needs Care', hi: 'ध्यान दें', color: '#d64545' },
};

export interface VastuZoneReading {
  zone: typeof VASTU_ZONES[number];
  verdict: VastuChartVerdict;
  en: string;
  hi: string;
}

// Always returns one reading per zone (never empty) — every user gets a
// concrete, chart-derived line for every zone, not just a flag on the rare
// zone that happens to be afflicted.
export function getVastuChartReading(kundli: KundliResult): VastuZoneReading[] {
  return VASTU_ZONES.map(zone => {
    const planetId = VASTU_ZONE_SIGNIFICATOR[zone.key];
    const planet = kundli.planets.find(p => p.id === planetId)!;
    const planetName = PLANET_META[planetId]?.name || planetId;

    let verdict: VastuChartVerdict = 'neutral';
    if (planet.rashi === PLANET_EXALTATION_SIGN[planetId] || PLANET_OWN_SIGNS[planetId]?.includes(planet.rashi)) {
      verdict = 'favorable';
    } else if (planet.rashi === PLANET_DEBILITATION_SIGN[planetId] || DUSTHANA_HOUSES.includes(planet.house)) {
      verdict = 'caution';
    }

    const en = {
      favorable: `${planetName} (this zone's significator) is strong in your chart — house ${planet.house}, ${planet.rashi}. This zone naturally supports you; keep it clean and in active use.`,
      neutral: `${planetName} (this zone's significator) sits in house ${planet.house}, ${planet.rashi} — a workable placement. Follow the standard direction guidance below for this zone.`,
      caution: `${planetName} (this zone's significator) is under strain in your chart — house ${planet.house}, ${planet.rashi}. Give this zone extra Vastu care, or a remedy for ${planetName}.`,
    }[verdict];
    const hi = {
      favorable: `${planetName} (इस क्षेत्र का कारक ग्रह) आपकी कुंडली में मजबूत है — भाव ${planet.house}, ${planet.rashi}। यह क्षेत्र स्वाभाविक रूप से आपके अनुकूल है; इसे स्वच्छ और उपयोग में रखें।`,
      neutral: `${planetName} (इस क्षेत्र का कारक ग्रह) भाव ${planet.house}, ${planet.rashi} में स्थित है — एक सामान्य स्थिति। इस क्षेत्र के लिए नीचे दी गई सामान्य दिशा-सलाह का पालन करें।`,
      caution: `${planetName} (इस क्षेत्र का कारक ग्रह) आपकी कुंडली में दबाव में है — भाव ${planet.house}, ${planet.rashi}। इस क्षेत्र पर विशेष वास्तु ध्यान दें, या ${planetName} का उपाय करें।`,
    }[verdict];

    return { zone, verdict, en, hi };
  });
}
