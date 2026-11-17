// Generic, non-personalized planet display metadata (name/symbol/significance)
// shared by every page that renders a planet id returned from the backend
// (Free Kundli chart, Daily Horoscope transits, etc). The real per-user data
// — sign, house, degree — always comes from the API; this is just labeling.
export interface PlanetMeta {
  name: string;
  symbol: string;
  // Illustrated planet icon (Extra/Icons/planets) — only exists for the 9
  // classical grahas that have a real celestial body. Rahu/Ketu (lunar
  // nodes) and the Ascendant have no physical planet, so no icon: callers
  // fall back to `symbol` for those.
  icon?: string;
  quality: string;
}

export const PLANET_META: Record<string, PlanetMeta> = {
  sun: { name: 'Sun', symbol: '☉', icon: '/images/planets/sun.png', quality: 'Identity · vitality · self-expression' },
  moon: { name: 'Moon', symbol: '☽', icon: '/images/planets/moon.png', quality: 'Mind · emotions · inner world' },
  mercury: { name: 'Mercury', symbol: '☿', icon: '/images/planets/mercury.png', quality: 'Communication · intellect · adaptability' },
  venus: { name: 'Venus', symbol: '♀', icon: '/images/planets/venus.png', quality: 'Love · beauty · pleasures · art' },
  mars: { name: 'Mars', symbol: '♂', icon: '/images/planets/mars.png', quality: 'Energy · drive · courage · action' },
  jupiter: { name: 'Jupiter', symbol: '♃', icon: '/images/planets/jupiter.png', quality: 'Wisdom · expansion · abundance · grace' },
  saturn: { name: 'Saturn', symbol: '♄', icon: '/images/planets/saturn.png', quality: 'Discipline · karma · structure · time' },
  uranus: { name: 'Uranus', symbol: '♅', icon: '/images/planets/uranus.png', quality: 'Sudden change · originality · rebellion' },
  neptune: { name: 'Neptune', symbol: '♆', icon: '/images/planets/neptune.png', quality: 'Imagination · illusion · idealism' },
  pluto: { name: 'Pluto', symbol: '♇', icon: '/images/planets/pluto.png', quality: 'Deep transformation · hidden power · regeneration' },
  rahu: { name: 'Rahu', symbol: '☊', quality: 'Desire · ambition · future karma' },
  ketu: { name: 'Ketu', symbol: '☋', quality: 'Liberation · past karma · spirituality' },
  asc: { name: 'Ascendant', symbol: '↑', quality: 'Self · physical body · first impression · vitality' },
};
