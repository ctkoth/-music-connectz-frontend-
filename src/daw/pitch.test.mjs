import test from "node:test";
import assert from "node:assert/strict";
import { pitchShift, rangeFor, ratioFor, wsola } from "./pitch.js";

const rate = 16000;
const sine = (hz, secs) => Float32Array.from({ length: rate * secs }, (_, i) => Math.sin((2 * Math.PI * hz * i) / rate) * 0.5);
// Frequency by counting upward zero crossings in the steady middle of the signal.
function freq(x) {
  const a = Math.floor(x.length * 0.2), b = Math.floor(x.length * 0.8);
  let n = 0;
  for (let i = a + 1; i < b; i++) if (x[i - 1] < 0 && x[i] >= 0) n++;
  return n / ((b - a) / rate);
}

test("an octave up doubles the pitch and keeps the length", () => {
  const [y] = pitchShift([sine(220, 1)], rate, 12);
  assert.equal(y.length, rate);
  assert.ok(Math.abs(freq(y) - 440) < 12, `got ${freq(y)}`);
});

test("down a fifth lowers the pitch by 2^(7/12)", () => {
  const [y] = pitchShift([sine(440, 1)], rate, -7);
  const want = 440 / ratioFor(7);
  assert.ok(Math.abs(freq(y) - want) < 10, `got ${freq(y)} want ${want}`);
});

test("stretching keeps the pitch, and zero semitones changes nothing", () => {
  const s = wsola(sine(300, 1), 1.5, rate);
  assert.ok(Math.abs(s.length - rate * 1.5) <= 1);
  assert.ok(Math.abs(freq(s) - 300) < 8, `got ${freq(s)}`);
  const x = sine(300, 0.2);
  assert.deepEqual(pitchShift([x], rate, 0)[0], x);
});

test("the tier's range follows the numbers", () => {
  assert.equal(rangeFor(3), 3);
  assert.equal(rangeFor(6), 6);
  assert.equal(rangeFor(null), 12);
});
