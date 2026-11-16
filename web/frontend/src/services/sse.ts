// Minimal Server-Sent Events parsing for POST streams (EventSource cannot
// POST). Kept separate from the network code so it can be unit-tested.

export interface SseEvent {
  event: string;
  data: unknown;
}

export function parseSseBlock(block: string): SseEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

// Splits everything complete out of `buffer`; the unfinished tail is returned
// to be prepended to the next network chunk (an event may arrive split).
export function drainSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  let rest = buffer.replace(/\r\n/g, '\n');
  let cut: number;
  while ((cut = rest.indexOf('\n\n')) >= 0) {
    const parsed = parseSseBlock(rest.slice(0, cut));
    rest = rest.slice(cut + 2);
    if (parsed) events.push(parsed);
  }
  return { events, rest };
}
