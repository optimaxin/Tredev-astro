// Run: npm run test:bubbles
// Sequential bubble delivery against a fake clock: one bubble at a time, the
// pause measured from the end of the previous bubble's entrance animation,
// typing dots only between bubbles, and clean cancel/flush.
import assert from 'node:assert/strict';
import { BUBBLE_DELIVERY, deliverBubbles, delayFor, entranceMs } from './bubbleDelivery';
import type { Timers } from './bubbleDelivery';

class FakeClock implements Timers {
  now = 0;
  private seq = 0;
  private queue = new Map<number, { at: number; fn: () => void }>();
  setTimeout = (fn: () => void, ms: number) => {
    const id = ++this.seq;
    this.queue.set(id, { at: this.now + ms, fn });
    return id;
  };
  clearTimeout = (id: unknown) => {
    this.queue.delete(id as number);
  };
  get pending() {
    return this.queue.size;
  }
  // Run every timer due up to `now + ms`, in time order.
  advance(ms: number) {
    const end = this.now + ms;
    for (;;) {
      const due = [...this.queue.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.queue.delete(due[0]);
      this.now = due[1].at;
      due[1].fn();
    }
    this.now = end;
  }
  runAll() {
    this.advance(60_000);
  }
}

interface Event { t: number; kind: 'show' | 'typing-on' | 'typing-off' | 'done'; index?: number; last?: boolean }

function run(texts: string[], reducedMotion = false) {
  const clock = new FakeClock();
  const events: Event[] = [];
  const handle = deliverBubbles(texts, {
    onShow: (_text, index, last) => events.push({ t: clock.now, kind: 'show', index, last }),
    onTyping: on => events.push({ t: clock.now, kind: on ? 'typing-on' : 'typing-off' }),
    onDone: () => events.push({ t: clock.now, kind: 'done' }),
  }, { reducedMotion, timers: clock });
  return { clock, events, handle, shows: () => events.filter(e => e.kind === 'show') };
}

const texts = (n: number) => Array.from({ length: n }, (_, i) => `Bubble ${i + 1}.`);

// 1. A single bubble appears immediately, with no timer and no typing dots.
{
  const { clock, events, handle } = run(texts(1));
  assert.deepEqual(events, [{ t: 0, kind: 'show', index: 0, last: true }, { t: 0, kind: 'done' }]);
  assert.equal(clock.pending, 0);
  assert.ok(handle.finished);
}

// 2. Two and five bubbles: one at a time, never two at the same instant.
for (const n of [2, 3, 4, 5]) {
  const { clock, events, shows } = run(texts(n));
  assert.equal(shows().length, 1, `only the first of ${n} is shown at once`);
  assert.equal(shows()[0].t, 0, 'first bubble immediately');
  clock.runAll();
  const s = shows();
  assert.deepEqual(s.map(e => e.index), [...Array(n).keys()], `all ${n} shown once, in order`);
  assert.equal(new Set(s.map(e => e.t)).size, n, 'no two bubbles revealed together');
  assert.deepEqual(s.map(e => e.last), s.map((_, i) => i === n - 1), 'only the final bubble is marked last');
  // 3. Each gap = previous bubble's entrance animation + its pause.
  for (let i = 1; i < n; i++) {
    assert.equal(s[i].t - s[i - 1].t, BUBBLE_DELIVERY.animationMs + delayFor(i - 1),
      `gap ${i} starts after the entrance animation`);
    const on = events.filter(e => e.kind === 'typing-on' && e.t > s[i - 1].t && e.t < s[i].t);
    assert.equal(on.length, 1, 'dots appear once per pause');
    assert.equal(on[0].t - s[i - 1].t, BUBBLE_DELIVERY.animationMs, 'dots appear when the animation ends');
  }
  // 4. The indicator ends hidden and nothing remains scheduled.
  const typing = events.filter(e => e.kind.startsWith('typing'));
  assert.equal(typing.at(-1)?.kind, 'typing-off');
  assert.equal(events.at(-1)?.kind, 'done');
  assert.equal(clock.pending, 0);
}

// 5. The pauses vary but stay in range, averaging ~1.8 s.
{
  const pauses = [0, 1, 2, 3, 4].map(i => delayFor(i));
  assert.ok(new Set(pauses).size > 1, 'not one fixed interval');
  assert.ok(pauses.every(p => p >= 1500 && p <= 2000), 'within 1.5–2.0 s');
  const mean = pauses.reduce((a, b) => a + b, 0) / pauses.length;
  assert.ok(Math.abs(mean - 1800) <= 50, `mean ${mean} ms`);
  assert.equal(delayFor(5), delayFor(0), 'controlled cycle, not random');
}

// 6. cancel(): no callback of any kind afterwards, no timer left.
{
  const { clock, events, handle } = run(texts(4));
  clock.advance(BUBBLE_DELIVERY.animationMs + 100);              // dots are showing
  const before = events.length;
  handle.cancel();
  clock.runAll();
  assert.equal(events.length, before, 'nothing fires after cancel');
  assert.equal(clock.pending, 0);
  assert.ok(handle.finished);
}

// 7. flush() (a new message mid-sequence): every remaining bubble exactly once,
//    dots hidden, done, no timer left; a second flush/cancel is a no-op.
{
  const { clock, events, handle, shows } = run(texts(5));
  clock.advance(BUBBLE_DELIVERY.animationMs + delayFor(0) + 10);  // two bubbles shown
  assert.equal(shows().length, 2);
  handle.flush();
  assert.deepEqual(shows().map(e => e.index), [0, 1, 2, 3, 4], 'remaining bubbles delivered once');
  assert.equal(events.filter(e => e.kind === 'done').length, 1);
  assert.equal(events.filter(e => e.kind.startsWith('typing')).at(-1)?.kind, 'typing-off');
  handle.flush();
  handle.cancel();
  clock.runAll();
  assert.equal(shows().length, 5, 'no duplicates after a second flush');
  assert.equal(clock.pending, 0);
}

// 8. A new reply replacing an unfinished one: flush the old, start the new —
//    old bubbles once, new bubbles after them, no overlapping timers.
{
  const clock = new FakeClock();
  const shown: string[] = [];
  const cb = (tag: string) => ({ onShow: (t: string) => shown.push(`${tag}:${t}`), onTyping: () => {}, onDone: () => {} });
  const first = deliverBubbles(['a1.', 'a2.', 'a3.'], cb('A'), { timers: clock });
  clock.advance(500);
  first.flush();
  deliverBubbles(['b1.', 'b2.'], cb('B'), { timers: clock });
  clock.runAll();
  assert.deepEqual(shown, ['A:a1.', 'A:a2.', 'A:a3.', 'B:b1.', 'B:b2.']);
}

// 9. Reduced motion: no entrance wait, a short fixed pause, still sequential.
{
  assert.equal(entranceMs(true), 0);
  const { clock, shows } = run(texts(3), true);
  clock.runAll();
  const s = shows();
  assert.deepEqual(s.map(e => e.t), [0, BUBBLE_DELIVERY.reducedMotionDelayMs, 2 * BUBBLE_DELIVERY.reducedMotionDelayMs]);
}

// 10. Hindi, Hinglish and English texts are delivered verbatim.
{
  const replies = ['आपकी कुंडली में शुक्र सातवें भाव में है।', 'Aapke career mein growth ke chances hain.',
                   'Your 10th lord sits in the 6th house.'];
  const got: string[] = [];
  const clock = new FakeClock();
  deliverBubbles(replies, { onShow: t => got.push(t), onTyping: () => {}, onDone: () => {} }, { timers: clock });
  clock.runAll();
  assert.deepEqual(got, replies);
}

// 11. An empty reply finishes at once (the widget then shows nothing extra).
{
  const { events, clock } = run([]);
  assert.deepEqual(events, [{ t: 0, kind: 'done' }]);
  assert.equal(clock.pending, 0);
}

console.log('bubbles: all checks passed');
