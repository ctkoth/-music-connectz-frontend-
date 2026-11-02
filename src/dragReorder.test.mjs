import { test } from "node:test";
import assert from "node:assert/strict";
import { moveItem, moveRun, moveWithinRun, runs } from "./dragReorder.js";

test("moveItem moves one and returns a new array", () => {
  const a = [1, 2, 3, 4];
  assert.deepEqual(moveItem(a, 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem(a, 3, 0), [4, 1, 2, 3]);
  assert.deepEqual(moveItem(a, 1, 9), [1, 2, 3, 4]);
  assert.deepEqual(a, [1, 2, 3, 4]);
});

const sets = [{ e: "bench", n: 1 }, { e: "bench", n: 2 }, { e: "row", n: 1 }, { e: "curl", n: 1 }];
const key = (s) => s.e;

test("runs groups neighbours", () => {
  assert.deepEqual(runs(sets, key).map((r) => [r.key, r.items.length]), [["bench", 2], ["row", 1], ["curl", 1]]);
});

test("an exercise moves with all its sets", () => {
  assert.deepEqual(moveRun(sets, key, 0, 2).map((s) => `${s.e}${s.n}`), ["row1", "curl1", "bench1", "bench2"]);
});

test("a set moves only inside its exercise", () => {
  assert.deepEqual(moveWithinRun(sets, key, 0, 1, 0).map((s) => `${s.e}${s.n}`), ["bench2", "bench1", "row1", "curl1"]);
});
