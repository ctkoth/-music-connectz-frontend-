import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIXABLE, canFix, checkMoves, mark, moveText, planDetail, stillYours } from "./planRating.js";

const plan = (checks, extra = {}) => ({ score: 7.5, passed: 3, applicable: 4, goal: "Muscle gain", checks, ...extra });
const c = (key, ok, detail = "") => ({ key, label: key, ok, detail });

test("the Planner can fix order, reps and sets — and only those; access and repeats stay the member's", () => {
  assert.deepEqual([...FIXABLE].sort(), ["order", "reps", "sets"]);
  assert.equal(canFix(plan([c("reps", false), c("access", true)])), true);
  assert.equal(canFix(plan([c("access", false), c("repeats", false)])), false);
  assert.equal(canFix(plan([c("order", true)])), false);
  assert.deepEqual(stillYours(plan([c("order", false), c("repeats", false, "Bench appears twice")])).map((x) => x.key), ["repeats"]);
});

test("what the number is out of, and against what", () => {
  assert.equal(planDetail(plan([])), "3 of 4 checks · Muscle gain");
  assert.equal(planDetail(plan([], { goal: null })), "3 of 4 checks · no goal set");
  assert.equal(planDetail({ score: null, note: "No lifts yet — nothing to check." }), "No lifts yet — nothing to check.");
  assert.equal(planDetail(null), "");
});

test("a move reads as before → after, and says so when it did not move", () => {
  assert.equal(moveText({ before: 7.5, after: 10 }), "7.5 → 10");
  assert.equal(moveText({ before: 10, after: 6 }), "10 → 6");
  assert.equal(moveText({ before: 10, after: 10 }), "stays 10");
  assert.equal(moveText({ before: null, after: 10 }), "");
});

test("each check that moved says which way and why", () => {
  const moves = checkMoves({ checks: [{ check: "order", label: "Big lifts first", was: false, now: true, why: "Barbell Row (compound) comes after Bicep Curl (isolation)." }] });
  assert.equal(moves[0].text, "Big lifts first: ✗ → ✓");
  assert.match(moves[0].why, /Barbell Row/);
  assert.deepEqual(checkMoves(null), []);
  assert.equal(mark(null), "–");
});

const bodiez = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
const planUi = readFileSync(new URL("./apps/PlanRating.jsx", import.meta.url), "utf8");
const fitUi = readFileSync(new URL("./apps/EquipmentFit.jsx", import.meta.url), "utf8");

test("every routine card shows the Plan, and the caveat says it is not the Thorough rating", () => {
  assert.ok(bodiez.includes("<PlanRating"));
  assert.ok(planUi.includes("RatingRow") && planUi.includes('label="Plan"'));
  assert.ok(planUi.includes("What the Plan checks"));
});

test("the Planner's fix is shown before it is saved — the score move, the changes, and what is still the member's", () => {
  for (const needle of ["if the Planner fixes it", "moveText(p.compare)", "stillYours", "Apply", "Not now"]) assert.ok(planUi.includes(needle), needle);
});

test("Fit to equipment previews how the Plan moves and why, and saves the Planner's list", () => {
  for (const needle of ["fit-plan", "routines/plan/", "polish: true", "compare_to", "toSave", "ticket"]) assert.ok(fitUi.includes(needle), needle);
});

import { improveCta } from "./planRating.js";

test("the Improve CTA says where the routine stands and what pressing does, before it is pressed", () => {
  const fix = improveCta({ score: 7.5, passed: 3, applicable: 4, checks: [{ key: "reps", ok: false }, { key: "order", ok: false }, { key: "access", ok: true }] });
  assert.equal(fix.label, "Improve this routine");
  assert.equal(fix.line, "Plan 7.5/10 — 2 checks the Planner can fix.");
  const one = improveCta({ score: 9, checks: [{ key: "sets", ok: false }] });
  assert.equal(one.line, "Plan 9/10 — 1 check the Planner can fix.");
});

test("nothing for the Planner to fix reads as an invitation to open, not an 'improve' that would do nothing", () => {
  const ten = improveCta({ score: 10, checks: [{ key: "reps", ok: true }] });
  assert.equal(ten.label, "Open this routine");
  assert.match(ten.line, /nothing for the Planner to fix/);
  // only the member's own checks failing (access, repeats) is not something the Planner can fix either
  assert.equal(improveCta({ score: 8, checks: [{ key: "repeats", ok: false }] }).label, "Open this routine");
  assert.equal(improveCta({ score: null }).label, "Open this routine");
  assert.equal(improveCta(null), null);
});

test("an ended session offers it for a routine session and lands on that routine's card with its Plan open", () => {
  const card = bodiez.slice(bodiez.indexOf("function SessionSummary"), bodiez.indexOf("function SessionSummary") + 18000);
  for (const needle of ["improve-routine", "improveCta(routinePlan)", "onImprove(sm.routine_id)", "Free · you see every change"]) assert.ok(card.includes(needle), needle);
  assert.ok(bodiez.includes("jumpToImprove"));
  assert.ok(bodiez.includes("routine-${r.id}") && bodiez.includes("scrollIntoView"));
  assert.ok(bodiez.includes("autoOpen={landed === r.id}"));
  assert.ok(planUi.includes("autoOpen"));
});
