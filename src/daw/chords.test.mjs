// The Songwriter's theory: the right chords in every key, and a tap tempo one late tap cannot move.
import test from "node:test";
import assert from "node:assert/strict";
import { KEYS, LAYERS, PROGRESSIONS, chordAt, cleanSong, progressionChords, progressionSeconds, tapTempo } from "./chords.js";

const names = (k, mode, prog) => progressionChords(k, mode, prog).map((c) => c.name);

test("the pop progression in C major is C G Am F", () => {
  assert.deepEqual(names(0, "major", "pop"), ["C", "G", "Am", "F"]);
  assert.deepEqual(progressionChords(0, "major", "pop").map((c) => c.roman), ["I", "V", "vi", "IV"]);
});

test("the same progression moves with the key and the mode", () => {
  assert.deepEqual(names(7, "major", "pop"), ["G", "D", "Em", "C"]);
  assert.deepEqual(names(9, "minor", "pop"), ["Am", "Em", "F", "Dm"]);
  assert.deepEqual(names(9, "minor", "dark"), ["Am", "F", "C", "G"]);
});

test("a major scale's seventh is diminished and every triad is three rising notes", () => {
  const vii = chordAt(0, "major", 7);
  assert.equal(vii.name, "B°");
  assert.equal(vii.roman, "vii°");
  for (let k = 0; k < 12; k++) for (let d = 1; d <= 7; d++) for (const mode of ["major", "minor"]) {
    const c = chordAt(k, mode, d);
    assert.equal(c.notes.length, 3);
    assert.ok(c.notes[0] < c.notes[1] && c.notes[1] < c.notes[2]);
    assert.equal(c.root, c.notes[0]);
  }
});

test("every progression is playable and an unknown one falls back", () => {
  for (const k of Object.keys(PROGRESSIONS)) assert.ok(progressionChords(0, "major", k).length >= 4, k);
  assert.deepEqual(names(0, "major", "nope"), names(0, "major", "pop"));
  assert.equal(KEYS.length, 12);
});

test("length is chords x beats x times at the tempo", () => {
  assert.equal(progressionSeconds(4, { bpm: 120, beatsPerChord: 4, times: 1 }), 8);
  assert.equal(progressionSeconds(4, { bpm: 120, beatsPerChord: 2, times: 4 }), 16);
});

test("stored settings come back usable, with at least one instrument on", () => {
  for (const junk of [null, 3, "x", {}]) assert.equal(cleanSong(junk).prog, "pop");
  const s = cleanSong({ key: 44, mode: "lydian", beats: 3, layers: { pad: false, keys: false, bass: false, arp: false } });
  assert.equal(s.key, 0); assert.equal(s.mode, "major"); assert.equal(s.beats, 4);
  assert.ok(Object.values(s.layers).some(Boolean));
  assert.deepEqual(Object.keys(s.layers), Object.keys(LAYERS));
  assert.equal(cleanSong({ layers: { arp: true } }).layers.arp, true);
});

test("tap tempo needs three taps, reads the beat, and shrugs off one late tap", () => {
  assert.equal(tapTempo([0, 500]), null);
  assert.equal(tapTempo([0, 500, 1000, 1500]), 120);
  assert.equal(tapTempo([0, 500, 1000, 1500, 2400, 2900]), 120);
  assert.equal(tapTempo([0, 1, 2, 3]), 300);
  assert.equal(tapTempo("no"), null);
});
