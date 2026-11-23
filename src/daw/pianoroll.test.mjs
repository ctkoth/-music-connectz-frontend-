import test from "node:test";
import assert from "node:assert/strict";
import { GRIDS, deleteSelected, moveSelected, selectAll, setVelocitySelected, sortKeep, barsFor, isBlack, noteAt, pitchName, quantize, rangeFor, resize, setVelocity, toggleAt, transpose } from "./pianoroll.js";

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

test("quantize strength moves a note partway, 0 changes nothing, and lengths can be left alone", () => {
  const loose = [[60, 0.13, 0.3, 90]];
  assert.equal(quantize(loose, 0.25, { strength: 0.5 })[0][1], 0.19);          // halfway from 0.13 to 0.25
  assert.deepEqual(quantize(loose, 0.25, { strength: 0 })[0].slice(0, 2), [60, 0.13]);
  assert.equal(quantize(loose, 0.25, { lengths: false })[0][2], 0.3);
  assert.equal(quantize(loose, 0.25)[0][2], 0.25);
});
test("swing delays the off-beat slots only", () => {
  const n = quantize([[60, 0, 0.25, 90], [60, 0.25, 0.25, 90], [60, 0.5, 0.25, 90], [60, 0.75, 0.25, 90]], 0.25, { swing: 1 });
  assert.deepEqual(n.map((x) => x[1]), [0, 0.333, 0.5, 0.833]);                  // slots 1 and 3 land a third of a step late
});
test("triplet and 32nd grids exist and snap to thirds", () => {
  assert.ok(GRIDS.some(([l]) => l === "1/8T") && GRIDS.some(([l]) => l === "1/32"));
  assert.equal(quantize([[60, 0.34, 0.3, 90]], 1 / 3)[0][1], 0.333);
});
test("two notes of a pitch landing on one start become one; a note never starts before zero", () => {
  const n = quantize([[60, 0.02, 0.2, 80], [60, 0.1, 0.5, 90], [64, -0.3, 1, 100]], 0.25);
  assert.equal(n.filter((x) => x[0] === 60).length, 1);
  assert.ok(n.every((x) => x[1] >= 0));
});

test("moving a selection shifts only those notes, in time and pitch", () => {
  const n = [[60, 1, 1, 90], [64, 2, 1, 90], [67, 3, 1, 90]];
  const m = moveSelected(n, new Set([0, 2]), 0.5, 2);
  assert.deepEqual(m, [[62, 1.5, 1, 90], [64, 2, 1, 90], [69, 3.5, 1, 90]]);
  assert.deepEqual(n[0], [60, 1, 1, 90]);                                      // the input is not touched
});
test("a group stops at the start of the part and at the ends of the keyboard, keeping its shape", () => {
  const n = [[60, 0.5, 1, 90], [70, 2, 1, 90]];
  assert.deepEqual(moveSelected(n, new Set([0, 1]), -5, 0).map((x) => x[1]), [0, 1.5]);        // both shifted by the same 0.5
  assert.deepEqual(moveSelected([[126, 0, 1, 90], [120, 0, 1, 90]], new Set([0, 1]), 0, 10).map((x) => x[0]), [127, 121]);
});
test("sortKeep orders by time and carries the selection with the notes", () => {
  const moved = moveSelected([[60, 1, 1, 90], [64, 2, 1, 90]], new Set([0]), 3, 0);          // the first note now starts after the second
  const r = sortKeep(moved, new Set([0]));
  assert.deepEqual(r.notes.map((x) => x[0]), [64, 60]);
  assert.deepEqual([...r.sel], [1]);
});
test("delete, per-note velocity and select-all touch only what they say", () => {
  const n = [[60, 0, 1, 90], [62, 1, 1, 90], [64, 2, 1, 90]];
  assert.deepEqual(deleteSelected(n, new Set([1])).map((x) => x[0]), [60, 64]);
  assert.deepEqual(setVelocitySelected(n, new Set([2]), 40).map((x) => x[3]), [90, 90, 40]);
  assert.equal(selectAll(n).size, 3);
  assert.deepEqual(moveSelected(n, new Set(), 1, 1), n);                                      // an empty selection moves nothing
});
