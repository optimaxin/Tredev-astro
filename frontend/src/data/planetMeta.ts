// Generic, non-personalized planet display metadata (name/symbol/significance)
// shared by every page that renders a planet id returned from the backend
// (Free Kundli chart, Daily Horoscope transits, etc). The real per-user data
// — sign, house, degree — always comes from the API; this is just labeling.
export interface PlanetMeta {
  name: string;
  symbol: string;
  quality: string;
}

export const PLANET_META: Record<string, PlanetMeta> = {
  sun: { name: 'Sun', symbol: '☉', quality: 'Identity · vitality · self-expression' },
  moon: { name: 'Moon', symbol: '☽', quality: 'Mind · emotions · inner world' },
  mercury: { name: 'Mercury', symbol: '☿', quality: 'Communication · intellect · adaptability' },
  venus: { name: 'Venus', symbol: '♀', quality: 'Love · beauty · pleasures · art' },
  mars: { name: 'Mars', symbol: '♂', quality: 'Energy · drive · courage · action' },
  jupiter: { name: 'Jupiter', symbol: '♃', quality: 'Wisdom · expansion · abundance · grace' },
  saturn: { name: 'Saturn', symbol: '♄', quality: 'Discipline · karma · structure · time' },
  rahu: { name: 'Rahu', symbol: '☊', quality: 'Desire · ambition · future karma' },
  ketu: { name: 'Ketu', symbol: '☋', quality: 'Liberation · past karma · spirituality' },
  asc: { name: 'Ascendant', symbol: '↑', quality: 'Self · physical body · first impression · vitality' },
};
