import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWorkouts, resolveRows, toRoutines, toWorkouts } from "./workoutImport.js";

const LIB = [{ id: 1, name: "Bench Press" }, { id: 2, name: "Barbell Row" }, { id: 3, name: "Dumbbell Curl" }];

test("a per-set export (Strong/Hevy style) becomes dated workouts with one set per row", () => {
  const csv = 'Date,Workout Name,Exercise Name,Weight (lb),Reps\n2026-10-01,Push,Bench Press,135,8\n2026-10-01,Push,Bench Press,135,7\n2026-10-03,Pull,Barbell Rows,115,10';
  const p = parseWorkouts(csv);
  assert.equal(p.unit, "lb");
  const { matched, missing } = resolveRows(p.rows, LIB);
  assert.deepEqual(missing, []);
  const w = toWorkouts(matched, "lb", "2026-10-24");
  assert.equal(w.length, 2);
  assert.equal(w[0].sets.length, 2);
  assert.equal(w[0].sets[0].weight_kg, 61.23);
});

test("a per-lift export becomes routines titled by workout, top set as target", () => {
  const p = parseWorkouts("Routine\tExercise\tSets\tReps\tKg\nA\tBench Press\t3\t10\t60\nA\tDumbbell Curl\t3\t12\t14");
  const r = toRoutines(resolveRows(p.rows, LIB).matched, "kg");
  assert.equal(r.length, 1);
  assert.deepEqual(r[0].exercises.map((e) => [e.exercise_id, e.sets, e.reps, e.weight_kg]), [[1, 3, 10, 60], [3, 3, 12, 14]]);
});

test("headerless lines parse, and unknown exercises are named, not guessed", () => {
  const p = parseWorkouts("Bench Press 3x10 60\nZercher Squat, 4, 6, 80");
  const { matched, missing } = resolveRows(p.rows, LIB);
  assert.equal(matched.length, 1);
  assert.deepEqual(missing, ["Zercher Squat"]);
});

test("a manual column mapping overrides detection", () => {
  const p = parseWorkouts("x,y,z\nBench Press,5,100", { mapping: { exercise: 0, reps: 1, weight: 2 } });
  assert.deepEqual([p.rows[0].name, p.rows[0].reps, p.rows[0].weight], ["Bench Press", 5, 100]);
});
