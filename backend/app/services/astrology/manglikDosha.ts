// Mangal Dosha (Manglik) — full analysis, not just a single boolean.
//
// Scope and conventions (stated up front per the classical disagreement
// between schools — see inline notes below for where traditions diverge):
// - Houses counted whole-sign (see zodiac.ts), reference sign itself = house 1.
// - Manglik houses used here: 1, 2, 4, 7, 8, 12 — the "2nd-house-inclusive"
//   convention. Some schools use only 1, 4, 7, 8, 12 (2nd excluded); this is
//   the single most common point of disagreement between traditions and is
//   reported explicitly via `convention`/`housesUsed` rather than silently
//   picked.
// - Aspects (graha drishti) use the standard Parashari whole-sign scheme:
//   every graha aspects the 7th sign from itself; Mars additionally aspects
//   the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th.
// - Rahu/Ketu are counted for CONJUNCTION only (a real, widely-used concept —
//   Mars+node conjunction is "Angarak Yoga"), not for casting aspects: the
//   strict classical (BPHS) position gives the lunar nodes no independent
//   drishti at all, and the popular practice of giving them Jupiter-like
//   aspects is a later, disputed addition that is deliberately NOT applied
//   here to avoid presenting a disputed rule as settled.
import type { Kundli, ChartPlanet } from './kundli.ts';
import { getNavamsaChart } from './kundli.ts';
import { getHouseFromAscendant, getRashi, RASHIS } from './zodiac.ts';
import { OWN_SIGNS, NATURAL_BENEFIC_SHADBALA, NATURAL_MALEFIC_SHADBALA, SHAD_PLANETS, planetDignity, type ShadPlanet, type PlanetDignity } from './shadbalaConstants.ts';
import type { PlanetId } from './ephemeris.ts';

const MANGLIK_HOUSES = new Set([1, 2, 4, 7, 8, 12]);
const CONVENTION = '2nd-house-inclusive' as const;
const HOUSES_USED = [1, 2, 4, 7, 8, 12];

// Sign lordship, derived from the same OWN_SIGNS table Shadbala already uses
// (rung 2 of the ladder: reuse, don't re-type a second rulership table).
const SIGN_LORDS: ShadPlanet[] = new Array(12);
for (const planet of SHAD_PLANETS) {
  for (const signIndex of OWN_SIGNS[planet]) SIGN_LORDS[signIndex] = planet;
}

// Additional (beyond the universal 7th) whole-sign special aspects.
const SPECIAL_ASPECT_OFFSETS: Partial<Record<ShadPlanet, number[]>> = {
  mars: [3, 7], jupiter: [4, 8], saturn: [2, 9],
};

function aspectedSignIndices(planetId: ShadPlanet, signIndex: number): number[] {
  const offsets = [6, ...(SPECIAL_ASPECT_OFFSETS[planetId] ?? [])];
  return offsets.map(o => (signIndex + o) % 12);
}

// Conjunction is checked against the classical grahas plus the nodes
// (Angarak Yoga); the modern outer planets (Uranus/Neptune/Pluto) aren't
// part of the classical Mangal Dosha framework and are excluded.
const CONJUNCTION_CANDIDATES: PlanetId[] = ['sun', 'moon', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

export interface ReferencePointResult {
  referencePoint: 'lagna' | 'moon' | 'venus';
  referenceSign: string;
  marsSign: string;
  house: number;
  inManglikHouse: boolean;
  /** Pure positional fact, before any cancellation is applied. */
  rawIsManglik: boolean;
  dignityCancelled: boolean;
  isManglik: boolean;
}

export interface CancellationCheck {
  rule: string;
  satisfied: boolean;
  explanation: string;
  effect: 'cancels' | 'reduces' | 'none';
}

export interface MarsAnalysis {
  sign: string;
  dignity: PlanetDignity;
  /** Houses (from the Lagna) that Mars rules, by ownership of Aries/Scorpio. */
  rulesHouses: number[];
  conjunctPlanets: PlanetId[];
  aspectedByPlanets: PlanetId[];
  /** Houses (from the Lagna) that Mars's own drishti (7th/4th/8th) reaches. */
  aspectsHouses: number[];
  beneficInfluence: PlanetId[];
  maleficInfluence: PlanetId[];
}

export interface MarriageHouseAnalysis {
  seventhHouseSign: string;
  seventhLord: PlanetId;
  seventhLordHouse: number;
  venusHouse: number;
  venusSign: string;
  jupiterHouse: number;
  jupiterSign: string;
  marsAspectsSeventhHouse: boolean;
  marsAspectsSeventhLord: boolean;
  marsAspectsVenus: boolean;
  marsConjunctSeventhLord: boolean;
  marsConjunctVenus: boolean;
}

export interface NavamsaManglikSupport {
  marsSign: string;
  marsHouse: number;
  seventhHouseSign: string;
  seventhLord: PlanetId;
  venusSign: string;
  jupiterSign: string;
}

export interface MangalDoshaResult {
  // Backward-compatible summary — Lagna-based, post-cancellation. This is
  // the primary/default verdict most Vedic software reports as "Manglik".
  isManglik: boolean;
  marsHouse: number;
  cancelled: boolean;
  rule: 'from-ascendant';

  convention: string;
  housesUsed: number[];

  referencePoints: {
    lagna: ReferencePointResult;
    moon: ReferencePointResult;
    venus: ReferencePointResult;
  };
  /** Raw Lagna-based positional result, before cancellation is applied. */
  basicManglikStatus: boolean;

  marsAnalysis: MarsAnalysis;
  marriageHouseAnalysis: MarriageHouseAnalysis;
  cancellationChecks: CancellationCheck[];
  cancellationGrade: 'NONE' | 'PARTIAL' | 'STRONG' | 'COMPLETE';
  /**
   * This app's own severity heuristic (documented here, not a single
   * universally-agreed classical formula — traditions disagree on this at
   * least as much as on cancellation): LOW once cancellation/reduction is
   * strong enough, otherwise scaled by how many of the 3 reference points
   * (Lagna/Moon/Venus) independently show the raw affliction.
   */
  severity: 'LOW' | 'MODERATE' | 'STRONG';
  navamsa: NavamsaManglikSupport;
}

export function checkMangalDosha(kundli: Kundli): MangalDoshaResult {
  const find = (id: PlanetId): ChartPlanet => kundli.planets.find(p => p.id === id)!;
  const mars = find('mars');
  const venus = find('venus');
  const jupiter = find('jupiter');

  const marsSignIndex = getRashi(mars.longitude).index;
  const moonSignIndex = getRashi(find('moon').longitude).index;
  const venusSignIndex = getRashi(venus.longitude).index;
  const ascendantSignIndex = getRashi(kundli.ascendant.longitude).index;

  const dignity = planetDignity('mars', marsSignIndex);
  const dignityCancels = dignity === 'own-sign' || dignity === 'exalted';

  const buildReferencePoint = (referencePoint: ReferencePointResult['referencePoint'], refSignIndex: number, refSignName: string): ReferencePointResult => {
    const house = getHouseFromAscendant(refSignIndex, marsSignIndex);
    const inManglikHouse = MANGLIK_HOUSES.has(house);
    const dignityCancelled = inManglikHouse && dignityCancels;
    return {
      referencePoint, referenceSign: refSignName, marsSign: RASHIS[marsSignIndex], house,
      inManglikHouse, rawIsManglik: inManglikHouse, dignityCancelled, isManglik: inManglikHouse && !dignityCancelled,
    };
  };

  const lagnaRef = buildReferencePoint('lagna', ascendantSignIndex, kundli.ascendant.rashi);
  const moonRef = buildReferencePoint('moon', moonSignIndex, RASHIS[moonSignIndex]);
  const venusRef = buildReferencePoint('venus', venusSignIndex, RASHIS[venusSignIndex]);

  // Mars strength/relationship analysis.
  const conjunctPlanets = kundli.planets
    .filter(p => CONJUNCTION_CANDIDATES.includes(p.id) && getRashi(p.longitude).index === marsSignIndex)
    .map(p => p.id);
  const aspectedByPlanets = SHAD_PLANETS
    .filter((id): id is ShadPlanet => id !== 'mars')
    .filter(id => aspectedSignIndices(id, getRashi(find(id).longitude).index).includes(marsSignIndex))
    .map(id => id as PlanetId);
  const marsAspectedSigns = aspectedSignIndices('mars', marsSignIndex);
  const influencers = Array.from(new Set([...conjunctPlanets, ...aspectedByPlanets]));

  const marsAnalysis: MarsAnalysis = {
    sign: RASHIS[marsSignIndex],
    dignity,
    rulesHouses: OWN_SIGNS.mars.map(signIndex => getHouseFromAscendant(ascendantSignIndex, signIndex)),
    conjunctPlanets,
    aspectedByPlanets,
    aspectsHouses: marsAspectedSigns.map(signIndex => getHouseFromAscendant(ascendantSignIndex, signIndex)),
    beneficInfluence: influencers.filter(id => (NATURAL_BENEFIC_SHADBALA as string[]).includes(id)),
    maleficInfluence: influencers.filter(id => (NATURAL_MALEFIC_SHADBALA as string[]).includes(id) || id === 'rahu' || id === 'ketu'),
  };

  // Marriage-house (7th house/lord, Venus, Jupiter) analysis.
  const seventhSignIndex = (ascendantSignIndex + 6) % 12;
  const seventhLord = SIGN_LORDS[seventhSignIndex] as PlanetId;
  const seventhLordPlanet = find(seventhLord);
  const marriageHouseAnalysis: MarriageHouseAnalysis = {
    seventhHouseSign: RASHIS[seventhSignIndex],
    seventhLord,
    seventhLordHouse: seventhLordPlanet.house,
    venusHouse: venus.house,
    venusSign: RASHIS[venusSignIndex],
    jupiterHouse: jupiter.house,
    jupiterSign: RASHIS[getRashi(jupiter.longitude).index],
    marsAspectsSeventhHouse: marsAspectedSigns.includes(seventhSignIndex),
    marsAspectsSeventhLord: marsAspectedSigns.includes(getRashi(seventhLordPlanet.longitude).index),
    marsAspectsVenus: marsAspectedSigns.includes(venusSignIndex),
    marsConjunctSeventhLord: seventhLordPlanet.house === mars.house,
    marsConjunctVenus: venus.house === mars.house,
  };

  // Cancellation/reduction — evaluated against the Lagna reference point,
  // the primary one; each rule is stated, checked, and explained rather than
  // silently applied (per the instructions this was built from).
  const jupiterConjunct = conjunctPlanets.includes('jupiter');
  const jupiterAspects = aspectedByPlanets.includes('jupiter');
  const jupiterInvolved = jupiterConjunct || jupiterAspects;
  const agreementCount = [lagnaRef, moonRef, venusRef].filter(r => r.rawIsManglik).length;

  const cancellationChecks: CancellationCheck[] = [
    {
      rule: 'Mars in own sign (Aries/Scorpio) within a Manglik house',
      satisfied: lagnaRef.inManglikHouse && dignity === 'own-sign',
      explanation: dignity === 'own-sign'
        ? `Mars is in ${RASHIS[marsSignIndex]}, its own sign, while occupying house ${lagnaRef.house} from the Lagna — classically Mars is too dignified here to afflict.`
        : `Mars is in ${RASHIS[marsSignIndex]} (dignity: ${dignity}), not its own sign (Aries/Scorpio), so this rule does not apply.`,
      effect: (lagnaRef.inManglikHouse && dignity === 'own-sign') ? 'cancels' : 'none',
    },
    {
      rule: 'Mars in exaltation sign (Capricorn) within a Manglik house',
      satisfied: lagnaRef.inManglikHouse && dignity === 'exalted',
      explanation: dignity === 'exalted'
        ? `Mars is exalted in ${RASHIS[marsSignIndex]} while occupying house ${lagnaRef.house} — most popular Vedic software treats this as cancelling the dosha, though a minority view holds an exalted malefic in a dusthana (6th/8th/12th) house isn't fully purified. That minority view is noted here, not applied.`
        : `Mars is in ${RASHIS[marsSignIndex]}, not its exaltation sign (Capricorn), so this rule does not apply.`,
      effect: (lagnaRef.inManglikHouse && dignity === 'exalted') ? 'cancels' : 'none',
    },
    {
      rule: "Jupiter's conjunction or aspect on Mars",
      satisfied: jupiterInvolved,
      explanation: jupiterInvolved
        ? `Jupiter ${jupiterConjunct ? 'is conjunct' : 'aspects'} Mars, which many (not all) traditions treat as tempering the dosha's severity — a commonly cited practical rule, not a universally accepted classical (BPHS-sourced) cancellation.`
        : 'Jupiter neither conjoins nor aspects Mars in this chart, so this rule does not apply.',
      effect: jupiterInvolved ? 'reduces' : 'none',
    },
    {
      rule: 'Agreement across Lagna, Moon and Venus reference points',
      satisfied: true,
      explanation: `Raw (pre-cancellation) Manglik indication appears at ${agreementCount} of 3 reference points (Lagna, Moon, Venus). Many practitioners treat agreement across all three as full/strong Manglik and a single reference point (especially Venus alone) as comparatively weak — a severity heuristic, not a cancellation rule; traditions weight the three reference points differently.`,
      effect: 'none',
    },
  ];

  let cancellationGrade: MangalDoshaResult['cancellationGrade'] = 'NONE';
  if (lagnaRef.rawIsManglik) {
    if (dignityCancels) cancellationGrade = 'COMPLETE';
    else if (jupiterConjunct && marsAnalysis.maleficInfluence.length === 0) cancellationGrade = 'STRONG';
    else if (jupiterInvolved) cancellationGrade = 'PARTIAL';
  }

  const isManglik = lagnaRef.rawIsManglik && cancellationGrade !== 'COMPLETE';
  const cancelled = lagnaRef.rawIsManglik && cancellationGrade === 'COMPLETE';

  let severity: MangalDoshaResult['severity'] = 'LOW';
  if (isManglik) {
    if (cancellationGrade === 'STRONG') severity = 'LOW';
    else if (cancellationGrade === 'PARTIAL') severity = agreementCount >= 2 ? 'MODERATE' : 'LOW';
    else severity = agreementCount >= 2 ? 'STRONG' : 'MODERATE';
  }

  // Navamsa (D9) — supporting cross-check only, not a substitute for the D1 result above.
  const d9 = getNavamsaChart(kundli);
  const d9AscIndex = (RASHIS as readonly string[]).indexOf(d9.ascendant.rashi);
  const d9SeventhLord = SIGN_LORDS[(d9AscIndex + 6) % 12] as PlanetId;
  const findD9 = (id: PlanetId) => d9.planets.find(p => p.id === id)!;
  const navamsa: NavamsaManglikSupport = {
    marsSign: findD9('mars').rashi,
    marsHouse: findD9('mars').house,
    seventhHouseSign: RASHIS[(d9AscIndex + 6) % 12],
    seventhLord: d9SeventhLord,
    venusSign: findD9('venus').rashi,
    jupiterSign: findD9('jupiter').rashi,
  };

  return {
    isManglik, marsHouse: lagnaRef.house, cancelled, rule: 'from-ascendant',
    convention: CONVENTION, housesUsed: HOUSES_USED,
    referencePoints: { lagna: lagnaRef, moon: moonRef, venus: venusRef },
    basicManglikStatus: lagnaRef.rawIsManglik,
    marsAnalysis, marriageHouseAnalysis, cancellationChecks, cancellationGrade, severity, navamsa,
  };
}
