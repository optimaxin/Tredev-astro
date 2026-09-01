// Real upcoming sign-change (Rashi) events — the factual backbone for the
// weekly/monthly/half-year/full-year "horoscope" views. Deliberately NOT a
// generated prediction paragraph: it reports exactly when each planet's
// real computed position crosses into a new sign within the window, same
// spirit as the rest of this codebase's calculators (compute, don't invent).
import { getPlanetaryPositions } from './ephemeris.ts';
import type { PlanetId } from './ephemeris.ts';
import { RASHIS } from './zodiac.ts';

export interface UpcomingTransitEvent {
  planetId: PlanetId;
  fromRashi: string;
  toRashi: string;
  date: string; // ISO instant of the crossing
}

function rashiIndexAt(utcDate: Date, planetId: PlanetId): number {
  const pos = getPlanetaryPositions({ utcDate }).find(p => p.id === planetId)!;
  return Math.floor((((pos.longitude % 360) + 360) % 360) / 30);
}

// Binary-search the exact crossing instant between two dates known to
// straddle a sign boundary (their rashi indices differ).
function findCrossing(planetId: PlanetId, before: Date, after: Date, beforeIndex: number): Date {
  let lo = before.getTime();
  let hi = after.getTime();
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const idx = rashiIndexAt(new Date(mid), planetId);
    if (idx === beforeIndex) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

// Daily sampling is enough to never miss a crossing for any of the 9
// classical grahas (even the Moon, the fastest at ~2.25 days/sign) without
// the ephemeris-call cost of finer resolution.
export function getUpcomingTransits(fromDate: Date, windowDays: number, planetIds: PlanetId[]): UpcomingTransitEvent[] {
  const samples: { date: Date; index: Record<string, number> }[] = [];
  for (let d = 0; d <= windowDays; d++) {
    const date = new Date(fromDate.getTime() + d * 86_400_000);
    const positions = getPlanetaryPositions({ utcDate: date });
    const index: Record<string, number> = {};
    for (const id of planetIds) {
      const pos = positions.find(p => p.id === id)!;
      index[id] = Math.floor((((pos.longitude % 360) + 360) % 360) / 30);
    }
    samples.push({ date, index });
  }

  const events: UpcomingTransitEvent[] = [];
  for (const id of planetIds) {
    for (let i = 1; i < samples.length; i++) {
      const prevIndex = samples[i - 1].index[id];
      const currIndex = samples[i].index[id];
      if (prevIndex !== currIndex) {
        const crossing = findCrossing(id, samples[i - 1].date, samples[i].date, prevIndex);
        events.push({ planetId: id, fromRashi: RASHIS[prevIndex], toRashi: RASHIS[currIndex], date: crossing.toISOString() });
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
