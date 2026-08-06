import { getAscendant, getPlanetaryPositions, type ChartPoint } from "./ephemeris";
import { RASHI_NAMES } from "./constants";

export type KundliInput = { date: Date; latitude: number; longitude: number };

export type KundliHouse = { house: number; rashiIndex: number; rashi: string; planets: ChartPoint["name"][] };

export type KundliChart = {
  ascendant: ChartPoint;
  planets: ChartPoint[];
  houses: KundliHouse[];
  mangalDosha: boolean;
};

const MANGAL_DOSHA_HOUSES = new Set([1, 2, 4, 7, 8, 12]);

// Whole Sign house system: house 1 = the ascendant's rashi, house N holds
// the rashi (ascendant rashi + N - 1). Simple, classical, and unambiguous
// compared to quadrant systems that need extra house-cusp math.
export function generateKundli(input: KundliInput): KundliChart {
  const ascendant = getAscendant(input.date, input.latitude, input.longitude);
  const planets = getPlanetaryPositions(input.date);

  const houses: KundliHouse[] = Array.from({ length: 12 }, (_, i) => {
    const rashiIndex = (ascendant.rashiIndex + i) % 12;
    return {
      house: i + 1,
      rashiIndex,
      rashi: RASHI_NAMES[rashiIndex],
      planets: planets.filter((p) => p.rashiIndex === rashiIndex).map((p) => p.name),
    };
  });

  // Classical Mangal (Kuja) Dosha: Mars sitting in houses 1, 2, 4, 7, 8, or
  // 12 counted from the Ascendant. (The Moon-counted variant is skipped —
  // documented simplification, same as the Ashtakoot exceptions.)
  const marsHouse = houses.find((h) => h.planets.includes("Mars"));
  const mangalDosha = marsHouse ? MANGAL_DOSHA_HOUSES.has(marsHouse.house) : false;

  return { ascendant, planets, houses, mangalDosha };
}
