import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY, apply, cycle, isActive, params, stateOf } from "./muscleFilter.js";

test("one tap shows only, two hides, three clears", () => {
  let s = cycle(EMPTY, "chest");
  assert.equal(stateOf(s, "chest"), "only");
  s = cycle(s, "chest"); assert.equal(stateOf(s, "chest"), "hide");
  s = cycle(s, "chest"); assert.equal(stateOf(s, "chest"), ""); assert.equal(isActive(s), false);
});

test("only keeps just those, hide drops, and both combine", () => {
  const items = ["chest", "back", "upper_legs"].map((m) => ({ m }));
  const key = (x) => x.m;
  assert.deepEqual(apply(items, key, { only: ["chest", "back"], hide: [] }).map(key), ["chest", "back"]);
  assert.deepEqual(apply(items, key, { only: [], hide: ["upper_legs"] }).map(key), ["chest", "back"]);
  assert.deepEqual(apply(items, key, { only: ["chest", "back"], hide: ["back"] }).map(key), ["chest"]);
  assert.equal(apply(items, key, EMPTY), items);
});

test("the server parameters are blank when nothing is marked", () => {
  assert.deepEqual(params(EMPTY), { muscle: "", not_muscle: "" });
  assert.deepEqual(params({ only: ["a", "b"], hide: ["c"] }), { muscle: "a,b", not_muscle: "c" });
});
