import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateRoutineSeconds, fmtEstimate, routineTimeNote, DEFAULT_REST_SECONDS } from "./routineTime.js";

test("one exercise: setup + reps + rests between sets (none after the last)", () => {
  // 60 setup + 3*10*3 reps + 2*90 rest = 330
  assert.equal(estimateRoutineSeconds([{ sets: 3, reps: 10 }]), 330);
});

test("a goal's own rest is used instead of the default", () => {
  assert.equal(estimateRoutineSeconds([{ sets: 3, reps: 10 }], 45), 60 + 90 + 90);
});

test("text-box values count, blanks and zeros do not", () => {
  assert.equal(estimateRoutineSeconds([{ sets: "3", reps: "10" }, { sets: "", reps: "10" }, { sets: 0, reps: 5 }]), 330);
});

test("nothing to estimate gives no figure, not 0 minutes", () => {
  assert.equal(fmtEstimate(estimateRoutineSeconds([])), "");
});

test("rounded to five minutes, never below five, hours read as hours", () => {
  assert.equal(fmtEstimate(330), "≈ 5 min");
  assert.equal(fmtEstimate(47 * 60), "≈ 45 min");
  assert.equal(fmtEstimate(75 * 60), "≈ 1 h 15 min");
  assert.equal(fmtEstimate(60 * 60), "≈ 1 h");
});

test("the note states the assumptions it used", () => {
  assert.match(routineTimeNote(), new RegExp(`${DEFAULT_REST_SECONDS} s rest`));
  assert.match(routineTimeNote(120), /120 s rest/);
});
