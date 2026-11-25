import test from "node:test";
import assert from "node:assert/strict";
import { tuneVerdict } from "./tuning.js";
import { scaleNotes, diatonicChords, noteFreq } from "./scales.js";

test("a positive cents reading is SHARP and says to bring it down; negative is FLAT and says up", () => {
  assert.deepEqual(tuneVerdict(12), { state: "sharp", cents: 12, text: "12 cents sharp", action: "Bring it down" });
  assert.deepEqual(tuneVerdict(-12), { state: "flat", cents: 12, text: "12 cents flat", action: "Bring it up" });
});
test("within five cents is in tune, and no reading is no verdict", () => {
  assert.equal(tuneVerdict(5).state, "in");
  assert.equal(tuneVerdict(-5).state, "in");
  assert.equal(tuneVerdict(6).state, "sharp");
  assert.equal(tuneVerdict(null), null);
  assert.equal(tuneVerdict(NaN), null);
});
test("scales spell the notes a musician expects", () => {
  assert.deepEqual(scaleNotes("C", "major"), ["C", "D", "E", "F", "G", "A", "B"]);
  assert.deepEqual(scaleNotes("A", "minor"), ["A", "B", "C", "D", "E", "F", "G"]);
  assert.deepEqual(scaleNotes("G", "majorPent"), ["G", "A", "B", "D", "E"]);
  assert.deepEqual(scaleNotes("E", "minorPent"), ["E", "G", "A", "B", "D"]);
  assert.deepEqual(scaleNotes("Z", "major"), []);
  assert.deepEqual(scaleNotes("C", "nope"), []);
});
test("the chords of a key are the ones every musician knows", () => {
  assert.deepEqual(diatonicChords("C", "major"), ["C", "Dm", "Em", "F", "G", "Am", "B°"]);
  assert.deepEqual(diatonicChords("A", "minor"), ["Am", "B°", "C", "Dm", "Em", "F", "G"]);
  assert.deepEqual(diatonicChords("C", "blues"), []);
});
test("A4 is 440 and an octave up doubles it", () => {
  assert.equal(noteFreq("A", 4), 440);
  assert.equal(noteFreq("A", 5), 880);
  assert.equal(noteFreq("Q"), null);
});
