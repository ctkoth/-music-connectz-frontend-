import { test } from "node:test";
import assert from "node:assert/strict";
import { applyFit, equipmentOf, fitRoutine, nameCore, showByEquipment, similarity, stillOff } from "./equipmentFit.js";

// A slice of the real library's shape (names and equipment from the seeded database).
let id = 0;
const X = (name, muscle_group, equipment, extra = {}) => ({ id: ++id, name, muscle_group, equipment, accessible: true, ...extra });
const LIB = [
  X("Bench Press", "chest", "barbell"), X("Dumbbell Bench Press", "chest", "dumbbell"), X("Machine Bench Press", "chest", "machine"),
  X("Dumbbell Fly", "chest", "dumbbell"), X("Push-Up", "chest", "bodyweight"), X("Seated Band Chest Press", "chest", "band"),
  X("Barbell Row", "back", "barbell"), X("Dumbbell Row", "back", "dumbbell"), X("Seated Band Row", "back", "band"),
  X("Pull-Up", "back", "bodyweight"),
  X("Deadlift", "back", "barbell"),
  X("Barbell Curl", "biceps", "barbell"),                     // no dumbbell/band curl in this slice
];
const idOf = (n) => LIB.find((e) => e.name === n).id;
const row = (n, extra = {}) => ({ exercise_id: idOf(n), order: 0, sets: 3, reps: 10, weight_kg: 60, ...extra });

test("the movement is the name without the gear: same lift, different equipment", () => {
  assert.deepEqual([...nameCore("Incline Dumbbell Press")].sort(), ["incline", "press"]);
  assert.deepEqual([...nameCore("Smith Machine Bench Press")].sort(), ["bench", "press"]);
  assert.equal(similarity("Bench Press", "Dumbbell Bench Press"), 2);
  assert.equal(similarity("Bench Press", "Dumbbell Fly"), 0);
});

test("a barbell routine becomes dumbbells: same muscle, the same movement first", () => {
  const plan = fitRoutine({ rows: [row("Bench Press"), row("Barbell Row")], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  assert.equal(plan[0].best.name, "Dumbbell Bench Press");          // not the Fly, though both are chest + dumbbell
  assert.match(plan[0].why, /bench press/i);
  assert.equal(plan[1].best.name, "Dumbbell Row");
  assert.ok(plan.every((p) => !p.ok));
});

test("a lift that already uses the picked equipment is left alone", () => {
  const plan = fitRoutine({ rows: [row("Dumbbell Row"), row("Pull-Up")], exercises: LIB, pickable: LIB, equipment: ["dumbbell", "bodyweight"] });
  assert.ok(plan.every((p) => p.ok && p.best === null));
});

test("no equipment picked means any, and nothing changes", () => {
  const plan = fitRoutine({ rows: [row("Bench Press")], exercises: LIB, pickable: LIB, equipment: [] });
  assert.ok(plan[0].ok);
  assert.deepEqual(applyFit(plan).map((r) => r.exercise_id), [idOf("Bench Press")]);
});

test("several equipment types: any of them is fine", () => {
  const plan = fitRoutine({ rows: [row("Bench Press")], exercises: LIB, pickable: LIB, equipment: ["band", "bodyweight"] });
  assert.ok(["Seated Band Chest Press", "Push-Up"].includes(plan[0].best.name));
  assert.ok(plan[0].candidates.every((c) => ["band", "bodyweight"].includes(c.equipment)));
});

test("nothing in that equipment for the muscle: it says so, keeps the lift, and never invents one", () => {
  const plan = fitRoutine({ rows: [row("Barbell Curl")], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  assert.equal(plan[0].best, null);
  assert.equal(plan[0].candidates.length, 0);
  assert.deepEqual(applyFit(plan).map((r) => r.exercise_id), [idOf("Barbell Curl")]);   // kept
  assert.equal(stillOff({ plan, exercises: LIB, equipment: ["dumbbell"] }).length, 1);
  assert.deepEqual(applyFit(plan, { 0: "remove" }), []);                                // the member's call
});

test("two rows never get the same replacement, and a lift already in the routine is not offered", () => {
  const plan = fitRoutine({ rows: [row("Bench Press"), row("Machine Bench Press")], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  const ids = plan.map((p) => p.best?.id);
  assert.equal(new Set(ids.filter(Boolean)).size, ids.filter(Boolean).length);
  const withDb = fitRoutine({ rows: [row("Bench Press"), row("Dumbbell Bench Press")], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  assert.notEqual(withDb[0].best?.name, "Dumbbell Bench Press");                        // already there on row 2
});

test("the member's own pick overrides the Planner's, and only offers what the server allows", () => {
  const noFly = LIB.filter((e) => e.name !== "Dumbbell Fly");        // e.g. a movement setting rules it out
  const plan = fitRoutine({ rows: [row("Bench Press")], exercises: LIB, pickable: noFly, equipment: ["dumbbell"] });
  assert.ok(!plan[0].candidates.some((c) => c.name === "Dumbbell Fly"));
  const swapped = applyFit(plan, { 0: idOf("Seated Band Chest Press") });
  assert.equal(swapped[0].exercise_id, idOf("Seated Band Chest Press"));
});

test("a swap keeps sets, reps and place, and clears the weight (60 kg barbell is not 60 kg dumbbell)", () => {
  const plan = fitRoutine({ rows: [row("Bench Press", { sets: 5, reps: 5 })], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  const [r] = applyFit(plan);
  assert.equal(r.exercise_id, idOf("Dumbbell Bench Press"));
  assert.deepEqual([r.sets, r.reps, r.weight_kg], [5, 5, null]);
});

test("an unswapped row keeps its weight", () => {
  const plan = fitRoutine({ rows: [row("Dumbbell Row", { weight_kg: 30 }), row("Bench Press")], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  const out = applyFit(plan);
  assert.equal(out[0].weight_kg, 30);
  assert.equal(out[1].weight_kg, null);
});

test("a superset pair survives when both halves swap, and a pair broken by a removal is dropped", () => {
  const pair = [row("Bench Press", { group: "A" }), row("Barbell Row", { group: "A" })];
  const kept = applyFit(fitRoutine({ rows: pair, exercises: LIB, pickable: LIB, equipment: ["dumbbell"] }));
  assert.deepEqual(kept.map((r) => r.group), ["A", "A"]);
  const broken = applyFit(fitRoutine({ rows: pair, exercises: LIB, pickable: LIB, equipment: ["dumbbell"] }), { 1: "remove" });
  assert.equal(broken.length, 1);
  assert.equal(broken[0].group, undefined);
});

test("an exercise the library no longer names is kept, not guessed at", () => {
  const plan = fitRoutine({ rows: [{ exercise_id: 99999, order: 0, sets: 3, reps: 10 }], exercises: LIB, pickable: LIB, equipment: ["dumbbell"] });
  assert.equal(plan[0].best, null);
  assert.equal(applyFit(plan)[0].exercise_id, 99999);
});

test("show everything that uses the equipment, by muscle", () => {
  const by = showByEquipment({ pickable: LIB, equipment: ["band"] });
  assert.deepEqual(Object.keys(by).sort(), ["back", "chest"]);
  assert.deepEqual(by.chest.map((e) => e.name), ["Seated Band Chest Press"]);
  assert.equal(Object.keys(showByEquipment({ pickable: LIB, equipment: [] })).length, 3);
});

test("a routine's equipment, for the start list", () => {
  assert.deepEqual(equipmentOf([row("Bench Press"), row("Dumbbell Row"), row("Barbell Row")], LIB, { barbell: "Barbell", dumbbell: "Dumbbell" }),
    ["Barbell", "Dumbbell"]);
});

import { readFileSync } from "node:fs";
const bodiez = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
const fitUi = readFileSync(new URL("./apps/EquipmentFit.jsx", import.meta.url), "utf8");

test("SessionZ starts a session from a routine or a custom one, and a routine can be fitted before starting", () => {
  const sessionz = bodiez.slice(bodiez.indexOf("function SessionZView"), bodiez.indexOf("// Same scheduler shape"));
  for (const needle of ["Start a custom session", "Routine to start", "Fit to equipment", "EquipmentFit", "Continue it"]) {
    assert.ok(sessionz.includes(needle), needle);
  }
});

test("SessionZ leads with the finished sessions: weight lifted, how much of the plan, and Begin / Edit on every row", () => {
  const sessionz = bodiez.slice(bodiez.indexOf("function SessionZView"), bodiez.indexOf("// Same scheduler shape"));
  for (const needle of ["lifted", "h.done_pct", "Routine Thorough", "RatingNumber", ">Edit<", "Save & begin", "Begin"]) {
    assert.ok(sessionz.includes(needle) || sessionz.includes(needle.replace(">", "").replace("<", "")), needle);
  }
  // A custom session has no plan, so it must never show a made-up "done" figure.
  assert.ok(sessionz.includes("h.done_pct != null"));
});

test("the exercise picker narrows by muscle AND equipment, so a session can add a lift the way a routine does", () => {
  const picker = readFileSync(new URL("./apps/ExercisePicker.jsx", import.meta.url), "utf8");
  for (const needle of ["Narrow by muscle", "By equipment", "EquipmentPicker", "toggleEquipment"]) {
    assert.ok(picker.includes(needle), needle);
  }
});

test("the live logger names the lift on the button, confirms what was logged, and lets a wrong set be taken back", () => {
  const row = bodiez.slice(bodiez.indexOf("function LoggerRow"), bodiez.indexOf("function TodayView"));
  for (const needle of ["Log set for {planned.name}", "Logged {planned.name}", "Wrong lift? Undo", "onUndoSet", "Remove this"]) {
    assert.ok(row.includes(needle), needle);
  }
  assert.ok(bodiez.includes("async function undoSet"), "the screen must be able to drop a set from the open session");
});

test("a custom session can be saved to RoutineZ from the card shown when it ends", () => {
  const card = bodiez.slice(bodiez.indexOf("function SessionSummary"), bodiez.indexOf("function SessionSummary") + 16000);
  for (const needle of ["Save to RoutineZ", "canSaveRoutine", "!sm.routine_title", "top set becomes the target"]) {
    assert.ok(card.includes(needle), needle);
  }
});

test("RoutineZ cards offer the equipment fit, and a new routine is made without leaving the screen", () => {
  assert.ok(bodiez.includes("Fit to equipment"));
  assert.ok(bodiez.includes("async function saveNewRoutine"));
});

test("the equipment fit states that it is free and saves nothing until a button is pressed", () => {
  assert.ok(fitUi.includes("free, no AI"));
  assert.ok(fitUi.includes("nothing is saved until you press one"));
  assert.ok(fitUi.includes("weight is cleared"));
});
