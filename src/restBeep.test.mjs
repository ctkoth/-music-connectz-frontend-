import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

let made = 0;
let oscillators = 0;
function installAudio(state) {
  made = 0; oscillators = 0;
  globalThis.window = {
    AudioContext: class {
      constructor() { made += 1; this.state = state; this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve().then(() => { this.state = "running"; }); }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      createOscillator() { oscillators += 1; return { frequency: {}, connect() {}, start() {}, stop() {} }; }
    },
  };
}

const m = await import("./restBeep.js");

beforeEach(() => { globalThis.localStorage = fakeStorage(); m._resetRestBeep(); });

test("the beep is on until the member turns it off, and stays off", () => {
  assert.equal(m.restSoundOn(), true);
  m.setRestSoundOn(false);
  assert.equal(m.restSoundOn(), false);
  m.setRestSoundOn(true);
  assert.equal(m.restSoundOn(), true);
});

test("an unreadable store means sound, not silence — a timer that never beeps is the bug", () => {
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(m.restSoundOn(), true);
  assert.doesNotThrow(() => m.setRestSoundOn(false));
});

test("a running context plays three notes", () => {
  installAudio("running");
  assert.equal(m.playNewSetBeep(), "played");
  assert.equal(oscillators, 3);
});

test("a locked context is reported, not silently skipped", () => {
  installAudio("suspended");
  assert.equal(m.playNewSetBeep(), "locked");
  assert.equal(oscillators, 0);
});

test("a tap resumes the context, after which the beep plays", async () => {
  installAudio("suspended");
  assert.equal(m.unlockAudio(), "suspended");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(m.playNewSetBeep(), "played");
});

test("one context is reused for the whole workout", () => {
  installAudio("running");
  m.unlockAudio(); m.playNewSetBeep(); m.playNewSetBeep(); m.playNewSetBeep();
  assert.equal(made, 1);
});

test("off means no audio is even created", () => {
  installAudio("running");
  m.setRestSoundOn(false);
  assert.equal(m.playNewSetBeep(), "off");
  assert.equal(made, 0);
});

test("a browser with no audio says so", () => {
  globalThis.window = {};
  assert.equal(m.unlockAudio(), "unsupported");
  assert.equal(m.playNewSetBeep(), "unsupported");
});
