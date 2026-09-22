// pickForDay's equipment filter accepts a string (the member app's own
// single-select, unchanged) or an array (the trial door's multi-select).
// See bodiezPick.js's own comment for why both shapes have to work.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickForDay } from "./bodiezPick.js";

const EXERCISES = [
  { id: 1, muscle_group: "chest", equipment: "barbell", name: "Bench Press" },
  { id: 2, muscle_group: "chest", equipment: "dumbbell", name: "Dumbbell Press" },
  { id: 3, muscle_group: "back", equipment: "cable", name: "Cable Row" },
  { id: 4, muscle_group: "back", equipment: "dumbbell", name: "Dumbbell Row" },
];

test("no equipment filter picks the first exercise per muscle", () => {
  const picks = pickForDay(["chest", "back"], null, EXERCISES, "");
  assert.deepEqual(picks.map((p) => p.id), [1, 3]);
});

test("a single equipment string still works (the member app's own select)", () => {
  const picks = pickForDay(["chest", "back"], null, EXERCISES, "dumbbell");
  assert.deepEqual(picks.map((p) => p.id), [2, 4]);
});

test("an equipment array matches ANY of the selected types", () => {
  const picks = pickForDay(["chest", "back"], null, EXERCISES, ["cable", "dumbbell"]);
  // chest has no cable exercise, so it falls to dumbbell; back has both and
  // takes whichever the library lists first among the selected types.
  assert.deepEqual(picks.map((p) => p.id), [2, 3]);
});

test("an empty equipment array means no filter, same as an empty string", () => {
  const picks = pickForDay(["chest", "back"], null, EXERCISES, []);
  assert.deepEqual(picks.map((p) => p.id), [1, 3]);
});

test("a muscle with no exercise in the selected equipment is skipped, not crashed", () => {
  const picks = pickForDay(["chest", "back"], null, EXERCISES, ["cable"]);
  assert.deepEqual(picks.map((p) => p.id), [3]); // chest has no cable exercise
});
