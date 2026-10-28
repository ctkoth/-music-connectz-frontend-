import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A fake audio stack: records what was scheduled, and starts SUSPENDED like a real browser.
function fakeAudio({ state = "suspended" } = {}) {
  const made = { ctxs: 0, osc: 0, resumes: 0, silent: 0 };
  class Ctx {
    constructor() { made.ctxs++; this.state = state; this.currentTime = 0; this.destination = {}; }
    createBuffer() { return {}; }
    createBufferSource() { return { connect: (n) => n, start() { made.silent++; } }; }
    resume() { made.resumes++; this.state = "running"; return Promise.resolve(); }
    createOscillator() { made.osc++; return { frequency: {}, connect: (n) => n, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (n) => n }; }
  }
  globalThis.window = { AudioContext: Ctx };
  return made;
}

test("a beep with no earlier tap still resumes the suspended context and plays three beeps", async () => {
  const made = fakeAudio();
  const { restBeep } = await import("./restBeep.js?a");
  assert.equal(restBeep(), true);
  assert.equal(made.ctxs, 1);
  assert.equal(made.resumes, 1);
  assert.equal(made.osc, 3);
});

test("priming on a tap makes one context and unlocks it; later taps do not make more", async () => {
  const made = fakeAudio();
  const { primeRestBeep, restBeep } = await import("./restBeep.js?b");
  primeRestBeep(); primeRestBeep(); primeRestBeep();
  assert.equal(made.ctxs, 1);
  assert.equal(made.resumes, 1);          // only while suspended
  assert.equal(restBeep(), true);
  assert.equal(made.resumes, 1);
});

test("the unlock listens for the taps Chrome and Safari actually accept, not just pointerdown", async () => {
  const { UNLOCK_EVENTS } = await import("./restBeep.js?f");
  // Chrome counts a touch as activation on release only; pointerdown is a mouse-only trigger.
  for (const ev of ["pointerup", "touchend", "click", "keydown"]) assert.ok(UNLOCK_EVENTS.includes(ev), ev);
  assert.ok(!UNLOCK_EVENTS.includes("pointerdown"));
});

test("iOS: a silent buffer is played once inside the gesture, and 'interrupted' is resumed like 'suspended'", async () => {
  const made = fakeAudio({ state: "interrupted" });
  const { primeRestBeep, beepState } = await import("./restBeep.js?g");
  assert.equal(beepState(), "locked");
  primeRestBeep(); primeRestBeep();
  assert.equal(made.silent, 1);
  assert.equal(made.resumes, 1);          // second tap: already running, nothing to do
  assert.equal(beepState(), "ready");
});

test("beepState says unsupported when there is no audio at all", async () => {
  globalThis.window = {};
  const { beepState } = await import("./restBeep.js?h");
  assert.equal(beepState(), "unsupported");
});

test("no audio support is a quiet false, never a throw", async () => {
  globalThis.window = {};
  const { restBeep, primeRestBeep } = await import("./restBeep.js?c");
  assert.equal(restBeep(), false);
  assert.equal(primeRestBeep(), false);
});

test("the clock counts DOWN, floors at zero, and says how far over", async () => {
  const { restClock } = await import("./restBeep.js?d");
  assert.deepEqual(restClock(30, 90), { left: 60, over: 0, done: false });
  assert.deepEqual(restClock(90, 90), { left: 0, over: 0, done: true });
  assert.deepEqual(restClock(100, 90), { left: 0, over: 10, done: true });
});

test("it beeps when rest ends while the member is here, never on a stale reload", async () => {
  const { shouldBeep, STALE_AFTER_SECONDS } = await import("./restBeep.js?e");
  assert.equal(shouldBeep({ done: true, over: 0, alreadyAlerted: false }), true);
  assert.equal(shouldBeep({ done: true, over: STALE_AFTER_SECONDS, alreadyAlerted: false }), true);
  assert.equal(shouldBeep({ done: true, over: STALE_AFTER_SECONDS + 1, alreadyAlerted: false }), false);
  assert.equal(shouldBeep({ done: false, over: 0, alreadyAlerted: false }), false);
  assert.equal(shouldBeep({ done: true, over: 0, alreadyAlerted: true }), false);
});

test("the timer shows time LEFT and no longer makes its own audio context at the moment rest ends", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const timer = src.slice(src.indexOf("function RestTimer"), src.indexOf("function LoggerRow"));
  assert.ok(timer.includes("clock(left)"), "the big number is the time remaining");
  assert.ok(!timer.includes("new (window.AudioContext"), "a context made with no gesture is the silent-beep bug");
  assert.ok(timer.includes("restBeep()") && timer.includes("primeRestBeep"));
});

test("a superset waiting on its second lift still shows both clocks and the rest that follows, up front", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const timer = src.slice(src.indexOf("function RestTimer"), src.indexOf("function LoggerRow"));
  const held = timer.slice(timer.indexOf("if (hold) {"), timer.indexOf("Rest after {last.exercise_name"));
  assert.ok(held.includes("clock(gap.left)"), "the gap to the second lift counts DOWN while held");
  assert.ok(held.includes("clock(target)"), "the rest that follows is stated before it starts");
  assert.ok(held.includes("alerts?.notify"), "says whether a notification will come");
  assert.ok(held.includes("choices("), "the rest length can be changed without leaving the superset");
});
