import { test } from "node:test";
import assert from "node:assert/strict";
import { applySessionPairs, pairOf, prunePairs, setPair, unsetPair } from "./supersets.js";

const row = (id, extra = {}) => ({ exercise_id: id, name: `L${id}`, ...extra });

test("any two lifts pair, and a lift is in at most one pair", () => {
  let p = setPair([], 1, 4);
  assert.deepEqual(p, [[1, 4]]);
  assert.equal(pairOf(p, 1), 4);
  assert.equal(pairOf(p, 4), 1);
  assert.equal(pairOf(p, 2), null);
  p = setPair(p, 4, 2);                       // 4 re-pairs: its old pair comes apart, 1 is left single
  assert.deepEqual(p, [[4, 2]]);
  assert.equal(pairOf(p, 1), null);
  assert.deepEqual(setPair([[1, 2]], 3, 3), [[1, 2]]);          // a lift is not its own partner
  assert.deepEqual(setPair(null, 1, 2), [[1, 2]]);
});

test("unpairing from either side ends the pair", () => {
  assert.deepEqual(unsetPair([[1, 2], [3, 4]], 2), [[3, 4]]);
  assert.deepEqual(unsetPair([[1, 2]], 9), [[1, 2]]);
});

test("a lift taken out of the workout takes its superset with it", () => {
  assert.deepEqual(prunePairs([[1, 2], [3, 4]], [1, 2, 3]), [[1, 2]]);
  assert.deepEqual(prunePairs([[1, 2]], []), []);
});

test("a pair of lifts that are not neighbours is drawn as neighbours: the second sits under the first", () => {
  const out = applySessionPairs([row(1), row(2), row(3), row(4)], [[1, 3]]);
  assert.deepEqual(out.map((r) => r.exercise_id), [1, 3, 2, 4]);
  assert.deepEqual(out.map((r) => r.group), ["A", "A", undefined, undefined]);
});

test("a pair already side by side is grouped in place — dragging a pair never flips it", () => {
  const out = applySessionPairs([row(1), row(3), row(2)], [[3, 1]]);          // 3 before 1 in the pair, 3 is below 1 on screen
  assert.deepEqual(out.map((r) => r.exercise_id), [1, 3, 2]);
  assert.deepEqual(out.map((r) => r.group), ["A", "A", undefined]);
});

test("a session pair overrides a routine's pair; the old partner is left single", () => {
  const rows = [row(1, { group: "A" }), row(2, { group: "A" }), row(3)];
  const out = applySessionPairs(rows, [[2, 3]]);
  assert.deepEqual(out.map((r) => r.exercise_id).sort(), [1, 2, 3]);
  assert.equal(out.filter((r) => r.group).length, 2);
  assert.ok(!out.find((r) => r.exercise_id === 1).group);
});

test("a pair naming a lift that is not on screen is skipped, and several pairs get their own letters", () => {
  assert.deepEqual(applySessionPairs([row(1), row(2)], [[1, 99]]).map((r) => r.group), [undefined, undefined]);
  const out = applySessionPairs([row(1), row(2), row(3), row(4)], [[1, 2], [3, 4]]);
  assert.deepEqual(out.map((r) => r.group), ["A", "A", "B", "B"]);
});

test("applying nothing changes nothing, and never mutates its input", () => {
  const rows = [row(1), row(2)];
  assert.deepEqual(applySessionPairs(rows, []), rows);
  applySessionPairs(rows, [[1, 2]]);
  assert.ok(!("group" in rows[0]));
});

import { readFileSync } from "node:fs";
const bodiez = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
const pairUi = readFileSync(new URL("./components/PairMode.jsx", import.meta.url), "utf8");
const planUi = readFileSync(new URL("./apps/PlanRating.jsx", import.meta.url), "utf8");
const fitUi = readFileSync(new URL("./apps/EquipmentFit.jsx", import.meta.url), "utf8");

test("a past workout's editor and a live session both link ANY two lifts, and a pair is saved with the session", () => {
  assert.ok(bodiez.includes("function SupersetPick"));
  assert.ok(bodiez.includes("Superset with"));
  assert.ok(bodiez.includes("superset_pairs: prunePairs(pairs"));              // saved with the edit
  assert.ok(bodiez.includes("saveSessionPairs"));                              // saved on a live session
  assert.ok(bodiez.includes("applySessionPairs([...routinePlanned, ...extraRows], pairs)"));   // a planned lift and an added one can pair
});

test("compound + isolation and push + pull are options when creating AND when improving, with the Planner's gate stated", () => {
  assert.ok(bodiez.includes("<PairMode value={buildPairMode}"));              // creating (the builders)
  assert.ok(planUi.includes("<PairMode"));                                    // improving (the Plan's fix)
  assert.ok(fitUi.includes("<PairMode"));                                     // improving (Fit to equipment)
  assert.ok(pairUi.includes("StatzSample") && pairUi.includes("offer.manual"));   // the gate, and the free way beside it
  assert.ok(pairUi.includes("/api/economy/bodiez/pair/"));                    // the modes are the server's, not retyped
  const code = pairUi.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");        // comments may name them; code may not
  assert.ok(!/compound|isolation|push \+ pull/i.test(code), "the mode labels must come from the server");
});

test("the ended-session card reports what was done, updates the routine, and puts the AI coach with the routine CTAs", () => {
  const card = bodiez.slice(bodiez.indexOf("function SessionSummary"), bodiez.indexOf("function SessionSummary") + 26000);
  for (const needle of ["session-report", "doneLine(sm.report)", "Update the routine from this session", "onUpdateRoutine", "Effort, not a rating"]) {
    assert.ok(card.includes(needle), needle);
  }
  assert.ok(card.indexOf("<AICoachRead") < card.indexOf("sm.exercises.map"), "the AI coach comes before the exercise list, not at the foot");
});
