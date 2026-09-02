// Lal Kitab's "Pakka Ghar" (permanent house) of each classical graha — a
// distinct framework from Parashari sign-lordship, cross-checked against 2
// independent sources that closely agreed (astrobix.com, paramarsh.app)
// after a 3rd source turned out to conflate this with unrelated concepts
// (own-sign/exaltation) and was discarded. Deliberately NOT attempting Lal
// Kitab's "Rin" (planetary debt) system here — that has no single agreed
// rule table across sources/teachers, so it's skipped rather than guessed.
import type { PlanetId } from './ephemeris.ts';
import type { Kundli } from './kundli.ts';

export const LAL_KITAB_PAKKA_GHAR: Partial<Record<PlanetId, number[]>> = {
  sun: [1],
  moon: [4],
  mars: [3, 8],
  mercury: [6, 7],
  jupiter: [2, 5, 9, 12],
  venus: [7],
  saturn: [8, 10, 11],
  rahu: [12],
  ketu: [6],
};

export interface LalKitabHouseEntry {
  planetId: PlanetId;
  house: number;
  pakkaGhar: number[];
  inOwnHouse: boolean;
}

export interface LalKitabResult {
  houses: LalKitabHouseEntry[];
}

// Whether each of the 9 classical grahas sits in its own Lal Kitab
// permanent house in this person's real (whole-sign) chart — a fixed
// classical rule applied to real computed positions, not a generated
// prediction.
export function getLalKitabHouses(kundli: Kundli): LalKitabResult {
  const houses = kundli.planets
    .filter((p): p is typeof p & { id: keyof typeof LAL_KITAB_PAKKA_GHAR } => p.id in LAL_KITAB_PAKKA_GHAR)
    .map(p => {
      const pakkaGhar = LAL_KITAB_PAKKA_GHAR[p.id]!;
      return { planetId: p.id, house: p.house, pakkaGhar, inOwnHouse: pakkaGhar.includes(p.house) };
    });
  return { houses };
}
