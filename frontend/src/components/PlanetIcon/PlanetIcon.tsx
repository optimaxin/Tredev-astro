import { PLANET_META } from '../../data/planetMeta';

// Renders the illustrated planet image (Extra/Icons/planets) when one
// exists for this id, falling back to the Unicode glyph for Rahu/Ketu/
// Ascendant (no physical body to illustrate).
export default function PlanetIcon({ id, size = 20 }: { id: string; size?: number }) {
  const meta = PLANET_META[id];
  if (meta?.icon) {
    return <img src={meta.icon} alt={meta.name} width={size} height={size} style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }} />;
  }
  return <span style={{ fontSize: size * 0.8 }}>{meta?.symbol || '✦'}</span>;
}
