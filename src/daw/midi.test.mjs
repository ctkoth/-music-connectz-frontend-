import test from "node:test";
import assert from "node:assert/strict";
import { beatsOf, parseMidi } from "./midi.js";

// A tiny MIDI writer for the tests: format 1, 480 ppq, a tempo track and note tracks.
const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
const chunk = (id, bytes) => [...id].map((c) => c.charCodeAt(0)).concat([(bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255], bytes);
function midiFile(tracks, { tempo = 500000, ppq = 480 } = {}) {
  const head = chunk("MThd", [0, 1, 0, tracks.length + 1, ppq >> 8, ppq & 255]);
  const tempoTrk = chunk("MTrk", [0, 0xff, 0x51, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255, 0, 0xff, 0x2f, 0]);
  const body = tracks.flatMap((ev) => chunk("MTrk", [...ev, 0, 0xff, 0x2f, 0]));
  return new Uint8Array([...head, ...tempoTrk, ...body]);
}
const name = (s) => [0, 0xff, 0x03, s.length, ...[...s].map((c) => c.charCodeAt(0))];

test("notes, names, program, tempo and beats come back", () => {
  const bass = [...name("Bass"), 0, 0xc0, 33, 0, 0x90, 36, 100, ...vlq(480), 0x80, 36, 0, 0, 0x90, 40, 90, ...vlq(960), 0x90, 40, 0];
  const drums = [0, 0x99, 36, 120, ...vlq(240), 0x89, 36, 0];
  const m = parseMidi(midiFile([bass, drums], { tempo: 600000 }));
  assert.equal(m.bpm, 100);
  assert.equal(m.tracks.length, 2);
  const b = m.tracks[0];
  assert.equal(b.name, "Bass");
  assert.equal(b.program, 33);
  assert.deepEqual(b.notes, [[36, 0, 1, 100], [40, 1, 2, 90]]);
  assert.equal(beatsOf(b.notes), 3);
  assert.equal(m.tracks[1].drums, true);
});

test("running status and an unreleased note are handled", () => {
  // 0x90 once, then two more note events with no status byte.
  const t = [0, 0x90, 60, 100, ...vlq(480), 60, 0, 0, 64, 80];
  const m = parseMidi(midiFile([t]));
  assert.equal(m.tracks[0].notes.length, 2);
  assert.deepEqual(m.tracks[0].notes[0], [60, 0, 1, 100]);
});

test("anything that is not a MIDI file says so in plain words", () => {
  assert.throws(() => parseMidi(new Uint8Array([1, 2, 3])), /isn't a MIDI file/);
  assert.throws(() => parseMidi(midiFile([[0, 0xc0, 1]])), /no notes/);
});

import { INSTRUMENTS, cleanInstrument, instrumentFor } from "./instruments.js";

test("a General MIDI program picks a fitting instrument, and channel 10 is the kit", () => {
  assert.equal(instrumentFor({ program: 0 }), "piano");
  assert.equal(instrumentFor({ program: 33 }), "bass");
  assert.equal(instrumentFor({ program: 48 }), "strings");
  assert.equal(instrumentFor({ program: 0, drums: true }), "drums");
  assert.equal(cleanInstrument("vst://evil"), "piano");
  assert.ok(INSTRUMENTS.length > 6, "StatZ's 'all' is more than Premium's six");
});
