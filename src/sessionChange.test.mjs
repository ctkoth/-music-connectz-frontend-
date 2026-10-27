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
