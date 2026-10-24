import test from "node:test";
import assert from "node:assert/strict";
import { beatSeconds, planFor, totalSeconds } from "./breathPlan.js";

const box = { rounds: 2, steps: [{ phase: "in", beats: 4 }, { phase: "hold", beats: 4 }, { phase: "out", beats: 4 }, { phase: "hold", beats: 4 }] };
const bar = { rounds: 3, bpm_based: true, bpm_default: 90, steps: [{ phase: "in", beats: 1 }, { phase: "out", beats: 7 }] };

test("a plain pattern runs in seconds", () => {
  const plan = planFor(box);
  assert.equal(plan.length, 8);
  assert.equal(totalSeconds(plan), 32);
  assert.deepEqual(plan.map((s) => s.round), [1, 1, 1, 1, 2, 2, 2, 2]);
});

test("a rap pattern is in beats at the member's tempo, so a faster verse breathes faster", () => {
  assert.equal(beatSeconds(bar, 120), 0.5);
  assert.equal(totalSeconds(planFor(bar, 120)), 12);   // 3 rounds x 8 beats x 0.5s
  assert.equal(totalSeconds(planFor(bar, 60)), 24);
});

test("a nonsense tempo is clamped, never a zero- or infinite-length breath", () => {
  assert.equal(beatSeconds(bar, 0), 60 / 90);          // falls back to the pattern's own default
  assert.equal(beatSeconds(bar, 9999), 60 / 220);
  assert.equal(beatSeconds(bar, 5), 60 / 40);
});
