import test from "node:test";
import assert from "node:assert/strict";
import { chargeLine, drumVoice, joinParts, midiName, missingLine, missingParts } from "./instrumentalz.js";
import { PROMPTZ } from "./resources.js";

test("an open hat and a crash ring; a closed hat ticks; a snare is a burst", () => {
  assert.equal(drumVoice(42).len, 0.06);      // closed hat
  assert.equal(drumVoice(44).len, 0.06);      // pedal hat
  assert.equal(drumVoice(46).len, 0.4);       // open hat — was unreachable behind `pitch >= 42`
  assert.equal(drumVoice(49).len, 0.4);       // crash
  assert.equal(drumVoice(57).len, 0.4);       // crash 2
  assert.equal(drumVoice(38).len, 0.15);      // snare
  assert.equal(drumVoice(39).len, 0.15);      // clap
});

test("the drum filter follows the same split: highs for the metal, a band for the body", () => {
  assert.deepEqual(drumVoice(46), { len: 0.4, filter: "highpass", freq: 7000 });
  assert.deepEqual(drumVoice(42), { len: 0.06, filter: "highpass", freq: 7000 });
  assert.deepEqual(drumVoice(38), { len: 0.15, filter: "bandpass", freq: 1800 });
});

test("F# minor downloads as F-sharp, not as F minor", () => {
  assert.equal(midiName({ genre: "boom bap", key: "F# minor", bpm: 90 }), "boom-bap-Fsharpminor-90bpm.mid");
  assert.equal(midiName({ genre: "", key: "C# minor", bpm: 70 }), "instrumental-Csharpminor-70bpm.mid");
  assert.notEqual(midiName({ genre: "x", key: "F# minor", bpm: 90 }), midiName({ genre: "x", key: "F minor", bpm: 90 }));
});

test("a file name never starts or ends with a dash, and survives a genre of symbols", () => {
  assert.equal(midiName({ genre: "R&B", key: "A minor", bpm: 80 }), "R-B-Aminor-80bpm.mid");
  assert.equal(midiName({ genre: "!!!", key: "A minor", bpm: 80 }), "instrumental-Aminor-80bpm.mid");
  assert.equal(midiName({ genre: "lo-fi", key: "Db major", bpm: 75 }), "lo-fi-Dbmajor-75bpm.mid");
});

const track = (instrument) => ({ instrument, notes: [[60, 0, 1, 90]] });

test("a part that was asked for and did not come back is named", () => {
  const w = { instruments: ["drums", "bass", "piano"], tracks: [track("drums")] };
  assert.deepEqual(missingParts(w), ["bass", "piano"]);
  assert.deepEqual(missingParts({ instruments: ["drums"], tracks: [track("drums")] }), []);
});

test("the server's own `missing` list wins when it sends one, even an empty one", () => {
  const w = { instruments: ["drums", "bass"], tracks: [track("drums")], missing: ["bass"] };
  assert.deepEqual(missingParts(w), ["bass"]);
  assert.deepEqual(missingParts({ ...w, missing: [] }), []);
});

test("an older work with no instruments list says nothing rather than guess", () => {
  assert.deepEqual(missingParts({ tracks: [track("drums")] }), []);
  assert.deepEqual(missingParts(null), []);
});

test("parts read as a sentence: the first as labelled, the rest lower-cased", () => {
  const label = { piano: "Piano", bass: "Bass", drums: "Drums", synth_bass: "Synth bass" };
  const of = (i) => label[i];
  assert.equal(joinParts(["piano"], of), "Piano");
  assert.equal(joinParts(["piano", "bass"], of), "Piano and bass");
  assert.equal(joinParts(["piano", "bass", "drums"], of), "Piano, bass and drums");
  assert.equal(joinParts(["bass", "synth_bass"], of), "Bass and synth bass");
  assert.equal(joinParts(["mystery"], of), "mystery");           // an id with no label is shown as itself
  assert.equal(joinParts([], of), "");
});

test("the missing line is a sentence, or nothing", () => {
  const of = (i) => ({ piano: "Piano", bass: "Bass" })[i] || i;
  assert.equal(missingLine({ instruments: ["piano", "bass", "drums"], tracks: [track("drums")] }, of), "Piano and bass didn't come back.");
  assert.equal(missingLine({ instruments: ["drums"], tracks: [track("drums")] }, of), "");
});

test("whether the run was charged is the server's fact, or only what is certain", () => {
  assert.equal(chargeLine({ charged_cents: 3 }), `Charged as a normal run: −3 ${PROMPTZ}.`);
  assert.equal(chargeLine({ charged_cents: 0 }), "Not charged — a free prompt covered it.");
  assert.equal(chargeLine({}), "It counted as a normal run.");
  assert.equal(chargeLine(null), "It counted as a normal run.");
});
