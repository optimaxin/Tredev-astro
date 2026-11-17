// "Ask TredevAstro AI" — deliberately not a live LLM call. Like the rest of
// this app's calculators, it's a template engine over a REAL computed chart
// (real Sun/Moon/Ascendant placements, real Mahadasha) rather than either a
// live third-party AI integration or a purely canned string. Matches the
// **bold** / *italic* / "- " list markdown the frontend chat bubble already
// knows how to render.
import type { Kundli } from './kundli.ts';
import type { MahadashaPeriod } from './vimshottariDasha.ts';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function chartHeader(kundli: Kundli): string {
  const moon = kundli.planets.find(p => p.id === 'moon')!;
  const sun = kundli.planets.find(p => p.id === 'sun')!;
  return `Based on your chart — with Sun in ${sun.rashi} (${ordinal(sun.house)} house) and Moon in ${moon.rashi} (${ordinal(moon.house)} house), Ascendant in ${kundli.ascendant.rashi} — traditional Vedic astrology offers the following perspective:`;
}

function dashaContext(mahadasha: MahadashaPeriod): string {
  return `**Current planetary context:**\n- Your active Mahadasha is ${cap(mahadasha.lord)}, running from ${mahadasha.startsAt} to ${mahadasha.endsAt}\n- This period colors the general theme of the coming months according to ${cap(mahadasha.lord)}'s classical significations`;
}

const TOPICS: Array<{ match: RegExp; body: (m: MahadashaPeriod) => string }> = [
  {
    match: /career|job|work|business/,
    body: m => `Career matters are traditionally read through the 10th house from your Ascendant and its ruling planet, viewed alongside your ${cap(m.lord)} Mahadasha. This is a period more suited to ${m.lord === 'saturn' || m.lord === 'mars' ? 'restructuring and disciplined effort' : 'growth and new opportunity'} in professional matters.`,
  },
  {
    match: /marriage|relationship|love|partner/,
    body: m => `Relationship timing is read from the 7th house and its lord together with Venus's placement. Your ${cap(m.lord)} Mahadasha is the backdrop any 7th-house transit should be read against — a supportive Dasha strengthens what the transit already indicates.`,
  },
  {
    match: /mahadasha|dasha|transit/,
    body: m => `You are currently in your ${cap(m.lord)} Mahadasha, active from ${m.startsAt} to ${m.endsAt}. Each Mahadasha carries the classical significations of its ruling planet for that stretch of years.`,
  },
  {
    match: /health/,
    body: m => `Health is traditionally read through the 6th house and the Ascendant lord's strength. During your ${cap(m.lord)} Mahadasha, pay attention to the areas of life that planet classically governs.`,
  },
];

export function answerAstrologyQuestion(question: string, kundli: Kundli, mahadasha: MahadashaPeriod): string {
  const q = question.toLowerCase();
  const topic = TOPICS.find(t => t.match.test(q));
  const body = topic
    ? topic.body(mahadasha)
    : `Specific life questions are best read through the house that governs that area of life, viewed alongside your currently running Dasha — for a precise answer to "${question}", the relevant house and its lord would need to be identified.`;

  return `${chartHeader(kundli)}\n\n${dashaContext(mahadasha)}\n\n${body}\n\n*This interpretation is based on classical Vedic principles and chart analysis. It does not guarantee specific outcomes — for deeper guidance, consider a full report or a consultation with one of our astrologers.*`;
}
