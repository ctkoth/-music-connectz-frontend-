import test from "node:test";
import assert from "node:assert/strict";
import { pitchForKey, parseMidi, layout, noteName, clampBase } from "./liveKeys.js";

const key = (k, extra = {}) => ({ key: k, ...extra });
test("the home row plays a scale up from the base, the row above the sharps", () => {
  assert.equal(pitchForKey(key("a"), 48), 48); assert.equal(pitchForKey(key("w"), 48), 49); assert.equal(pitchForKey(key("k"), 48), 60);
  assert.equal(pitchForKey(key("A"), 48), 48);                                   // caps lock / shift is the same key
});
test("modified keys and other keys are left to the app", () => {
  assert.equal(pitchForKey(key("a", { ctrlKey: true }), 48), null);
  assert.equal(pitchForKey(key("Escape"), 48), null); assert.equal(pitchForKey(key("1"), 48), null);
});
test("a key past the top of MIDI is silent, not an error", () => assert.equal(pitchForKey(key("k"), 120), null));
test("MIDI: note on, note off (including velocity-0 on), all-notes-off, and nothing else", () => {
  assert.deepEqual(parseMidi([0x90, 60, 100]), { type: "on", pitch: 60, vel: 100 });
  assert.deepEqual(parseMidi([0x93, 64, 80]), { type: "on", pitch: 64, vel: 80 });          // any channel
  assert.equal(parseMidi([0x90, 60, 0]).type, "off"); assert.equal(parseMidi([0x80, 60, 40]).type, "off");
  assert.equal(parseMidi([0xb0, 123, 0]).type, "panic");
  assert.deepEqual(parseMidi([0xb0, 64, 127]), { type: "sustain", on: true }); assert.deepEqual(parseMidi([0xb0, 64, 0]), { type: "sustain", on: false });
  assert.deepEqual(parseMidi([0xb0, 64, 63]), { type: "sustain", on: false });                 // the pedal switches at the halfway point
  assert.equal(parseMidi([0xe0, 0, 64]), null); assert.equal(parseMidi([0xf8]), null); assert.equal(parseMidi(null), null);
});
test("the on-screen layout puts black keys between whites, two octaves and a C is 15 whites", () => {
  const { keys, whites } = layout(48, 25);
  assert.equal(whites, 15); assert.equal(keys.filter((k) => k.black).length, 10);
  assert.equal(noteName(48), "C3"); assert.equal(noteName(61), "C♯4");
  assert.ok(keys.find((k) => k.pitch === 49).black && keys.find((k) => k.pitch === 49).at === 1);   // C♯ is after the first white key
});
test("the base stays on the piano", () => { assert.equal(clampBase(-5), 12); assert.equal(clampBase(500), 84); });
