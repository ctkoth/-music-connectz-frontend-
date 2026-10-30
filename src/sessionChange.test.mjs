import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { direction, changeText, againstWhat, liftChange, repsChangeText } from "./sessionChange.js";

const kg = (n) => `${n}kg`;

test("direction: up, down, same, and null when there is nothing to compare", () => {
  assert.equal(direction(100), "up");
  assert.equal(direction(-0.5), "down");
  assert.equal(direction(0), "same");
  assert.equal(direction(null), null);
});

test("the change reads as a signed amount and the server's percent", () => {
  assert.equal(changeText(100, 25, kg), "▲ +100kg (+25%)");
  assert.equal(changeText(-100, -33.3, kg), "▼ −100kg (−33.3%)");
  assert.equal(changeText(0, 0, kg), "= same as last time");
  assert.equal(changeText(null, null, kg), "");
});

test("no percent is invented when last time had no weight to be a percent of", () => {
  assert.equal(changeText(200, null, kg), "▲ +200kg");
});

test("it says what it is comparing against, and never implies a like-for-like it did not have", () => {
  const when = new Date("2026-10-20T12:00:00Z").toLocaleDateString();
  assert.equal(againstWhat({ basis: "routine", routine_title: "Push day", started_at: "2026-10-20T12:00:00Z" }), `last Push day (${when})`);
  assert.equal(againstWhat({ basis: "last", routine_title: "Push day", started_at: "2026-10-20T12:00:00Z" }), `your last session (${when})`);
  assert.equal(againstWhat(null), "");
});

test("a lift's change prefers its top weight, falls back to volume, and is blank for a new lift", () => {
  assert.equal(liftChange({ vs_last: { top_delta_kg: 5, volume_delta_kg: 100 } }, kg), "top ▲ +5kg");
  assert.equal(liftChange({ vs_last: { top_delta_kg: -2.5, volume_delta_kg: -10 } }, kg), "top ▼ −2.5kg");
  assert.equal(liftChange({ vs_last: { top_delta_kg: 0, volume_delta_kg: 40 } }, kg), "volume ▲ +40kg");
  assert.equal(liftChange({ vs_last: { top_delta_kg: null, volume_delta_kg: 0 } }, kg), "same as last time");
  assert.equal(liftChange({}, kg), "");
});

test("a bodyweight-only comparison falls back to reps", () => {
  assert.equal(repsChangeText({ reps_delta: 5 }), "▲ +5 reps");
  assert.equal(repsChangeText({ reps_delta: 0 }), "");
});

test("the summary card says the session ended, shows the total and the comparison, and scrolls itself into view", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const card = src.slice(src.indexOf("function SessionSummary"), src.indexOf("function SessionSummary") + 9000);
  for (const needle of ["Session ended", "total {unit} lifted", "vs-last", "scrollIntoView", "new record", "not_repeated"]) {
    assert.ok(card.includes(needle), needle);
  }
});

import { doneLine, doneVsLast, editedNote, restLine } from "./sessionChange.js";
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

test("Done says how much of the plan was done, and what was extra", () => {
  assert.equal(doneLine({ completion_pct: 75, sets_completed: 6, sets_planned: 8, lifts_done: 2, lifts_planned: 2, extra_sets: 1, sets_done: 7 }),
    "Done 75% of the plan — 6 of 8 sets · 2 of 2 lifts · +1 extra set");
  assert.equal(doneLine({ completion_pct: 100, sets_completed: 8, sets_planned: 8, lifts_done: 2, lifts_planned: 2, extra_sets: 0, sets_done: 8 }),
    "Done 100% of the plan — 8 of 8 sets · 2 of 2 lifts");
});

test("a custom session has no plan to complete — it says so, not '0%'", () => {
  assert.equal(doneLine({ completion_pct: null, sets_done: 3 }), "Custom session — no plan to complete. 3 sets logged.");
  assert.equal(doneLine(null), "");
});

test("against last time: the points moved, or just last time's figure when it cannot be compared", () => {
  assert.equal(doneVsLast({ report: { completion_pct: 50 }, completion_delta: 25 }), "last time 50% (+25 points)");
  assert.equal(doneVsLast({ report: { completion_pct: 80 }, completion_delta: -10 }), "last time 80% (−10 points)");
  assert.equal(doneVsLast({ report: { completion_pct: 60 }, completion_delta: 0 }), "last time 60% (same)");
  assert.equal(doneVsLast({ report: { completion_pct: 60 }, completion_delta: null }), "last time 60%");
  assert.equal(doneVsLast({ report: { completion_pct: null } }), "");
  assert.equal(doneVsLast(null), "");
});

test("rest is the measured average against the goal's own target, and absent when nothing was measured", () => {
  assert.equal(restLine({ avg_rest_seconds: 80, rest_sets: 2, rest_target_seconds: 75 }, mmss), "Average rest 1:20 over 2 sets — the goal's target is 1:15");
  assert.equal(restLine({ avg_rest_seconds: 90, rest_sets: 1, rest_target_seconds: null }, mmss), "Average rest 1:30 over 1 set");
  assert.equal(restLine({ avg_rest_seconds: null }, mmss), "");
});

test("an edited routine is said to be edited", () => {
  assert.match(editedNote({ routine_changed: true }), /edited since last time/);
  assert.equal(editedNote({ routine_changed: false }), "");
  assert.equal(editedNote(null), "");
});
