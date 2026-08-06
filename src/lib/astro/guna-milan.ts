// Classical Ashtakoot (36-point) compatibility system.
// ponytail: Vashya and Bhakoot use whole-rashi classification (the classical
// system splits a few rashis at their midpoint) and dosha-cancellation
// exception rules (Nadi/Bhakoot dosha bhang) are not applied — upgrade both
// if a professional-grade report needs the exact classical nuance.

const NAKSHATRA_LORD = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
] as const;

const YONI = [
  "Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Sheep", "Cat",
  "Rat", "Rat", "Cow", "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer", "Dog",
  "Monkey", "Mongoose", "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant",
] as const;

const YONI_ENEMY: Record<string, string> = {
  Horse: "Buffalo", Buffalo: "Horse", Elephant: "Lion", Lion: "Elephant",
  Sheep: "Monkey", Monkey: "Sheep", Serpent: "Mongoose", Mongoose: "Serpent",
  Dog: "Deer", Deer: "Dog", Cat: "Rat", Rat: "Cat", Cow: "Tiger", Tiger: "Cow",
};

const GANA = [
  "Deva", "Manushya", "Rakshasa", "Manushya", "Deva", "Manushya", "Deva", "Deva", "Rakshasa",
  "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Deva", "Rakshasa", "Deva", "Rakshasa",
  "Rakshasa", "Manushya", "Manushya", "Deva", "Rakshasa", "Rakshasa", "Manushya", "Manushya", "Deva",
] as const;

const NADI = [
  "Aadi", "Madhya", "Antya", "Antya", "Madhya", "Aadi", "Aadi", "Madhya", "Antya",
  "Antya", "Madhya", "Aadi", "Aadi", "Madhya", "Antya", "Antya", "Madhya", "Aadi",
  "Aadi", "Madhya", "Antya", "Antya", "Madhya", "Aadi", "Aadi", "Madhya", "Antya",
] as const;

const VARNA = ["Kshatriya", "Vaishya", "Shudra", "Brahmin", "Kshatriya", "Vaishya", "Shudra", "Brahmin", "Kshatriya", "Vaishya", "Shudra", "Brahmin"] as const;
const VARNA_RANK: Record<string, number> = { Brahmin: 4, Kshatriya: 3, Vaishya: 2, Shudra: 1 };

const VASHYA_GROUP = ["Chatushpada", "Chatushpada", "Manav", "Jalachar", "Vanachar", "Manav", "Manav", "Keet", "Chatushpada", "Chatushpada", "Manav", "Jalachar"] as const;

const PLANET_FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: ["Venus", "Saturn"],
  Ketu: ["Mars", "Venus", "Saturn"],
};
const PLANET_ENEMIES: Record<string, string[]> = {
  Sun: ["Venus", "Saturn"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: ["Sun", "Moon"],
  Ketu: ["Sun", "Moon"],
};

export type MilanInput = { nakshatraIndex: number; rashiIndex: number };

export type KootaResult = { name: string; points: number; maxPoints: number; note: string };

function tarakoota(a: number, b: number): KootaResult {
  const forward = ((b - a + 27) % 27) + 1;
  const backward = ((a - b + 27) % 27) + 1;
  const isGood = (n: number) => [2, 4, 6, 8, 9, 0].includes(n % 9);
  const goodCount = (isGood(forward) ? 1 : 0) + (isGood(backward) ? 1 : 0);
  const points = goodCount === 2 ? 3 : goodCount === 1 ? 1.5 : 0;
  return { name: "Tara", points, maxPoints: 3, note: "Birth-star counting compatibility" };
}

function yonikoota(a: number, b: number): KootaResult {
  const yoniA = YONI[a];
  const yoniB = YONI[b];
  let points = 4;
  if (yoniA === yoniB) points = 4;
  else if (YONI_ENEMY[yoniA] === yoniB) points = 0;
  else points = 2;
  return { name: "Yoni", points, maxPoints: 4, note: "Sexual/temperamental compatibility" };
}

function ganakoota(a: number, b: number): KootaResult {
  const gA = GANA[a];
  const gB = GANA[b];
  let points = 6;
  if (gA === gB) points = 6;
  else if ((gA === "Deva" && gB === "Manushya") || (gA === "Manushya" && gB === "Deva")) points = 5;
  else if ((gA === "Manushya" && gB === "Rakshasa") || (gA === "Rakshasa" && gB === "Manushya")) points = 1;
  else points = 0; // Deva/Rakshasa clash
  return { name: "Gana", points, maxPoints: 6, note: "Temperament and nature" };
}

function nadikoota(a: number, b: number): KootaResult {
  const points = NADI[a] === NADI[b] ? 0 : 8;
  return { name: "Nadi", points, maxPoints: 8, note: "Health and genetic compatibility" };
}

function grahaMaitri(a: number, b: number): KootaResult {
  const lordA = NAKSHATRA_LORD[a];
  const lordB = NAKSHATRA_LORD[b];
  if (lordA === lordB) return { name: "Graha Maitri", points: 5, maxPoints: 5, note: "Same nakshatra lord" };
  const aFriendsB = PLANET_FRIENDS[lordA]?.includes(lordB);
  const bFriendsA = PLANET_FRIENDS[lordB]?.includes(lordA);
  const aEnemyB = PLANET_ENEMIES[lordA]?.includes(lordB);
  const bEnemyA = PLANET_ENEMIES[lordB]?.includes(lordA);
  let points: number;
  if (aFriendsB && bFriendsA) points = 5;
  else if (aEnemyB && bEnemyA) points = 0;
  else if (aFriendsB || bFriendsA) points = 4;
  else if (aEnemyB || bEnemyA) points = 1;
  else points = 3;
  return { name: "Graha Maitri", points, maxPoints: 5, note: "Mental and intellectual compatibility" };
}

function varnakoota(rashiA: number, rashiB: number): KootaResult {
  const vA = VARNA[rashiA];
  const vB = VARNA[rashiB];
  const points = VARNA_RANK[vA] >= VARNA_RANK[vB] ? 1 : 0;
  return { name: "Varna", points, maxPoints: 1, note: "Spiritual compatibility" };
}

function vashyakoota(rashiA: number, rashiB: number): KootaResult {
  const points = VASHYA_GROUP[rashiA] === VASHYA_GROUP[rashiB] ? 2 : 1;
  return { name: "Vashya", points, maxPoints: 2, note: "Mutual attraction and control" };
}

function bhakootkoota(rashiA: number, rashiB: number): KootaResult {
  const distance = ((rashiB - rashiA + 12) % 12) + 1;
  const dosha = [2, 12, 5, 9, 6, 8].includes(distance);
  return { name: "Bhakoot", points: dosha ? 0 : 7, maxPoints: 7, note: "Overall life & family compatibility" };
}

export function calculateGunaMilan(boy: MilanInput, girl: MilanInput) {
  const koota: KootaResult[] = [
    varnakoota(boy.rashiIndex, girl.rashiIndex),
    vashyakoota(boy.rashiIndex, girl.rashiIndex),
    tarakoota(boy.nakshatraIndex, girl.nakshatraIndex),
    yonikoota(boy.nakshatraIndex, girl.nakshatraIndex),
    grahaMaitri(boy.nakshatraIndex, girl.nakshatraIndex),
    ganakoota(boy.nakshatraIndex, girl.nakshatraIndex),
    bhakootkoota(boy.rashiIndex, girl.rashiIndex),
    nadikoota(boy.nakshatraIndex, girl.nakshatraIndex),
  ];
  const totalPoints = koota.reduce((sum, k) => sum + k.points, 0);
  const maxPoints = koota.reduce((sum, k) => sum + k.maxPoints, 0);
  const verdict = totalPoints >= 28 ? "Excellent Match" : totalPoints >= 21 ? "Good Match" : totalPoints >= 18 ? "Average Match" : "Not Recommended";
  const nadiDosha = koota.find((k) => k.name === "Nadi")!.points === 0;
  const bhakootDosha = koota.find((k) => k.name === "Bhakoot")!.points === 0;

  return { koota, totalPoints, maxPoints, verdict, nadiDosha, bhakootDosha };
}
