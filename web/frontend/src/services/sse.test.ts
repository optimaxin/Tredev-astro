// Run: npm run test:sse
// Regression for chat segmentation: however the network splits the stream,
// one reply must rebuild into the server's semantic segments — one bubble per
// segment, in order, each with its exact text (no sentence or date range cut).
import assert from 'node:assert/strict';
import { drainSseBuffer, parseSseBlock } from './sse';

const segments = [
  'Your 7th house is Virgo and Venus sits in it, while its lord Mercury is placed in the 6th house.',
  'Aapko aisa partner pasand aa sakta hai jo soch-samajhkar baat karta ho aur commitment ko importance de.',
  'अभी बुध महादशा में शुक्र की अंतर्दशा जून 2024 से अप्रैल 2027 तक चल रही है।',
];

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

let wire = sse('start', { message_id: 'msg_1' }) + sse('status', { message_id: 'msg_1', stage: 'writing' });
segments.forEach((text, index) => {
  const id = `msg_1-s${index}`;
  wire += sse('segment_start', { message_id: 'msg_1', segment_id: id, index });
  for (const piece of text.match(/[\s\S]{1,17}/g) ?? []) {
    wire += sse('delta', { message_id: 'msg_1', segment_id: id, text: piece });
  }
  wire += sse('segment_end', { message_id: 'msg_1', segment_id: id, index, text });
});
wire += sse('done', { message_id: 'msg_1', answer: segments.join('\n\n'), messages: segments, request_id: 'r1' });

for (const chunkSize of [1, 7, 64, 4096]) {
  let buffer = '';
  const turnIds = new Set<string>();
  const order: string[] = [];
  const rebuilt: Record<string, string> = {};
  const ended: Record<string, string> = {};
  let done: Record<string, unknown> | null = null;
  for (let i = 0; i < wire.length; i += chunkSize) {
    const drained = drainSseBuffer(buffer + wire.slice(i, i + chunkSize));
    buffer = drained.rest;
    for (const { event, data } of drained.events) {
      const d = data as Record<string, unknown>;
      turnIds.add(String(d.message_id));
      if (event === 'segment_start') { order.push(String(d.segment_id)); rebuilt[String(d.segment_id)] = ''; }
      if (event === 'delta') rebuilt[String(d.segment_id)] += String(d.text);
      if (event === 'segment_end') ended[String(d.segment_id)] = String(d.text);
      if (event === 'done') done = d;
    }
  }
  assert.equal(turnIds.size, 1, `one logical turn (chunk ${chunkSize})`);
  assert.deepEqual(order.map(id => rebuilt[id]), segments, `deltas rebuild each segment (chunk ${chunkSize})`);
  assert.deepEqual(order.map(id => ended[id]), segments, 'segment_end carries the full text');
  assert.ok(done, 'done event received');
  assert.deepEqual((done as Record<string, unknown>).messages, segments, 'done.messages is one entry per bubble');
  assert.equal(new Set(order).size, segments.length, 'no duplicated segments');
  assert.equal(buffer, '', 'nothing left unparsed');
}

assert.equal(parseSseBlock('data: not json'), null);
assert.deepEqual(parseSseBlock('event: x\ndata: {"a":1}'), { event: 'x', data: { a: 1 } });

console.log('sse: all checks passed');
