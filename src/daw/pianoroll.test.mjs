import test from "node:test";
import assert from "node:assert/strict";
import { barsFor, isBlack, noteAt, pitchName, quantize, rangeFor, resize, setVelocity, toggleAt, transpose } from "./pianoroll.js";

test("a click adds a note snapped to the grid, and a click on it takes it away", () => {
  let n = toggleAt([], 60, 1.3, { grid: 0.5, len: 1 });
  assert.deepEqual(n, [[60, 1, 1, 100]]);
  assert.equal(noteAt(n, 60, 1.9), 0);
  n = toggleAt(n, 60, 1.6);
  assert.deepEqual(n, []);
});

test("resize, quantize, transpose and velocity", () => {
  assert.deepEqual(resize([[60, 0, 1, 90]], 0, 0.1, 0.25), [[60, 0, 0.25, 90]]);
  assert.deepEqual(quantize([[60, 0.13, 0.3, 90]], 0.25), [[60, 0.25, 0.25, 90]]);
  assert.deepEqual(transpose([[60, 0, 1, 90], [126, 0, 1, 90]], 5), [[65, 0, 1, 90], [127, 0, 1, 90]]);
  assert.deepEqual(setVelocity([[60, 0, 1, 90]], 200), [[60, 0, 1, 127]]);
});

test("the roll shows the part's bars and range, and names its keys", () => {
  assert.equal(barsFor([[60, 14, 4, 1]]), 5);
  assert.equal(barsFor([]), 4);
  const [lo, hi] = rangeFor([[60, 0, 1, 1], [64, 0, 1, 1]]);
  assert.ok(lo <= 60 && hi >= 64 && hi - lo >= 24);
  assert.equal(pitchName(60), "C4");
  assert.equal(isBlack(61), true);
});
