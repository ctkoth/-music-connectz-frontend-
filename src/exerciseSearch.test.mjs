import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRank, suggest } from "./exerciseSearch.js";

const ex = (id, name, muscle_group, times_done = 0, last_done = null) => ({ id, name, muscle_group, times_done, last_done });
const LIB = [
  ex(1, "Incline Dumbbell Press", "chest"), ex(2, "Dumbbell Fly", "chest", 3, "2026-10-01"),
  ex(3, "Dumbbell Row", "back", 5, "2026-10-05"), ex(4, "Seated Dumbbell Curl", "biceps"),
  ex(5, "Sled Push", "upper_legs"),
];

test("every typed word must match, anywhere in the name", () => {
  assert.equal(matchRank("Incline Dumbbell Press", "inc dumb"), 1);
  assert.equal(matchRank("Incline Dumbbell Press", "zzz"), null);
  assert.equal(matchRank("Incline Dumbbell Press", "incline press"), 1);
});

test("starts-with outranks word-start outranks contains", () => {
  assert.equal(matchRank("Dumbbell Row", "dumb"), 0);
  assert.equal(matchRank("Seated Dumbbell Curl", "dumb"), 1);
  assert.equal(matchRank("Seated Dumbbell Curl", "bell"), 2);
});

test("nothing typed: the member's own history first, most recent first", () => {
  assert.deepEqual(suggest(LIB, "", "").slice(0, 2).map((e) => e.id), [3, 2]);
});

test("narrowed by muscle, then by what they type", () => {
  assert.deepEqual(suggest(LIB, "", "chest").map((e) => e.id), [2, 1]);
  assert.deepEqual(suggest(LIB, "dumb", "back").map((e) => e.id), [3]);
});

test("typing ranks a better name match above their history", () => {
  assert.equal(suggest(LIB, "dumbbell", "")[0].name.startsWith("Dumbbell"), true);
});

test("nothing matches: an empty list, never an invented row", () => {
  assert.deepEqual(suggest(LIB, "zzzz", ""), []);
});
