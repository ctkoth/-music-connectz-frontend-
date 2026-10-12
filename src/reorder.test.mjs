import { test } from "node:test";
import assert from "node:assert/strict";
import { reorderList, reorderBlocks, applyBlockOrder, blockIds } from "./reorder.js";

const r = (id, group) => (group ? { exercise_id: id, group } : { exercise_id: id });

test("reorderList moves one item and ignores no-ops and bad indexes", () => {
  assert.deepEqual(reorderList([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(reorderList([1, 2, 3, 4], 3, 0), [4, 1, 2, 3]);
  const same = [1, 2];
  assert.equal(reorderList(same, 1, 1), same);
  assert.equal(reorderList(same, 5, 0), same);
});

test("a superset pair moves as one block and stays adjacent", () => {
  const rows = [r(1), r(2, "A"), r(3, "A"), r(4)];
  assert.deepEqual(reorderBlocks(rows, 1, 0).map((x) => x.exercise_id), [2, 3, 1, 4]);
  assert.deepEqual(reorderBlocks(rows, 0, 2).map((x) => x.exercise_id), [2, 3, 4, 1]);
});

test("a saved block order is applied, unknown ids ignored, the rest kept in place", () => {
  const rows = [r(1), r(2, "A"), r(3, "A"), r(4)];
  assert.deepEqual(applyBlockOrder(rows, [4, 99, 2]).map((x) => x.exercise_id), [4, 2, 3, 1]);
  assert.equal(applyBlockOrder(rows, []), rows);
  assert.deepEqual(blockIds(rows), [1, 2, 4]);
});
