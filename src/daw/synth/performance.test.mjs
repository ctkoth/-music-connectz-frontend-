import test from "node:test";
import assert from "node:assert/strict";
import { eventsToNotes } from "./performance.js";

const on = (t, pitch, vel = 100) => ({ t, type: "on", pitch, vel }); const off = (t, pitch) => ({ t, type: "off", pitch }); const ped = (t, v) => ({ t, type: "sustain", on: v });
// 120 BPM: a beat is 0.5 s
test("a note's start and length come out in beats", () => {
  const n = eventsToNotes([on(0.5, 60), off(1.5, 60)], 120, 2);
  assert.deepEqual(n, [[60, 1, 2, 100]]);
});
test("with the pedal down, a released key keeps sounding until the pedal comes up", () => {
  const n = eventsToNotes([ped(0, true), on(0, 60), off(0.5, 60), on(1, 64), off(1.5, 64), ped(3, false)], 120, 4);
  assert.deepEqual(n.map((x) => [x[0], x[1], x[2]]), [[60, 0, 6], [64, 2, 4]]);                 // both end at 3 s
});
test("a key held through the pedal's release is not cut", () => {
  const n = eventsToNotes([on(0, 60), ped(0.2, true), ped(1, false), off(2, 60)], 120, 3);
  assert.deepEqual(n.map((x) => x[2]), [4]);
});
test("playing a note again cuts the first one at the new press", () => {
  const n = eventsToNotes([ped(0, true), on(0, 60), off(0.5, 60), on(1, 60), off(1.2, 60), ped(2, false)], 120, 3);
  assert.deepEqual(n.map((x) => [x[1], x[2]]), [[0, 2], [2, 2]]);
});
test("notes still held when the take stops end there; strays are ignored; a blip has a floor", () => {
  assert.deepEqual(eventsToNotes([on(0, 60)], 120, 2)[0][2], 4);
  assert.deepEqual(eventsToNotes([off(1, 60)], 120, 2), []);
  assert.ok(eventsToNotes([on(1, 60), off(1.001, 60)], 120, 2)[0][2] > 0);
  assert.deepEqual(eventsToNotes([], 120, 2), []);
});
test("velocity stays in MIDI range and notes come out in time order", () => {
  const n = eventsToNotes([on(2, 72, 500), off(3, 72), on(0, 60, 0), off(1, 60)], 120, 4);
  assert.deepEqual(n.map((x) => [x[0], x[3]]), [[60, 1], [72, 127]]);
});
