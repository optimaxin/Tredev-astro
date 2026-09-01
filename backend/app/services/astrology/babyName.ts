// Nakshatra-Pada naming syllables (Namakaran) — the classical 27x4=108
// table assigning one starting syllable to each of a Nakshatra's 4 padas,
// codified in texts like Brihat Parashara Hora Shastra. Cross-checked
// against 3 independent sources (drikpanchang's dedicated Swar Siddhanta
// table, vedicmarga, and per-nakshatra baby-name pages) before shipping;
// where sources disagreed (Ardra pada 3, Vishakha pada 2/3, Mula pada 3/4,
// Purva Ashadha, Uttara Bhadrapada pada 4) the majority/most-precise
// reading was used. Order matches zodiac.ts's NAKSHATRAS array exactly.
import type { Kundli } from './kundli.ts';
import { NAKSHATRAS, getNakshatra } from './zodiac.ts';

export const PADA_SYLLABLES: string[][] = [
  ['Chu', 'Che', 'Cho', 'La'], // Ashwini
  ['Li', 'Lu', 'Le', 'Lo'], // Bharani
  ['A', 'I', 'U', 'E'], // Krittika
  ['O', 'Va', 'Vi', 'Vu'], // Rohini
  ['Ve', 'Vo', 'Ka', 'Ki'], // Mrigashira
  ['Ku', 'Gha', 'Ng', 'Chha'], // Ardra
  ['Ke', 'Ko', 'Ha', 'Hi'], // Punarvasu
  ['Hu', 'He', 'Ho', 'Da'], // Pushya
  ['Di', 'Du', 'De', 'Do'], // Ashlesha
  ['Ma', 'Mi', 'Mu', 'Me'], // Magha
  ['Mo', 'Ta', 'Ti', 'Tu'], // Purva Phalguni
  ['Te', 'To', 'Pa', 'Pi'], // Uttara Phalguni
  ['Pu', 'Sha', 'Na', 'Tha'], // Hasta
  ['Pe', 'Po', 'Ra', 'Ri'], // Chitra
  ['Ru', 'Re', 'Ro', 'Ta'], // Swati
  ['Ti', 'Tu', 'Te', 'To'], // Vishakha
  ['Na', 'Ni', 'Nu', 'Ne'], // Anuradha
  ['No', 'Ya', 'Yi', 'Yu'], // Jyeshtha
  ['Ye', 'Yo', 'Bha', 'Bhi'], // Mula
  ['Bhu', 'Dha', 'Pha', 'Dha'], // Purva Ashadha
  ['Bhe', 'Bho', 'Ja', 'Ji'], // Uttara Ashadha
  ['Khi', 'Khu', 'Khe', 'Kho'], // Shravana
  ['Ga', 'Gi', 'Gu', 'Ge'], // Dhanishtha
  ['Go', 'Sa', 'Si', 'Su'], // Shatabhisha
  ['Se', 'So', 'Da', 'Di'], // Purva Bhadrapada
  ['Du', 'Tha', 'Jha', 'Na'], // Uttara Bhadrapada
  ['De', 'Do', 'Cha', 'Chi'], // Revati
];

export interface BabyNameResult {
  nakshatra: string;
  pada: number;
  syllable: string;
  allSyllablesInNakshatra: string[];
}

export function getBabyNameSyllable(kundli: Kundli): BabyNameResult {
  const nakshatraIndex = NAKSHATRAS.indexOf(kundli.moonNakshatra.name as (typeof NAKSHATRAS)[number]);
  const syllables = PADA_SYLLABLES[nakshatraIndex];
  return {
    nakshatra: kundli.moonNakshatra.name,
    pada: kundli.moonNakshatra.pada,
    syllable: syllables[kundli.moonNakshatra.pada - 1],
    allSyllablesInNakshatra: syllables,
  };
}

// Exported for the self-check below and for callers that already have a
// raw sidereal longitude and want the syllable without a full Kundli.
export function getBabyNameSyllableForLongitude(siderealLongitude: number): BabyNameResult {
  const { index, name, pada } = getNakshatra(siderealLongitude);
  const syllables = PADA_SYLLABLES[index];
  return { nakshatra: name, pada, syllable: syllables[pada - 1], allSyllablesInNakshatra: syllables };
}

// ponytail self-check: table shape + a couple of hand-verified spot checks.
function selfCheck() {
  console.assert(PADA_SYLLABLES.length === 27, 'expected 27 nakshatra rows');
  console.assert(PADA_SYLLABLES.every(row => row.length === 4), 'expected 4 padas per row');
  console.assert(getBabyNameSyllableForLongitude(0).syllable === 'Chu', 'Ashwini pada 1 should be Chu');
  console.assert(getBabyNameSyllableForLongitude(13.34).syllable === 'Li', 'Bharani pada 1 should be Li');
}
if (process.env.NODE_ENV === 'test') selfCheck();
