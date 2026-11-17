// FLAMES — a name-letter game, not astrology (no ephemeris/birth data
// involved), but a real deterministic algorithm rather than a random pick:
// cross out one-to-one matching letters between the two names, then use
// the remaining letter count to eliminate letters from F-L-A-M-E-S
// cyclically (count that many letters around the remaining ring, drop the
// one landed on, repeat) until one remains.
export type FlamesResult = 'Friends' | 'Love' | 'Affection' | 'Marriage' | 'Enemies' | 'Siblings';

const FLAMES_MAP: Record<string, FlamesResult> = {
  F: 'Friends', L: 'Love', A: 'Affection', M: 'Marriage', E: 'Enemies', S: 'Siblings',
};

function letters(name: string): string[] {
  return name.toLowerCase().replace(/[^a-z]/g, '').split('');
}

export interface FlamesOutcome {
  result: FlamesResult;
  letter: string;
  remainingCount: number;
}

export function calculateFlames(name1: string, name2: string): FlamesOutcome {
  const a = letters(name1);
  const b = letters(name2);

  for (let i = a.length - 1; i >= 0; i--) {
    const j = b.indexOf(a[i]);
    if (j !== -1) {
      a.splice(i, 1);
      b.splice(j, 1);
    }
  }

  const remainingCount = a.length + b.length;
  // Two names that share every letter (identical or anagrams) leave
  // nothing to count — fall back to the combined name length so the
  // elimination still has a real, non-zero step size instead of dividing
  // by zero.
  const count = remainingCount || name1.length + name2.length || 1;

  const ring = ['F', 'L', 'A', 'M', 'E', 'S'];
  let index = 0;
  while (ring.length > 1) {
    index = (index + count - 1) % ring.length;
    ring.splice(index, 1);
  }

  const letter = ring[0];
  return { result: FLAMES_MAP[letter], letter, remainingCount };
}
