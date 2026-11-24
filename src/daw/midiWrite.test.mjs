import test from "node:test";
import assert from "node:assert/strict";
import { writeMidi } from "./midiWrite.js";
import { parseMidi } from "./midi.js";

test("what is written reads back: tempo, name, notes, lengths and velocities", () => {
  const notes = [[60, 0, 1, 100], [64, 1.5, 0.5, 80], [67, 2, 4, 127], [72, 7.25, 0.25, 1]];
  const bytes = writeMidi({ bpm: 96, name: "Take", parts: [{ name: "Ether (played)", notes }] });
  const m = parseMidi(bytes);
  assert.equal(m.bpm, 96);
  const part = m.tracks.find((t) => t.notes.length);
  assert.equal(part.name, "Ether (played)");
  assert.equal(part.notes.length, 4);
  notes.forEach((n, i) => { const g = part.notes[i]; assert.equal(g[0], n[0]); assert.ok(Math.abs(g[1] - n[1]) < 1 / 480 + 1e-9); assert.ok(Math.abs(g[2] - n[2]) < 1 / 480 + 1e-9); assert.equal(g[3], n[3]); });
});
test("the same pitch twice in a row stays two notes", () => {
  const m = parseMidi(writeMidi({ parts: [{ name: "x", notes: [[60, 0, 1, 90], [60, 1, 1, 90]] }] }));
  assert.equal(m.tracks.find((t) => t.notes.length).notes.length, 2);
});
test("a very long take and no notes both produce a valid file", () => {
  assert.equal(parseMidi(writeMidi({ parts: [{ name: "x", notes: Array.from({ length: 3000 }, (_, i) => [40 + (i % 40), i * 0.25, 0.2, 90]) }] })).tracks.find((t) => t.notes.length).notes.length, 3000);
  assert.throws(() => parseMidi(writeMidi({ parts: [] })), /no notes/);   // a valid file, and the reader says plainly there is nothing in it
});
test("junk values are held to MIDI's range", () => {
  const n = parseMidi(writeMidi({ bpm: 9999, parts: [{ name: "x", notes: [[300, 0, 1, 900], [-5, 1, 1, -3]] }] })).tracks.find((t) => t.notes.length).notes;
  assert.deepEqual(n.map((x) => [x[0], x[3]]), [[127, 127], [0, 1]]);
});
