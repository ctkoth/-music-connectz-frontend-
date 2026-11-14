import test from "node:test";
import assert from "node:assert/strict";
import { pickCount, pickEvery, pickState } from "./selectAll.js";

test("select all keeps the member's order and appends the rest in list order", () => {
  assert.deepEqual(pickEvery(["a", "b", "c", "d"], ["c", "a"]), ["c", "a", "b", "d"]);
  assert.deepEqual(pickEvery(["a", "b"], []), ["a", "b"]);
  // A pick the list no longer offers is dropped, never kept alive by select-all.
  assert.deepEqual(pickEvery(["a", "b"], ["gone", "b"]), ["b", "a"]);
});

test("state and count only look at what the list offers", () => {
  assert.equal(pickState(["a", "b"], []), "none");
  assert.equal(pickState(["a", "b"], ["a"]), "some");
  assert.equal(pickState(["a", "b"], ["b", "a", "x"]), "all");
  assert.equal(pickState([], ["x"]), "none");
  assert.equal(pickCount(["a", "b"], ["a", "x"]), 1);
});
