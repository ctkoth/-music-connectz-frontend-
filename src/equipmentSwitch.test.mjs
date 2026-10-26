import { test } from "node:test";
import assert from "node:assert/strict";
import { movementWords, equivalentsFor, planEquipmentSwitch, applyEquipmentSwitch } from "./equipmentSwitch.js";

const ex = (id, name, muscle_group, equipment, extra = {}) => ({ id, name, muscle_group, equipment, ...extra });
const LIB = [
  ex(1, "Barbell Bench Press", "chest", "barbell"),
  ex(2, "Dumbbell Bench Press", "chest", "dumbbell"),
  ex(3, "Dumbbell Fly", "chest", "dumbbell"),
  ex(4, "Machine Chest Press", "chest", "machine"),
  ex(5, "Barbell Row", "back", "barbell"),
  ex(6, "Dumbbell Row", "back", "dumbbell"),
  ex(7, "Barbell Squat", "upper_legs", "barbell"),
  ex(8, "Push-Up", "chest", "bodyweight"),
];
const row = (exercise_id, extra = {}) => ({ exercise_id, sets: 3, reps: 8, weight_kg: 100, ...extra });

test("gear words are not the movement", () => {
  assert.deepEqual(movementWords("Barbell Bench Press"), ["bench", "press"]);
  assert.deepEqual(movementWords("Dumbbell Bench Press"), ["bench", "press"]);
});

test("the same movement on the new equipment ranks first", () => {
  const got = equivalentsFor(LIB[0], ["dumbbell"], LIB, new Set());
  assert.deepEqual(got.map((x) => x.id), [2, 3]);
});

test("only the same muscle is ever offered", () => {
  const got = equivalentsFor(LIB[0], ["dumbbell", "machine", "bodyweight"], LIB, new Set());
  assert.ok(got.every((x) => x.muscle_group === "chest"));
  assert.ok(!got.some((x) => x.id === 6));
});

test("a plan changes only what does not fit and leaves the rest alone", () => {
  const rows = [row(1), row(6), row(7)];     // barbell bench, dumbbell row, barbell squat
  const plan = planEquipmentSwitch(rows, LIB, LIB, ["dumbbell"]);
  assert.equal(plan.fits, 1);
  assert.deepEqual(plan.changes.map((c) => [c.index, c.pick]), [[0, 2]]);
  assert.deepEqual(plan.stuck.map((x) => x.index), [2]);
});

test("a lift already in the routine is not offered as the replacement", () => {
  const rows = [row(1), row(2)];           // dumbbell bench already there
  const plan = planEquipmentSwitch(rows, LIB, LIB, ["dumbbell"]);
  assert.equal(plan.changes[0].pick, 3);   // so the fly is proposed, not a duplicate
});

test("two lifts never get proposed the same replacement", () => {
  const lib = [ex(1, "Barbell Press", "chest", "barbell"), ex(2, "Machine Press", "chest", "machine"),
               ex(3, "Dumbbell Press", "chest", "dumbbell")];
  const plan = planEquipmentSwitch([row(1), row(2)], lib, lib, ["dumbbell"]);
  assert.equal(plan.changes.length, 1);
  assert.equal(plan.stuck.length, 1);
});

test("no equivalent is said, not guessed", () => {
  const plan = planEquipmentSwitch([row(7)], LIB, LIB, ["dumbbell"]);   // no dumbbell leg lift
  assert.equal(plan.changes.length, 0);
  assert.deepEqual(plan.stuck.map((s) => s.from.id), [7]);
});

test("choosing nothing plans nothing", () => {
  const plan = planEquipmentSwitch([row(1)], LIB, LIB, []);
  assert.deepEqual(plan, { changes: [], stuck: [], fits: 0, unknown: 0 });
});

test("a lift the library does not know is left alone", () => {
  const plan = planEquipmentSwitch([row(999)], LIB, LIB, ["dumbbell"]);
  assert.equal(plan.unknown, 1);
  assert.equal(plan.changes.length, 0);
});

test("the pool is the member's own list: a lift they cannot do is never offered", () => {
  const pool = LIB.filter((e) => e.id !== 2);          // the server hid it
  const plan = planEquipmentSwitch([row(1)], LIB, pool, ["dumbbell"]);
  assert.equal(plan.changes[0].pick, 3);
});

test("applying keeps sets, reps, order and superset label, and clears the weight", () => {
  const rows = [row(1, { group: "A", weight_input: "220", added: true }), row(5, { group: "A" })];
  const plan = planEquipmentSwitch(rows, LIB, LIB, ["dumbbell"]);
  const out = applyEquipmentSwitch(rows, plan.changes);
  assert.deepEqual(out.map((r) => r.exercise_id), [2, 6]);
  assert.deepEqual(out.map((r) => r.group), ["A", "A"]);
  assert.deepEqual(out.map((r) => r.sets), [3, 3]);
  assert.deepEqual(out.map((r) => r.weight_kg), [null, null]);
  assert.equal(out[0].added, undefined);
  assert.equal(rows[0].exercise_id, 1, "the input is not mutated");
});

test("a member's own pick overrides the top option", () => {
  const plan = planEquipmentSwitch([row(1)], LIB, LIB, ["dumbbell"]);
  assert.equal(applyEquipmentSwitch([row(1)], plan.changes, { 0: 3 })[0].exercise_id, 3);
});
