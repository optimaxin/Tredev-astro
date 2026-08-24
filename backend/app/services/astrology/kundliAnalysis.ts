// Compositional written analysis — real per-planet house/sign placement
// combined with each planet's classical signification and each house's
// classical life-area. Deliberately not a "prediction generator": it states
// what classical Vedic astrology assigns to a placement, not a specific
// forecast, matching the framing already used by aiGuidance.ts.
import type { ChartPlanet, Kundli } from './kundli.ts';
import type { PlanetId } from './ephemeris.ts';

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

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function planetParagraph(planet: ChartPlanet): string {
  const houseArea = HOUSE_LIFE_AREA[planet.house];
  const retro = planet.retrograde ? ', and is currently retrograde' : '';
  return `Your ${cap(planet.id)} sits in your ${ordinal(planet.house)} house (${houseArea}), placed in ${planet.rashi}${retro}. In classical Vedic astrology, ${cap(planet.id)} governs ${PLANET_SIGNIFICATIONS[planet.id]} — placed here, it lends that energy specifically to matters of ${houseArea}.`;
}

export interface KundliAnalysis {
  lagna: string;
  moon: string;
  planets: { id: PlanetId; text: string }[];
}

export function buildKundliAnalysis(kundli: Kundli): KundliAnalysis {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const lagna = `Your Ascendant (Lagna) is ${kundli.ascendant.rashi} — the lens the rest of your chart is read through: ${ASCENDANT_BLURBS[kundli.ascendant.rashi] || 'it colors how you come across to others.'}`;
  const moonText = `Your Moon is in ${moon.rashi} in your ${ordinal(moon.house)} house, and your Janma Nakshatra is ${kundli.moonNakshatra.name} (Pada ${kundli.moonNakshatra.pada}) — this shapes your emotional nature, instinctive reactions, and is the anchor point for your Vimshottari Dasha timeline.`;

  return {
    lagna,
    moon: moonText,
    planets: kundli.planets.map(p => ({ id: p.id, text: planetParagraph(p) })),
  };
}
