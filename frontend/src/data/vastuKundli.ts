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

// Classical best-facing direction per zone (the top "excellent" pick from
// the full direction-by-direction rulebook in the standalone Vastu
// Calculator). Folded directly into the reading text below so it's a
// complete, actionable line on its own — the old wording pointed to "the
// direction guidance below," which only exists on the Vastu Calculator page,
// not here on the Kundli result tab, making the reading a dead end.
const IDEAL_ZONE_DIRECTION: Record<VastuZoneKey, { en: string; hi: string }> = {
  entrance: { en: 'North or North-East', hi: 'उत्तर या ईशान (उत्तर-पूर्व)' },
  kitchen: { en: 'South-East', hi: 'आग्नेय (दक्षिण-पूर्व)' },
  bedroom: { en: 'South-West', hi: 'नैऋत्य (दक्षिण-पश्चिम)' },
  pooja: { en: 'North-East', hi: 'ईशान (उत्तर-पूर्व)' },
  toilet: { en: 'North-West', hi: 'वायव्य (उत्तर-पश्चिम)' },
  staircase: { en: 'South', hi: 'दक्षिण' },
};

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

    const idealDir = IDEAL_ZONE_DIRECTION[zone.key];

    const en = {
      favorable: `${planetName} (this zone's significator) is strong in your chart — house ${planet.house}, ${planet.rashi}. This zone naturally supports you. Classically, ${zone.label.en.toLowerCase()} works best facing ${idealDir.en} — align it there if you can, keep it clean, and in active use.`,
      neutral: `${planetName} (this zone's significator) sits in house ${planet.house}, ${planet.rashi} — a workable placement, neither a strong boost nor a strain. Classically, ${zone.label.en.toLowerCase()} works best facing ${idealDir.en}; if yours doesn't, that's fine — just keep this space simple and uncluttered.`,
      caution: `${planetName} (this zone's significator) is under strain in your chart — house ${planet.house}, ${planet.rashi}. Give this zone extra care: face it ${idealDir.en} if you're renovating, keep it especially clean, or take up a remedy for ${planetName}.`,
    }[verdict];
    const hi = {
      favorable: `${planetName} (इस क्षेत्र का कारक ग्रह) आपकी कुंडली में मजबूत है — भाव ${planet.house}, ${planet.rashi}। यह क्षेत्र स्वाभाविक रूप से आपके अनुकूल है। शास्त्रीय रूप से, ${zone.label.hi} के लिए सबसे उत्तम दिशा ${idealDir.hi} है — यदि संभव हो तो इसी दिशा में रखें, स्वच्छ और उपयोग में रखें।`,
      neutral: `${planetName} (इस क्षेत्र का कारक ग्रह) भाव ${planet.house}, ${planet.rashi} में स्थित है — एक सामान्य स्थिति, न विशेष लाभ न हानि। शास्त्रीय रूप से, ${zone.label.hi} के लिए सबसे उत्तम दिशा ${idealDir.hi} है; यदि आपका ऐसा नहीं है तो चिंता की बात नहीं — बस इस स्थान को सरल और अव्यवस्था-मुक्त रखें।`,
      caution: `${planetName} (इस क्षेत्र का कारक ग्रह) आपकी कुंडली में दबाव में है — भाव ${planet.house}, ${planet.rashi}। इस क्षेत्र पर विशेष ध्यान दें: नवीनीकरण करते समय इसे ${idealDir.hi} दिशा में रखें, इसे विशेष रूप से स्वच्छ रखें, या ${planetName} का उपाय करें।`,
    }[verdict];

    return { zone, verdict, en, hi };
  });
}
