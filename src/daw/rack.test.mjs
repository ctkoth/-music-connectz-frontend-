// The Channel Rack model: a stored rack can never break the screen, and time is where the grid says.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CHANNELS, MAX_PATTERNS, STEPS, addChannel, addPattern, barSeconds, cleanRack, clearPattern, currentPattern, hasNotes,
  newRack, noteHz, noteName, removeChannel, removePattern, selectPattern, setChannel, setSwing, stepTimes, toggleStep,
} from "./rack.js";

test("a new rack already holds a beat, sixteen steps a channel", () => {
  const r = newRack();
  assert.equal(r.patterns.length, 1);
  assert.ok(hasNotes(currentPattern(r)));
  assert.ok(currentPattern(r).channels.every((c) => c.steps.length === STEPS));
});

test("toggling a step changes only that step of that channel, without mutating", () => {
  const r = newRack();
  const c = currentPattern(r).channels[1];
  const next = toggleStep(r, c.id, 3);
  assert.equal(currentPattern(next).channels[1].steps[3], !c.steps[3]);
  assert.equal(currentPattern(r).channels[1].steps[3], c.steps[3]);
  assert.deepEqual(currentPattern(next).channels[0], currentPattern(r).channels[0]);
});

test("channel settings are clamped and an unknown voice is refused", () => {
  const r = newRack();
  const id = currentPattern(r).channels[0].id;
  const c = currentPattern(setChannel(r, id, { vol: 9, note: 999, voice: "theremin" })).channels[0];
  assert.equal(c.vol, 1);
  assert.equal(c.voice, "kick");
  assert.ok(c.note <= 60);
});

test("channels and patterns stop at their caps; the last pattern cannot be deleted", () => {
  let r = newRack();
  for (let i = 0; i < 30; i++) r = addChannel(r, "hat");
  assert.equal(currentPattern(r).channels.length, MAX_CHANNELS);
  for (let i = 0; i < 30; i++) r = addPattern(r);
  assert.equal(r.patterns.length, MAX_PATTERNS);
  let one = newRack();
  one = removePattern(one);
  assert.equal(one.patterns.length, 1);
});

test("a cloned pattern is a copy with its own ids, and is selected", () => {
  const r = addPattern(newRack(), { copy: true });
  assert.equal(r.current, 1);
  assert.deepEqual(r.patterns[1].channels.map((c) => c.steps), r.patterns[0].channels.map((c) => c.steps));
  assert.ok(r.patterns[1].channels.every((c, i) => c.id !== r.patterns[0].channels[i].id));
  const edited = toggleStep(r, r.patterns[1].channels[0].id, 1);
  assert.notDeepEqual(edited.patterns[1].channels[0].steps, edited.patterns[0].channels[0].steps);
});

test("clear empties the steps and keeps the channels; remove drops one", () => {
  const r = newRack();
  const cleared = clearPattern(r);
  assert.equal(hasNotes(currentPattern(cleared)), false);
  assert.equal(currentPattern(cleared).channels.length, currentPattern(r).channels.length);
  assert.equal(currentPattern(removeChannel(r, currentPattern(r).channels[0].id)).channels.length, currentPattern(r).channels.length - 1);
});

test("whatever was stored comes back as a usable rack", () => {
  for (const junk of [null, 5, "x", {}, { patterns: [] }, { patterns: "no" }]) assert.equal(cleanRack(junk).patterns.length, 1);
  const r = cleanRack({ current: 99, swing: 5, patterns: [{ channels: [{ voice: "nope", vol: "loud", steps: [1, 0, 1] }, null] }] });
  assert.equal(r.current, 0);
  assert.equal(r.swing, 0.6);
  const [c, d] = r.patterns[0].channels;
  assert.equal(c.voice, "kick");
  assert.equal(c.vol, 0.8);
  assert.deepEqual(c.steps.slice(0, 4), [true, false, true, false]);
  assert.equal(c.steps.length, STEPS);
  assert.ok(d.id);
  assert.equal(selectPattern(r, 7).current, 0);
});

test("steps fall on sixteenths, and swing delays only the off ones", () => {
  const straight = stepTimes(120, 0, 1);
  assert.equal(straight.length, STEPS);
  assert.ok(Math.abs(straight[4] - 0.5) < 1e-9);
  assert.ok(Math.abs(barSeconds(120) - 2) < 1e-9);
  const swung = stepTimes(120, 0.5, 2);
  assert.equal(swung.length, 32);
  assert.equal(swung[2], straight[2]);
  assert.ok(Math.abs(swung[1] - (straight[1] + 0.0625)) < 1e-9);
  assert.ok(swung.at(-1) < barSeconds(120) * 2);
  assert.equal(setSwing(newRack(), -3).swing, 0);
});

test("notes are named and tuned from A4 = 440", () => {
  assert.equal(noteName(69), "A4");
  assert.equal(noteName(36), "C2");
  assert.ok(Math.abs(noteHz(69) - 440) < 1e-9);
  assert.ok(Math.abs(noteHz(57) - 220) < 1e-9);
});
