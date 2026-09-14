// Full two-person Kundli Matching report: composes the existing chart engine
// (generateKundli, calculateGunMilan, getNavamsaChart, Vimshottari Dasha)
// into one structured response, and adds the two pieces that engine doesn't
// already cover explicitly — Bhakoot/Nadi dosha presence+cancellation
// reasoning (gunMilan.ts only returns raw points for these two kootas) and
// a 7th-house/marriage comparison for both partners. Every cancellation
// rule below is stated, checked and explained rather than silently applied,
// and every "commonly cited but disputed" rule is labelled as such.
import type { BirthDetails, Kundli, NavamsaChart } from './kundli.ts';
import { generateKundli, getNavamsaChart } from './kundli.ts';
import { calculateGunMilan, RASHIS, RASHI_LORD, FRIENDS, ENEMIES, type GunMilanResult } from './gunMilan.ts';
import { getRashi, getNakshatra } from './zodiac.ts';
import { getMahadashaTimeline, getCurrentMahadasha, type MahadashaPeriod } from './vimshottariDasha.ts';
import { buildDashaPredictions, type DashaPrediction } from './dashaPredictions.ts';
import type { PlanetId } from './ephemeris.ts';

const AYANAMSA = 'Lahiri (Chitrapaksha)' as const;

export interface SeventhHouseAnalysis {
  sign: string;
  lord: PlanetId;
  lordHouse: number;
  lordSign: string;
  occupants: PlanetId[];
}

export interface PartnerReport {
  kundli: Kundli;
  navamsaChart: NavamsaChart;
  currentMahadasha: MahadashaPeriod;
  mahadashaTimeline: MahadashaPeriod[];
  dashaPredictions: DashaPrediction[];
  seventhHouse: SeventhHouseAnalysis;
}

export interface DoshaVerdict {
  status: 'Present' | 'Absent' | 'Partially applicable';
  severity: 'Low' | 'Moderate' | 'Strong';
  cancellation: 'None' | 'Partial' | 'Strong' | 'Complete' | 'Not applicable';
  reason: string;
  points: number;
  maxPoints: number;
}

export interface PlanetaryCompatibilityRow {
  label: string;
  bride: { sign: string; house: number };
  groom: { sign: string; house: number };
  relation: 'same-sign' | 'friend' | 'neutral' | 'enemy';
  note: string;
}

export type FinalGrade = 'VERY WEAK' | 'WEAK' | 'MODERATE' | 'GOOD' | 'STRONG';

export interface KundliMatchingReport {
  ayanamsa: typeof AYANAMSA;
  bride: PartnerReport;
  groom: PartnerReport;
  gunMilan: GunMilanResult;
  bhakoot: DoshaVerdict;
  nadi: DoshaVerdict;
  planetaryCompatibility: PlanetaryCompatibilityRow[];
  finalAssessment: { grade: FinalGrade; reasoning: string[] };
}

function relationOf(rashiIndexA: number, rashiIndexB: number): PlanetaryCompatibilityRow['relation'] {
  if (rashiIndexA === rashiIndexB) return 'same-sign';
  const lordA = RASHI_LORD[rashiIndexA];
  const lordB = RASHI_LORD[rashiIndexB];
  if (lordA === lordB) return 'friend';
  const aToB = FRIENDS[lordA]?.includes(lordB) ?? false;
  const bToA = FRIENDS[lordB]?.includes(lordA) ?? false;
  const aEnemyB = ENEMIES[lordA]?.includes(lordB) ?? false;
  const bEnemyA = ENEMIES[lordB]?.includes(lordA) ?? false;
  if (aEnemyB || bEnemyA) return 'enemy';
  if (aToB || bToA) return 'friend';
  return 'neutral';
}

function buildSeventhHouse(kundli: Kundli): SeventhHouseAnalysis {
  const ascIndex = getRashi(kundli.ascendant.longitude).index;
  const seventhIndex = (ascIndex + 6) % 12;
  const lord = RASHI_LORD[seventhIndex] as PlanetId;
  const lordPlanet = kundli.planets.find(p => p.id === lord)!;
  return {
    sign: RASHIS[seventhIndex],
    lord,
    lordHouse: lordPlanet.house,
    lordSign: lordPlanet.rashi,
    occupants: kundli.planets.filter(p => p.house === 7).map(p => p.id),
  };
}

function buildPartnerReport(birth: BirthDetails): PartnerReport {
  const kundli = generateKundli(birth);
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const span = 360 / 27;
  const fractionElapsed = (moon.longitude % span) / span;
  const now = new Date();
  const nakIndex = getNakshatra(moon.longitude).index;
  const mahadashaTimeline = getMahadashaTimeline(birth.utcDate, nakIndex, fractionElapsed, now);
  return {
    kundli,
    navamsaChart: getNavamsaChart(kundli),
    currentMahadasha: getCurrentMahadasha(birth.utcDate, nakIndex, fractionElapsed, now),
    mahadashaTimeline,
    dashaPredictions: buildDashaPredictions(kundli, mahadashaTimeline, 'en'),
    seventhHouse: buildSeventhHouse(kundli),
  };
}

// Bhakoot (Rashi) Dosha: classically arises when the bride's and groom's
// Moon signs are 6-8 (Shadashtak) or 2-12 (Dwirdwadash) apart — exactly the
// 0-point cases in gunMilan.ts's BHAKOOT_POINTS table. Severity and the two
// cancellation checks below are the rules most commonly cited by Vedic
// software (AstroSage/DrikPanchang-style), not a single universally-agreed
// classical formula — the disagreement is disclosed rather than hidden.
function buildBhakootVerdict(kootaPoints: number, brideRashiIndex: number, groomRashiIndex: number): DoshaVerdict {
  const distance = ((groomRashiIndex - brideRashiIndex + 12) % 12) + 1; // 1..12, bride->groom
  const present = kootaPoints === 0;
  if (!present) {
    return { status: 'Absent', severity: 'Low', cancellation: 'Not applicable', points: 7, maxPoints: 7,
      reason: `Bride's Moon (${RASHIS[brideRashiIndex]}) and groom's Moon (${RASHIS[groomRashiIndex]}) are not in a 6-8 or 2-12 relationship, so Bhakoot Dosha does not arise.` };
  }
  const isShadashtak = distance === 6 || distance === 8;
  const lordA = RASHI_LORD[brideRashiIndex];
  const lordB = RASHI_LORD[groomRashiIndex];
  const sameLord = lordA === lordB;
  const mutualFriends = (FRIENDS[lordA]?.includes(lordB) ?? false) && (FRIENDS[lordB]?.includes(lordA) ?? false);
  const cancels = sameLord || mutualFriends;
  return {
    status: 'Present',
    severity: isShadashtak ? 'Strong' : 'Moderate',
    cancellation: cancels ? 'Partial' : 'None',
    points: 0,
    maxPoints: 7,
    reason: `Bride's Moon (${RASHIS[brideRashiIndex]}) and groom's Moon (${RASHIS[groomRashiIndex]}) are in a ${isShadashtak ? '6-8 (Shadashtak — considered more severe)' : '2-12 (Dwirdwadash — considered comparatively milder)'} relationship, the classical Bhakoot Dosha condition. `
      + (cancels
        ? `Commonly-cited (not universally accepted) exception: the two Moon-sign lords, ${lordA} and ${lordB}, ${sameLord ? 'are the same planet' : 'are mutual natural friends'} — many practitioners treat this as reducing the dosha's effect, though it is not treated here as a full cancellation.`
        : `No commonly-cited exception applies here — the Moon-sign lords ${lordA} and ${lordB} are not the same planet and not mutual friends.`),
  };
}

// Nadi Dosha: same Nadi (Aadi/Madhya/Antya) for both — the single point
// (out of 36) most traditions weight heaviest, since it classically concerns
// progeny/health rather than general temperament. The two exceptions below
// ("Nadi Dosha Bhanga") are the ones most commonly cited; several other,
// more elaborate exception lists exist across regional traditions and are
// deliberately not applied here to avoid presenting a disputed list as settled.
function buildNadiVerdict(kootaPoints: number, brideNakIndex: number, groomNakIndex: number, bridePada: number, groomPada: number, brideRashiIndex: number, groomRashiIndex: number): DoshaVerdict {
  const present = kootaPoints === 0;
  if (!present) {
    return { status: 'Absent', severity: 'Low', cancellation: 'Not applicable', points: 8, maxPoints: 8,
      reason: 'Bride and groom fall in different Nadis, so Nadi Dosha does not arise.' };
  }
  const sameNakshatra = brideNakIndex === groomNakIndex;
  const samePada = sameNakshatra && bridePada === groomPada;
  const differentRashiLord = RASHI_LORD[brideRashiIndex] !== RASHI_LORD[groomRashiIndex];
  let cancellation: DoshaVerdict['cancellation'] = 'None';
  let exceptionNote = 'No commonly-cited exception applies — different nakshatras in the same Nadi, with the same Rashi lord.';
  if (sameNakshatra && !samePada) {
    cancellation = 'Strong';
    exceptionNote = 'Both fall in the same nakshatra but different padas — a commonly-cited exception ("Nadi Dosha Bhanga") that most practitioners treat as cancelling the dosha.';
  } else if (!sameNakshatra && differentRashiLord) {
    cancellation = 'Partial';
    exceptionNote = 'Different nakshatras within the same Nadi, but with different Moon-sign lords — a commonly-cited (though more debated) rule some traditions treat as reducing the dosha.';
  }
  return {
    status: 'Present',
    severity: 'Strong',
    cancellation,
    points: 0,
    maxPoints: 8,
    reason: `Bride and groom's Moons both fall in the same Nadi — the classical Nadi Dosha condition, traditionally the most heavily weighted of the 8 kootas. ${exceptionNote}`,
  };
}

function buildPlanetaryCompatibility(bride: Kundli, groom: Kundli): PlanetaryCompatibilityRow[] {
  const find = (k: Kundli, id: PlanetId) => k.planets.find(p => p.id === id)!;
  const rashiIdx = (rashiName: string) => RASHIS.indexOf(rashiName as (typeof RASHIS)[number]);
  const bAsc = getRashi(bride.ascendant.longitude).index;
  const gAsc = getRashi(groom.ascendant.longitude).index;
  const bSeventhLordPlanet = find(bride, RASHI_LORD[(bAsc + 6) % 12] as PlanetId);
  const gSeventhLordPlanet = find(groom, RASHI_LORD[(gAsc + 6) % 12] as PlanetId);

  const row = (label: string, bSign: string, bHouse: number, gSign: string, gHouse: number, note: string): PlanetaryCompatibilityRow => {
    const relation = relationOf(rashiIdx(bSign), rashiIdx(gSign));
    return { label, bride: { sign: bSign, house: bHouse }, groom: { sign: gSign, house: gHouse }, relation, note };
  };

  const bMoon = find(bride, 'moon'), gMoon = find(groom, 'moon');
  const bVenus = find(bride, 'venus'), gVenus = find(groom, 'venus');
  const bMars = find(bride, 'mars'), gMars = find(groom, 'mars');
  const bJupiter = find(bride, 'jupiter'), gJupiter = find(groom, 'jupiter');

  return [
    row('Moon – Moon (emotional nature)', bMoon.rashi, bMoon.house, gMoon.rashi, gMoon.house, 'Same-sign or mutually friendly Moon signs generally indicate easier emotional understanding.'),
    row("Bride's Moon – Groom's Venus (affection)", bMoon.rashi, bMoon.house, gVenus.rashi, gVenus.house, "Groom's Venus in relation to bride's Moon is a traditional indicator of how his affection is received."),
    row("Groom's Moon – Bride's Venus (affection)", gMoon.rashi, gMoon.house, bVenus.rashi, bVenus.house, "Bride's Venus in relation to groom's Moon, the mirror comparison."),
    row('Venus – Mars (romantic/physical compatibility)', bVenus.rashi, bVenus.house, gMars.rashi, gMars.house, "Bride's Venus against groom's Mars — a classical romantic-compatibility comparison."),
    row('Mars – Venus (romantic/physical compatibility)', bMars.rashi, bMars.house, gVenus.rashi, gVenus.house, "Groom's Mars against bride's Venus, the mirror comparison."),
    row('Jupiter – Venus (values & life-philosophy fit)', bJupiter.rashi, bJupiter.house, gVenus.rashi, gVenus.house, "Bride's Jupiter against groom's Venus — traditionally read for shared values."),
    row('Venus – Jupiter (values & life-philosophy fit)', bVenus.rashi, bVenus.house, gJupiter.rashi, gJupiter.house, "Groom's Venus against bride's Jupiter, the mirror comparison."),
    row('Mars – Mars (temperament & drive)', bMars.rashi, bMars.house, gMars.rashi, gMars.house, 'Compares raw temperament/assertiveness placement between the two charts.'),
    row('Ascendant – Ascendant (overall personality)', bride.ascendant.rashi, 1, groom.ascendant.rashi, 1, 'Compares the two Lagnas directly — a broad personality-compatibility indicator.'),
    row('7th Lord – 7th Lord (marriage-house rulers)', bSeventhLordPlanet.rashi, bSeventhLordPlanet.house, gSeventhLordPlanet.rashi, gSeventhLordPlanet.house, "Compares where each chart's own marriage-house (7th) lord actually sits."),
  ];
}

// Final grade: derived transparently from the Guna score band (the same
// 18/24/32 thresholds already used by this app's own verdictForScore), then
// adjusted by exactly one additional, explicitly-stated rule: an uncancelled
// Nadi or strong-uncancelled Bhakoot dosha drops one grade (both
// traditionally weighted heavily regardless of total score). No hidden
// scoring — every adjustment is listed in `reasoning`.
const GRADES: FinalGrade[] = ['VERY WEAK', 'WEAK', 'MODERATE', 'GOOD', 'STRONG'];

function buildFinalAssessment(gunMilan: GunMilanResult, bhakoot: DoshaVerdict, nadi: DoshaVerdict): { grade: FinalGrade; reasoning: string[] } {
  const reasoning: string[] = [];
  let gradeIndex: number;
  if (gunMilan.totalPoints >= 32) { gradeIndex = 4; reasoning.push(`Guna score ${gunMilan.totalPoints}/36 is in the "excellent" band (32+).`); }
  else if (gunMilan.totalPoints >= 24) { gradeIndex = 3; reasoning.push(`Guna score ${gunMilan.totalPoints}/36 is in the "good" band (24-31).`); }
  else if (gunMilan.totalPoints >= 18) { gradeIndex = 2; reasoning.push(`Guna score ${gunMilan.totalPoints}/36 is in the "average/acceptable minimum" band (18-23).`); }
  else { gradeIndex = 0; reasoning.push(`Guna score ${gunMilan.totalPoints}/36 is below the classical minimum (18) — starts at the weakest band.`); }

  if (nadi.status === 'Present' && nadi.cancellation === 'None') {
    gradeIndex = Math.max(0, gradeIndex - 1);
    reasoning.push('Uncancelled Nadi Dosha present — traditionally weighted heavily regardless of total score, so the grade is lowered one step.');
  }
  if (bhakoot.status === 'Present' && bhakoot.severity === 'Strong' && bhakoot.cancellation === 'None') {
    gradeIndex = Math.max(0, gradeIndex - 1);
    reasoning.push('Uncancelled, Shadashtak-type Bhakoot Dosha present — the more severe Bhakoot variant, so the grade is lowered one step.');
  }
  reasoning.push('This grade reflects classical Ashtakoot conventions only and is not a deterministic prediction of marital success or failure.');
  return { grade: GRADES[gradeIndex], reasoning };
}

export function buildKundliMatchingReport(brideBirth: BirthDetails, groomBirth: BirthDetails): KundliMatchingReport {
  const brideReport = buildPartnerReport(brideBirth);
  const groomReport = buildPartnerReport(groomBirth);
  const brideMoon = brideReport.kundli.planets.find(p => p.id === 'moon')!;
  const groomMoon = groomReport.kundli.planets.find(p => p.id === 'moon')!;

  const gunMilan = calculateGunMilan(brideMoon.longitude, groomMoon.longitude);
  const brideRashiIndex = getRashi(brideMoon.longitude).index;
  const groomRashiIndex = getRashi(groomMoon.longitude).index;
  const brideNak = getNakshatra(brideMoon.longitude);
  const groomNak = getNakshatra(groomMoon.longitude);

  const bhakootPoints = gunMilan.kootas.find(k => k.name === 'Bhakoot')!.points;
  const nadiPoints = gunMilan.kootas.find(k => k.name === 'Nadi')!.points;

  const bhakoot = buildBhakootVerdict(bhakootPoints, brideRashiIndex, groomRashiIndex);
  const nadi = buildNadiVerdict(nadiPoints, brideNak.index, groomNak.index, brideNak.pada, groomNak.pada, brideRashiIndex, groomRashiIndex);
  const planetaryCompatibility = buildPlanetaryCompatibility(brideReport.kundli, groomReport.kundli);
  const finalAssessment = buildFinalAssessment(gunMilan, bhakoot, nadi);

  return {
    ayanamsa: AYANAMSA,
    bride: brideReport,
    groom: groomReport,
    gunMilan,
    bhakoot,
    nadi,
    planetaryCompatibility,
    finalAssessment,
  };
}
