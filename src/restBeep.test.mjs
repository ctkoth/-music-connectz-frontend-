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

test("every set of a superset starts the full rest: a held pair only adds a hint, never suppresses the rest or its beep", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const timer = src.slice(src.indexOf("function RestTimer"), src.indexOf("function LoggerRow"));
  assert.ok(!timer.includes("if (hold)"), "no separate held-pair card with no rest in it");
  assert.ok(!/if \(hold \|\|/.test(timer), "hold does not stop the alert");
  assert.ok(timer.includes("is next"), "still says which lift is next");
  assert.ok(timer.includes("clock(left)"), "the rest counts down after the first half too");
});

test("a beep booked on the audio clock is cancellable, and is never booked while sound is still locked", async () => {
  const made = fakeAudio({ state: "suspended" });
  const { scheduleBeep, primeRestBeep } = await import("./restBeep.js?s1");
  assert.equal(scheduleBeep(60), null);            // locked: the caller falls back to beeping on its tick
  assert.equal(made.osc, 0);
  primeRestBeep();                                 // a tap resumes it
  const cancel = scheduleBeep(60);
  assert.equal(typeof cancel, "function");
  assert.equal(made.osc, 3);                       // the three rest-over beeps
  assert.doesNotThrow(() => cancel());
});

test("the rest counts from when the set was logged even when the phone's clock is off the server's", async () => {
  const { sinceLogged, clockSkew } = await import("./restBeep.js?s3");
  const serverStamp = 1_000_000;
  // Phone runs 60 s BEHIND the server: it reads the stamp as 60 s in the future when the set comes back.
  const nowBehind = serverStamp - 60_000 + 100;
  const skew = clockSkew(serverStamp, nowBehind);
  assert.equal(sinceLogged(serverStamp, nowBehind, 0), 0);        // uncorrected: stuck at zero, rest never starts
  assert.equal(sinceLogged(serverStamp, nowBehind + 30_000, skew), 30);
  // Phone runs 5 minutes AHEAD: uncorrected, the rest is "over" at once and the beep is judged stale.
  const nowAhead = serverStamp + 300_000 + 100;
  const skew2 = clockSkew(serverStamp, nowAhead);
  assert.equal(sinceLogged(serverStamp, nowAhead, 0), 300);
  assert.equal(sinceLogged(serverStamp, nowAhead + 45_000, skew2), 45);
});

test("a nonsense timestamp is no skew and no elapsed time, never NaN", async () => {
  const { sinceLogged, clockSkew } = await import("./restBeep.js?s4");
  assert.equal(clockSkew(NaN, 5), 0);
  assert.equal(clockSkew(0, 3 * 86400000), 0);
  assert.equal(sinceLogged(NaN, 5, 0), 0);
});

test("BodieZ books the beep when the set is logged and measures the clock gap there", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  assert.match(src, /serverSkewMs = clockSkew\(/);
  assert.match(src, /scheduleBeep\(remaining\)/);
  assert.match(src, /sinceLogged\(new Date\(last\.created_at\)/);
});

test("the rest length is one number: first set, last set and every set of a superset get the same one", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const timer = src.slice(src.indexOf("function RestTimer"), src.indexOf("function LoggerRow"));
  assert.equal((timer.match(/const target = /g) || []).length, 1, "one definition of the rest length");
  assert.match(timer, /const target = goal\?\.rest_seconds \|\| custom;/);
  // `hold` (a pair's next lift) may only be read as the hint line, never to pick a different length or schedule.
  const uses = timer.split("\n").filter((l) => /\bhold\b/.test(l) && !l.includes("function RestTimer"));
  for (const l of uses) assert.ok(!/target|scheduleBeep|restClock/.test(l), `hold must not change the rest: ${l.trim()}`);
});
