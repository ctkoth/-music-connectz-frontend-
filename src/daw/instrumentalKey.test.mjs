import test from "node:test";
import assert from "node:assert/strict";
import { instrumentalTracks, keyOfSession, rhythmTracks, sessionKeyFor, keySentence, tempoSentence } from "./instrumentalKey.js";
import { SESSION_KEYS } from "./session.js";

test("the instrumental is everything but lead vocals, backing vocals and drums", () => {
  const t = [{ id: 1, name: "Lead vox.wav" }, { id: 2, name: "beat.wav" }, { id: 3, name: "kick.wav" }, { id: 4, name: "808 bass.wav" },
            { id: 5, name: "x.wav", role: "backing" }, { id: 6, name: "piano.wav" }, { id: 7, name: "thing.wav", role: "drums" }];
  assert.deepEqual(instrumentalTracks(t).map((x) => x.id), [2, 4, 6]);
});

test("a track with no audio is never listened to, and no instrumental means an empty list", () => {
  assert.deepEqual(instrumentalTracks([{ id: 1, name: "beat" }], () => false), []);
  assert.deepEqual(instrumentalTracks([{ id: 1, name: "vocal" }]), []);
  assert.deepEqual(instrumentalTracks(null), []);
});

test("a detected key is named the way the session names its keys", () => {
  assert.equal(sessionKeyFor({ root: "C#", mode: "major" }), "Db major");
  assert.equal(sessionKeyFor({ root: "A#", mode: "minor" }), "Bb minor");
  assert.equal(sessionKeyFor({ root: "A", mode: "minor" }), "A minor");
  assert.equal(sessionKeyFor({ root: "F#", mode: "major" }), "F# major");
  assert.equal(sessionKeyFor(null), "");
  // Every key the detector can name has a home in the list, or says so with "".
  for (const root of ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]) for (const mode of ["major", "minor"]) {
    const k = sessionKeyFor({ root, mode });
    assert.ok(k === "" || SESSION_KEYS.includes(k), `${root} ${mode}`);
  }
});

test("the sentence says what it heard and from what, and is honest when it heard nothing", () => {
  const k = { label: "A minor", relative: "C major", margin: 0.2 };
  assert.match(keySentence(k, ["beat.wav"]), /A minor.*instrumental \(beat\.wav\).*C major/);
  assert.match(keySentence(k, [], true), /whole mix/);
  assert.match(keySentence({ ...k, margin: 0.01 }, ["b"]), /close between/);
  assert.match(keySentence(null), /couldn't find a clear key/);
});

test("the tempo listens to the beat WITH its drums, but never to the vocals", () => {
  const tr = [{ id: 1, name: "Lead vox" }, { id: 2, name: "kick" }, { id: 3, name: "beat" }, { id: 4, name: "x", role: "backing" }];
  assert.deepEqual(rhythmTracks(tr).map((x) => x.id), [2, 3]);
});

test("the tempo sentence names the twin and the doubt, and says so when it counted nothing", () => {
  assert.match(tempoSentence({ bpm: 70, alt: 140, strength: 0.6 }, ["beat"]), /70 BPM.*140 BPM/);
  assert.match(tempoSentence({ bpm: 90, alt: null, strength: 0.1 }, ["beat"]), /not very clear/);
  assert.match(tempoSentence(null), /couldn't find a steady beat/);
});

// The project's key as ChordZ reads it: every one of the 24 project keys maps to a root ChordZ spells, and back again.
const CHORDZ_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
test("every project key reads as a key ChordZ can show, and the mapping round-trips to the same label", () => {
  for (const label of SESSION_KEYS) {
    const k = keyOfSession(label);
    assert.ok(k, `${label} has no key`);
    assert.ok(CHORDZ_NOTES.includes(k.root), `${label} reads as ${k.root}, which ChordZ does not spell`);
    assert.equal(sessionKeyFor(k), label);
  }
});

test("flat project keys read as the sharp root ChordZ uses, and anything else reads as no key", () => {
  assert.deepEqual(keyOfSession("Eb minor"), { root: "D#", mode: "minor" });
  assert.deepEqual(keyOfSession("Db major"), { root: "C#", mode: "major" });
  assert.deepEqual(keyOfSession("A minor"), { root: "A", mode: "minor" });
  assert.equal(keyOfSession(""), null);
  assert.equal(keyOfSession("not set"), null);
  assert.equal(keyOfSession(undefined), null);
});
