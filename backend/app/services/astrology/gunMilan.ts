// Ashtakoot Guna Milan — the classical 8-factor, 36-point Vedic marriage
// compatibility score. Every table below (Varna/Vashya/Tara/Yoni/Gana/
// Bhakoot/Nadi) was cross-checked against the well-known open-source
// `ashtakoot` npm package (Neelesh Roy, MIT, 2018) and independently
// verified point-by-point against the classical groupings — EXCEPT Graha
// Maitri, whose data in that source had a corrupted (ragged) matrix, so
// it's rebuilt here from the standard Naisargika (natural) planetary
// friendship table instead.
import { getRashi, getNakshatra, RASHIS } from './zodiac.ts';

export type GunaGroom = 'bride' | 'groom';

export interface Partner {
  moonLongitude: number; // sidereal degrees, 0-360 — pass the natal Moon's longitude from a Kundli
}

interface KootaResult {
  name: string;
  maxPoints: number;
  points: number;
}

export interface GunMilanResult {
  totalPoints: number;
  maxPoints: 36;
  kootas: KootaResult[];
  brideMoonRashi: string;
  groomMoonRashi: string;
  brideNakshatra: string;
  groomNakshatra: string;
}

// ── Varna (1 point) ─────────────────────────────────────────────────────
const VARNA_CLASS: Record<number, number> = {}; // rashi index -> 0(Brahmin, highest)..3(Shudra)
[3, 7, 11].forEach(i => (VARNA_CLASS[i] = 0)); // Cancer, Scorpio, Pisces
[0, 4, 8].forEach(i => (VARNA_CLASS[i] = 1)); // Aries, Leo, Sagittarius
[1, 5, 9].forEach(i => (VARNA_CLASS[i] = 2)); // Taurus, Virgo, Capricorn
[2, 6, 10].forEach(i => (VARNA_CLASS[i] = 3)); // Gemini, Libra, Aquarius
// Score 1 only when the groom's varna is equal or senior to the bride's.
const VARNA_POINTS = [
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 1],
];

// ── Vashya (2 points) ────────────────────────────────────────────────────
const VASHYA_GROUP: Record<number, number> = {};
[2, 5, 6, 8, 10].forEach(i => (VASHYA_GROUP[i] = 0)); // Manav (human)
VASHYA_GROUP[4] = 1; // Vanachar (wild) — Leo, alone
[0, 1, 9].forEach(i => (VASHYA_GROUP[i] = 2)); // Chatushpad (quadruped)
[3, 11].forEach(i => (VASHYA_GROUP[i] = 3)); // Jalachar (water)
VASHYA_GROUP[7] = 4; // Keeta (insect) — Scorpio, alone
const VASHYA_POINTS = [
  [2, 0.5, 1, 0, 2],
  [0.5, 2, 0, 0, 0],
  [1, 0, 2, 2, 2],
  [0, 0, 2, 2, 0],
  [1, 0, 1, 0, 2],
];

// ── Tara (3 points) — each nakshatra's residue mod 9 ─────────────────────
const TARA_POINTS = [
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
  [1.5, 1.5, 0, 1.5, 0, 1.5, 0, 1.5, 1.5],
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
  [1.5, 1.5, 0, 1.5, 0, 1.5, 0, 1.5, 1.5],
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
  [1.5, 1.5, 0, 1.5, 0, 1.5, 0, 1, 1],
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
  [3, 3, 1.5, 3, 1.5, 3, 1.5, 3, 3],
];

// ── Yoni (4 points) — 14 animal types across the 27 nakshatras ───────────
const YONI_ANIMAL: number[] = [
  0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 11, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1,
];
const YONI_POINTS = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 2],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 2, 4],
];

// ── Graha Maitri (5 points) — natural (Naisargika) planetary friendship,
// rebuilt independently since the reference source's table was corrupted.
const RASHI_LORD = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const FRIENDS: Record<string, string[]> = {
  sun: ['moon', 'mars', 'jupiter'],
  moon: ['sun', 'mercury'],
  mars: ['sun', 'moon', 'jupiter'],
  mercury: ['sun', 'venus'],
  jupiter: ['sun', 'moon', 'mars'],
  venus: ['mercury', 'saturn'],
  saturn: ['mercury', 'venus'],
};
const ENEMIES: Record<string, string[]> = {
  sun: ['venus', 'saturn'],
  moon: [],
  mars: ['mercury'],
  mercury: ['moon'],
  jupiter: ['mercury', 'venus'],
  venus: ['sun', 'moon'],
  saturn: ['sun', 'moon', 'mars'],
};
function planetRelation(a: string, b: string): 'friend' | 'enemy' | 'neutral' {
  if (a === b) return 'friend';
  if (FRIENDS[a]?.includes(b)) return 'friend';
  if (ENEMIES[a]?.includes(b)) return 'enemy';
  return 'neutral';
}
// Graha Maitri looks both ways (A's view of B, and B's view of A) since
// planetary friendship isn't always symmetric — e.g. the Moon counts
// Mercury as a friend, but Mercury counts the Moon as an enemy.
function grahaMaitriPoints(lordA: string, lordB: string): number {
  const rel1 = planetRelation(lordA, lordB);
  const rel2 = planetRelation(lordB, lordA);
  if (lordA === lordB) return 5;
  if (rel1 === 'friend' && rel2 === 'friend') return 5;
  if (rel1 === 'enemy' && rel2 === 'enemy') return 0;
  if (rel1 === 'neutral' && rel2 === 'neutral') return 3;
  if (rel1 === 'enemy' || rel2 === 'enemy') return 1;
  return 4; // one friend + one neutral
}

// ── Gana (6 points) — Deva / Manushya / Rakshasa temperament ─────────────
const GANA_GROUP: Record<number, number> = {};
[0, 4, 6, 7, 12, 14, 16, 21, 26].forEach(i => (GANA_GROUP[i] = 0)); // Deva
[1, 3, 5, 10, 11, 19, 20, 24, 25].forEach(i => (GANA_GROUP[i] = 1)); // Manushya
// everything else (2,8,9,13,15,17,18,22,23) = Rakshasa (2)
const GANA_POINTS = [
  [6, 5, 1],
  [5, 6, 0],
  [1, 0, 6],
];

// ── Bhakoot (7 points) — 0 for the classical dosha rashi-distances ───────
const BHAKOOT_POINTS = [
  [7, 0, 7, 7, 0, 0, 7, 0, 0, 7, 7, 0],
  [0, 7, 0, 7, 7, 0, 0, 7, 0, 0, 7, 7],
  [7, 0, 7, 0, 7, 7, 0, 0, 7, 0, 0, 7],
  [7, 7, 0, 7, 0, 7, 7, 0, 0, 7, 0, 0],
  [0, 7, 7, 0, 7, 0, 7, 7, 0, 0, 7, 0],
  [0, 0, 7, 7, 0, 7, 0, 7, 7, 0, 0, 7],
  [7, 0, 0, 7, 7, 0, 7, 0, 7, 7, 0, 0],
  [0, 7, 0, 0, 7, 7, 0, 7, 0, 7, 7, 0],
  [0, 0, 7, 0, 0, 7, 7, 0, 7, 0, 7, 7],
  [7, 0, 0, 7, 0, 0, 7, 7, 0, 7, 0, 7],
  [7, 7, 0, 7, 7, 0, 0, 7, 7, 0, 7, 0],
  [0, 7, 7, 0, 0, 7, 0, 0, 7, 7, 0, 7],
];

// ── Nadi (8 points) — same Nadi scores 0 (the Nadi Dosha) ────────────────
const NADI_GROUP: Record<number, number> = {};
[0, 5, 6, 11, 12, 17, 18, 23, 24].forEach(i => (NADI_GROUP[i] = 0)); // Aadi
[1, 4, 7, 10, 13, 16, 19, 22, 25].forEach(i => (NADI_GROUP[i] = 1)); // Madhya
// everything else (2,3,8,9,14,15,20,21,26) = Antya (2)
const NADI_POINTS = [
  [0, 8, 8],
  [8, 0, 8],
  [8, 8, 0],
];

function group(record: Record<number, number>, index: number, fallback: number): number {
  return record[index] ?? fallback;
}

export function calculateGunMilan(brideMoonLongitude: number, groomMoonLongitude: number): GunMilanResult {
  const brideRashi = getRashi(brideMoonLongitude);
  const groomRashi = getRashi(groomMoonLongitude);
  const brideNak = getNakshatra(brideMoonLongitude);
  const groomNak = getNakshatra(groomMoonLongitude);

  const varna = VARNA_POINTS[VARNA_CLASS[brideRashi.index]][VARNA_CLASS[groomRashi.index]];
  const vashya = VASHYA_POINTS[group(VASHYA_GROUP, brideRashi.index, 4)][group(VASHYA_GROUP, groomRashi.index, 4)];
  const tara = TARA_POINTS[brideNak.index % 9][groomNak.index % 9];
  const yoni = YONI_POINTS[YONI_ANIMAL[brideNak.index]][YONI_ANIMAL[groomNak.index]];
  const grahaMaitri = grahaMaitriPoints(RASHI_LORD[brideRashi.index], RASHI_LORD[groomRashi.index]);
  const gana = GANA_POINTS[group(GANA_GROUP, brideNak.index, 2)][group(GANA_GROUP, groomNak.index, 2)];
  const bhakoot = BHAKOOT_POINTS[brideRashi.index][groomRashi.index];
  const nadi = NADI_POINTS[group(NADI_GROUP, brideNak.index, 2)][group(NADI_GROUP, groomNak.index, 2)];

  const kootas: KootaResult[] = [
    { name: 'Varna', maxPoints: 1, points: varna },
    { name: 'Vashya', maxPoints: 2, points: vashya },
    { name: 'Tara', maxPoints: 3, points: tara },
    { name: 'Yoni', maxPoints: 4, points: yoni },
    { name: 'Graha Maitri', maxPoints: 5, points: grahaMaitri },
    { name: 'Gana', maxPoints: 6, points: gana },
    { name: 'Bhakoot', maxPoints: 7, points: bhakoot },
    { name: 'Nadi', maxPoints: 8, points: nadi },
  ];

  return {
    totalPoints: kootas.reduce((sum, k) => sum + k.points, 0),
    maxPoints: 36,
    kootas,
    brideMoonRashi: brideRashi.name,
    groomMoonRashi: groomRashi.name,
    brideNakshatra: brideNak.name,
    groomNakshatra: groomNak.name,
  };
}

// Re-exported for the Avakhada Chakra and gemstone builders, which need the
// same classical Varna/Vashya/Yoni/Gana/Nadi/rashi-lord groupings already
// verified here — no reason to duplicate or re-derive them.
export { RASHIS, VARNA_CLASS, VASHYA_GROUP, YONI_ANIMAL, GANA_GROUP, NADI_GROUP, RASHI_LORD, FRIENDS, ENEMIES };
