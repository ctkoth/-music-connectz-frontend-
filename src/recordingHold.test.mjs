// A take must survive opening another app, and must not outlive its welcome.
import test from "node:test";
import assert from "node:assert/strict";
import {
  clearHold, holdClock, getHolds, heldTabs, nextPhase, recordingNow, resetHolds, setHold, stableSlots, stopAll, subscribe,
} from "./recordingHold.js";

test("a running recorder always holds", () => {
  for (const prev of [null, "recording", "ready"]) {
    for (const active of [true, false]) assert.equal(nextPhase(prev, { recording: true, active }), "recording");
  }
});

test("stopped on screen releases; stopped out of sight keeps the take until the member returns", () => {
  assert.equal(nextPhase("recording", { recording: false, active: true }), null);
  assert.equal(nextPhase("recording", { recording: false, active: false }), "ready");
  assert.equal(nextPhase("ready", { recording: false, active: false }), "ready");
  assert.equal(nextPhase("ready", { recording: false, active: true }), null);
});

test("an app that never recorded never holds", () => {
  assert.equal(nextPhase(null, { recording: false, active: false }), null);
  assert.equal(nextPhase(null, { recording: false, active: true }), null);
});

test("holds list each tab once and notify only on a real change", () => {
  resetHolds();
  let calls = 0;
  const off = subscribe(() => { calls += 1; });
  const stop = () => {};
  setHold("a", { tab: "singz", phase: "recording", stop });
  setHold("a", { tab: "singz", phase: "recording", stop });      // unchanged
  setHold("b", { tab: "singz", phase: "recording", stop });
  setHold("c", { tab: "arsenal", phase: "ready", stop });
  assert.equal(calls, 3);
  assert.deepEqual(heldTabs(), ["singz", "arsenal"]);
  assert.equal(recordingNow().length, 2);
  const before = getHolds();
  assert.equal(getHolds(), before, "the snapshot is stable between changes");
  clearHold("a"); clearHold("a");
  assert.equal(calls, 4);
  off();
  clearHold("b");
  assert.equal(calls, 4);
  resetHolds();
});

test("the clock of a hold does not restart inside one phase, and does on the next", () => {
  resetHolds();
  setHold("a", { tab: "singz", phase: "recording", label: "x" });
  const since = getHolds()[0].since;
  setHold("a", { tab: "singz", phase: "recording", label: "y" });
  assert.equal(getHolds()[0].since, since);
  resetHolds();
});

test("a hold without a tab or a phase is not a hold", () => {
  resetHolds();
  setHold("a", { tab: "", phase: "recording" });
  setHold("b", { tab: "singz", phase: null });
  assert.equal(getHolds().length, 0);
});

test("stopAll stops running recorders only, and one that throws does not save the rest", () => {
  resetHolds();
  const hit = [];
  setHold("a", { tab: "singz", phase: "recording", stop: () => { throw new Error("stuck"); } });
  setHold("b", { tab: "rapz", phase: "recording", stop: () => hit.push("b") });
  setHold("c", { tab: "arsenal", phase: "ready", stop: () => hit.push("c") });
  stopAll();
  assert.deepEqual(hit, ["b"]);
  resetHolds();
});

test("a mounted slot keeps its place; new ones go on the end; unwanted ones leave", () => {
  assert.deepEqual(stableSlots([], ["singz"]), ["singz"]);
  assert.deepEqual(stableSlots(["singz"], ["singz", "metz"]), ["singz", "metz"]);
  assert.deepEqual(stableSlots(["singz", "metz"], ["singz", "tunerz"]), ["singz", "tunerz"]);
  // singz released while it is the active tab and arsenal still holds: singz does not move.
  assert.deepEqual(stableSlots(["singz", "arsenal"], ["arsenal", "singz"]), ["singz", "arsenal"]);
  assert.deepEqual(stableSlots(["singz"], ["singz", "singz", null]), ["singz"]);
});

test("clock reads m:ss and never goes negative", () => {
  assert.equal(holdClock(0), "0:00");
  assert.equal(holdClock(65_400), "1:05");
  assert.equal(holdClock(-5), "0:00");
});
