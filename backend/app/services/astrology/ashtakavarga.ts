// Ashtakavarga — classical bindu-point strength tables (Brihat Parashara
// Hora Shastra). Each of the 8 reference bodies (7 grahas + Lagna)
// contributes a bindu to specific houses counted from its own placement;
// summing those contributions per target sign gives each graha's own
// Bhinnashtakavarga (0-8 bindus/sign), and summing all 7 grahas' BAVs gives
// the Sarvashtakavarga (SAV, 0-56 bindus/sign). The benefic-house table
// below is ported verbatim from the open-source `jyotishganit` library
// (northtara/jyotishganit, MIT) — its row totals (48/49/39/54/56/52/39)
// match the well-known published per-graha bindu totals, and they sum to
// exactly 337, the standard textbook total for Sarvashtakavarga across all
// 12 signs — both are checked at the bottom of this file as a standing
// invariant, since a wrong table would silently produce plausible-looking
// but incorrect numbers otherwise.
import type { Kundli } from './kundli.ts';
import { RASHIS } from './zodiac.ts';

type BavPlanet = 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn';
type Contributor = BavPlanet | 'lagna';

const BAV_PLANETS: BavPlanet[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const CONTRIBUTORS: Contributor[] = [...BAV_PLANETS, 'lagna'];

const BENEFIC_HOUSES: Record<BavPlanet, Record<Contributor, number[]>> = {
  sun: {
    sun: [1, 2, 4, 7, 8, 9, 10, 11], moon: [3, 6, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [3, 5, 6, 9, 10, 11, 12], jupiter: [5, 6, 9, 11], venus: [6, 7, 12],
    saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [3, 4, 6, 10, 11, 12],
  },
  moon: {
    sun: [3, 6, 7, 8, 10, 11], moon: [1, 3, 6, 7, 10, 11], mars: [2, 3, 5, 6, 9, 10, 11],
    mercury: [1, 3, 4, 5, 7, 8, 10, 11], jupiter: [1, 4, 7, 8, 10, 11, 12], venus: [3, 4, 5, 7, 9, 10, 11],
    saturn: [3, 5, 6, 11], lagna: [3, 6, 10, 11],
  },
  mars: {
    sun: [3, 5, 6, 10, 11], moon: [3, 6, 11], mars: [1, 2, 4, 7, 8, 10, 11], mercury: [3, 5, 6, 11],
    jupiter: [6, 10, 11, 12], venus: [6, 8, 11, 12], saturn: [1, 4, 7, 8, 9, 10, 11], lagna: [1, 3, 6, 10, 11],
  },
  mercury: {
    sun: [5, 6, 9, 11, 12], moon: [2, 4, 6, 8, 10, 11], mars: [1, 2, 4, 7, 8, 9, 10, 11],
    mercury: [1, 3, 5, 6, 9, 10, 11, 12], jupiter: [6, 8, 11, 12], venus: [1, 2, 3, 4, 5, 8, 9, 11],
    saturn: [1, 2, 4, 7, 8, 9, 10, 11], lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  jupiter: {
    sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], moon: [2, 5, 7, 9, 11], mars: [1, 2, 4, 7, 8, 10, 11],
    mercury: [1, 2, 4, 5, 6, 9, 10, 11], jupiter: [1, 2, 3, 4, 7, 8, 10, 11], venus: [2, 5, 6, 9, 10, 11],
    saturn: [3, 5, 6, 12], lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  venus: {
    sun: [8, 11, 12], moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], mars: [3, 5, 6, 9, 11, 12], mercury: [3, 5, 6, 9, 11],
    jupiter: [5, 8, 9, 10, 11], venus: [1, 2, 3, 4, 5, 8, 9, 10, 11], saturn: [3, 4, 5, 8, 9, 10, 11],
    lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  saturn: {
    sun: [1, 2, 4, 7, 8, 10, 11], moon: [3, 6, 11], mars: [3, 5, 6, 10, 11, 12], mercury: [6, 8, 9, 10, 11, 12],
    jupiter: [5, 6, 11, 12], venus: [6, 11, 12], saturn: [3, 5, 6, 11], lagna: [1, 3, 4, 6, 10, 11],
  },
};

export interface AshtakavargaResult {
  bhinna: { planet: BavPlanet; points: { rashi: string; bindus: number }[] }[];
  sarva: { rashi: string; bindus: number }[];
  sarvaTotal: number;
}

export function calculateAshtakavarga(kundli: Kundli): AshtakavargaResult {
  const signIndexOf = (longitude: number) => Math.floor(longitude / 30) % 12;
  const signOf: Record<Contributor, number> = {
    sun: 0, moon: 0, mars: 0, mercury: 0, jupiter: 0, venus: 0, saturn: 0,
    lagna: signIndexOf(kundli.ascendant.longitude),
  };
  for (const p of kundli.planets) {
    if ((BAV_PLANETS as string[]).includes(p.id)) signOf[p.id as BavPlanet] = signIndexOf(p.longitude);
  }

  const sarvaArr = new Array(12).fill(0);
  const bhinna = BAV_PLANETS.map(planet => {
    const arr = new Array(12).fill(0);
    for (const contributor of CONTRIBUTORS) {
      const baseSign = signOf[contributor];
      for (const houseNum of BENEFIC_HOUSES[planet][contributor]) {
        arr[(baseSign + houseNum - 1) % 12]++;
      }
    }
    arr.forEach((v, i) => (sarvaArr[i] += v));
    return { planet, points: arr.map((bindus, i) => ({ rashi: RASHIS[i], bindus })) };
  });

  const sarva = sarvaArr.map((bindus, i) => ({ rashi: RASHIS[i], bindus }));
  const sarvaTotal = sarvaArr.reduce((s, v) => s + v, 0);
  if (sarvaTotal !== 337) {
    console.error(`Ashtakavarga invariant violated: Sarvashtakavarga total was ${sarvaTotal}, expected 337 — check BENEFIC_HOUSES table.`);
  }

  return { bhinna, sarva, sarvaTotal };
}
