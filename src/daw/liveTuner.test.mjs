import { test } from "node:test";
import assert from "node:assert/strict";
import { keyOfTally, liveNote, noteOf, tally } from "./liveTuner.js";
import { leftToday, spendOne, usedToday } from "./tunerDaily.js";

const sine = (hz, rate = 48000, n = 8192) => Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * hz * i) / rate));

test("a 220 Hz tone is A3 on the note, and a sharp one reads positive cents", () => {
  const a = liveNote(sine(220), 48000);
  assert.equal(a.name, "A3"); assert.ok(Math.abs(a.cents) <= 2);
  const sharp = liveNote(sine(220 * 2 ** (30 / 1200)), 48000);
  assert.equal(sharp.name, "A3"); assert.ok(sharp.cents >= 25 && sharp.cents <= 35, `cents ${sharp.cents}`);
});

test("silence is no note, never a guess", () => {
  assert.equal(liveNote(new Float32Array(8192), 48000), null);
  assert.equal(noteOf(0), null);
});

test("notes of A minor heard for a while point at a minor key, and a handful of notes say nothing yet", () => {
  const hist = new Array(12).fill(0);
  assert.equal(keyOfTally(hist), null);
  [9, 11, 0, 2, 4, 5, 7, 9, 9, 4, 9, 0, 4, 9, 2, 0, 11, 9].forEach((pc) => tally(hist, { pc }));
  const k = keyOfTally(hist);
  assert.ok(k && /^(A minor|C major)$/.test(k.label), `got ${k && k.label}`);
});

test("the daily count stops at the plan's number, resets the next day, and null is unlimited", () => {
  const mem = {}; const store = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  const day1 = new Date(2026, 10, 24, 12).getTime(), day2 = new Date(2026, 10, 25, 12).getTime();
  assert.ok(spendOne(store, 3, day1)); assert.ok(spendOne(store, 3, day1)); assert.ok(spendOne(store, 3, day1));
  assert.equal(spendOne(store, 3, day1), false);
  assert.equal(usedToday(store, day1), 3); assert.equal(leftToday(store, 3, day1), 0);
  assert.equal(usedToday(store, day2), 0);
  assert.equal(leftToday(store, null, day1), Infinity);
});
