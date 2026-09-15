// Regression tests for Panchang transition rendering — the next-day rollover
// bug, where an anga ending after midnight was displayed as a bare clock time
// and so read as same-day (and, when the end hour was numerically smaller
// than the start hour, as an impossible window: "12:46 PM to 12:20 PM").
//
// The formatter under test is frontend code, but it's a dependency-free pure
// function and the frontend has no test runner of its own, so it's exercised
// here through the backend's existing tsx-based sanity-test setup.
import assert from 'node:assert/strict';
import { formatPanchangTransition, isValidInterval, istDateKey } from '../../frontend/src/utils/panchangHindi.ts';

// IST (+05:30) instants written as UTC, since that's what the API returns.
const ist = (isoLocal) => new Date(new Date(`${isoLocal}+05:30`).toISOString()).toISOString();

const SELECTED = '2026-09-14';
let passed = 0;

function check(label, actual, expected) {
  assert.equal(actual, expected, `${label}: expected "${expected}", got "${actual}"`);
  passed++;
}

// A. Tithi ending the next morning.
check('A hindi', formatPanchangTransition(ist('2026-09-15T07:46:00'), SELECTED, true), 'अगले दिन 7:46 AM');
check('A english', formatPanchangTransition(ist('2026-09-15T07:46:00'), SELECTED, false), 'next day 7:46 AM');

// B. Nakshatra ending the next afternoon.
check('B', formatPanchangTransition(ist('2026-09-15T15:21:00'), SELECTED, true), 'अगले दिन 3:21 PM');

// C. Yoga whose end hour is numerically EARLIER than its start hour — the
// case that used to render as an impossible interval.
check('C start', formatPanchangTransition(ist('2026-09-14T12:46:00'), SELECTED, true), '12:46 PM');
check('C end', formatPanchangTransition(ist('2026-09-15T12:20:00'), SELECTED, true), 'अगले दिन 12:20 PM');

// D. Same-day window (Abhijit Muhurat) stays a bare clock time.
check('D start', formatPanchangTransition(ist('2026-09-14T11:51:00'), SELECTED, true), '11:51 AM');
check('D end', formatPanchangTransition(ist('2026-09-14T12:41:00'), SELECTED, true), '12:41 PM');

// E. Crossing midnight.
check('E', formatPanchangTransition(ist('2026-09-15T00:15:00'), SELECTED, true), 'अगले दिन 12:15 AM');

// F. Exactly midnight belongs to the NEXT day, not the selected one.
check('F', formatPanchangTransition(ist('2026-09-15T00:00:00'), SELECTED, true), 'अगले दिन 12:00 AM');

// G. Two or more days out falls back to the explicit date rather than a
// vaguer relative word.
check('G hindi', formatPanchangTransition(ist('2026-09-16T09:05:00'), SELECTED, true), '9:05 AM, 16 सितंबर');
check('G english', formatPanchangTransition(ist('2026-09-16T09:05:00'), SELECTED, false), '9:05 AM, 16 September');

// H. 11:59 PM on the selected date is still the selected date — the rollover
// must key off the IST calendar date, never off the UTC one (this instant is
// 18:29 UTC, i.e. still 14 Sep in both, but 00:30 IST next day would not be).
check('H same day', formatPanchangTransition(ist('2026-09-14T23:59:00'), SELECTED, true), '11:59 PM');
check('H rolled over', formatPanchangTransition(ist('2026-09-15T00:30:00'), SELECTED, true), 'अगले दिन 12:30 AM');

// istDateKey must report the IST calendar date, not the UTC one: 00:30 IST on
// 15 Sep is 19:00 UTC on 14 Sep.
check('istDateKey IST-based', istDateKey(ist('2026-09-15T00:30:00')), '2026-09-15');

// Interval validation: only forward-running, fully-specified windows render.
check('valid interval', isValidInterval(ist('2026-09-14T07:09:00'), ist('2026-09-15T07:46:00')), true);
check('backwards interval rejected', isValidInterval(ist('2026-09-15T07:46:00'), ist('2026-09-14T07:09:00')), false);
check('equal instants rejected', isValidInterval(ist('2026-09-14T07:09:00'), ist('2026-09-14T07:09:00')), false);
check('missing end rejected', isValidInterval(ist('2026-09-14T07:09:00'), null), false);

console.log(`panchang transition rendering: ${passed} checks passed`);
