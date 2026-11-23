import test from "node:test";
import assert from "node:assert/strict";
import { renderSynth } from "./engine.js";
import { cleanPatch, PRESETS, PRESET_IDS, presetPatch } from "./patch.js";

const RATE = 44100;
const rms = (a, from, to) => { let s = 0; for (let i = from; i < to; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, to - from)); };
// Goertzel: energy at one frequency
function at(a, f, from = 0, to = a.length) {
  const w = (2 * Math.PI * f) / RATE; const c = 2 * Math.cos(w); let s1 = 0, s2 = 0;
  for (let i = from; i < to; i++) { const s = a[i] + c * s1 - s2; s2 = s1; s1 = s; }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - c * s1 * s2)) / (to - from);
}
const dry = (o) => cleanPatch({ amp: { a: 0.001, d: 0.2, s: 1, r: 0.05 }, filter: { cutoff: 20000, keytrack: 0 }, ...o });
const one = (pitch, len, p) => renderSynth([[pitch, 0, len, 100]], p, { bpm: 60, rate: RATE });

test("pitch is right: A4 reads 440 Hz", async () => {
  const { left } = await one(69, 1, dry({ oscs: [{ shape: "sine" }] }));
  const a = 22050, b = 40000; let z = 0;
  for (let i = a + 1; i < b; i++) if (left[i - 1] < 0 && left[i] >= 0) z++;
  assert.ok(Math.abs(z / ((b - a) / RATE) - 440) < 5, `got ${z / ((b - a) / RATE)}`);
});
test("no aliasing: a very high saw has nothing at the folded-back partial", async () => {
  const { left } = await one(108, 1, dry({ oscs: [{ shape: "saw" }] }));            // C8, 4186 Hz; 6th harmonic would fold to ~18984
  const fund = at(left, 4186, 10000, 40000); const alias = at(left, 44100 - 6 * 4186, 10000, 40000);
  assert.ok(alias < fund * 0.003, `alias ${alias} vs fundamental ${fund}`);
});
test("the filter works: a low cutoff takes the highs off", async () => {
  const bright = await one(57, 1, dry({ oscs: [{ shape: "saw" }] }));
  const dark = await one(57, 1, dry({ oscs: [{ shape: "saw" }], filter: { cutoff: 400, keytrack: 0 } }));
  assert.ok(at(dark.left, 4840, 10000, 40000) < at(bright.left, 4840, 10000, 40000) * 0.1);
});
test("the envelope: a slow attack starts quiet, release dies away", async () => {
  const p = dry({ oscs: [{ shape: "saw" }], amp: { a: 0.5, d: 0.2, s: 1, r: 0.2 } });
  const { left } = await one(60, 1, p);
  assert.ok(rms(left, 0, 441) < rms(left, 30000, 40000) * 0.1);
  assert.ok(rms(left, Math.round(1.3 * RATE), Math.round(1.4 * RATE)) < 1e-3);
});
test("a wavetable morph changes the sound: saw has a 3rd harmonic the sine does not", async () => {
  const sine = await one(48, 1, dry({ oscs: [{ shape: "wavetable", wave: 0 }] }));
  const saw = await one(48, 1, dry({ oscs: [{ shape: "wavetable", wave: 2 / 6 }] }));
  const f3 = 3 * 130.8128;
  assert.ok(at(saw.left, f3, 8000, 40000) > at(sine.left, f3, 8000, 40000) * 20);
});
test("unison spreads across the stereo field; spread 0 is mono", async () => {
  const wide = await one(60, 0.5, dry({ oscs: [{ shape: "saw", unison: 5, detune: 20, spread: 1 }] }));
  const mono = await one(60, 0.5, dry({ oscs: [{ shape: "saw", unison: 5, detune: 20, spread: 0 }] }));
  let dw = 0, dm = 0; for (let i = 5000; i < 20000; i++) { dw += Math.abs(wide.left[i] - wide.right[i]); dm += Math.abs(mono.left[i] - mono.right[i]); }
  assert.ok(dw > 1 && dm < 1e-3);
});
test("the same notes and patch always give the same audio", async () => {
  const n = [[60, 0, 1, 90], [64, 0.5, 1, 90], [67, 1, 1, 90]];
  const a = await renderSynth(n, presetPatch("ether"), { bpm: 120, rate: RATE }); const b = await renderSynth(n, presetPatch("ether"), { bpm: 120, rate: RATE });
  assert.deepEqual(a.left.slice(20000, 20100), b.left.slice(20000, 20100));
});
test("every preset renders a chord: finite, audible, and under full scale", async () => {
  for (const id of PRESET_IDS) {
    const { left, right } = await renderSynth([[48, 0, 1.5, 110], [55, 0, 1.5, 110], [60, 0, 1.5, 110], [64, 0, 1.5, 110]], presetPatch(id), { bpm: 120, rate: RATE });
    let peak = 0; for (let i = 0; i < left.length; i++) { assert.ok(Number.isFinite(left[i]) && Number.isFinite(right[i]), `${id} not finite`); peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i])); }
    assert.ok(peak > 0.02 && peak <= 1, `${id} peak ${peak}`);
  }
});
test("more notes than voices is handled, not an error", async () => {
  const notes = Array.from({ length: 40 }, (_, i) => [40 + (i % 20), 0, 2, 100]);
  const { left } = await renderSynth(notes, cleanPatch({ voices: 8 }), { bpm: 120, rate: RATE });
  assert.ok(left.every(Number.isFinite));
});
test("cleanPatch clamps junk and drops bad modulation", () => {
  const p = cleanPatch({ filter: { cutoff: 1e9, reso: -4, type: "evil" }, oscs: [{ unison: 99, shape: "nope" }], mods: [{ src: "lfo1", dst: "cutoff", amount: 9 }, { src: "x", dst: "pitch", amount: 1 }], voices: 500 });
  assert.equal(p.filter.cutoff, 20000); assert.equal(p.filter.reso, 0); assert.equal(p.filter.type, "lp");
  assert.equal(p.oscs[0].unison, 7); assert.equal(p.oscs[0].shape, "saw");
  assert.equal(p.mods.length, 1); assert.equal(p.mods[0].amount, 1); assert.equal(p.voices, 32);
  assert.ok(PRESETS.ether && cleanPatch(null).name === "Init");
});

import { SynthCore } from "./engine.js";
const stream = (core, blocks, size, on) => {
  const out = []; const L = new Float32Array(size); const R = new Float32Array(size);
  for (let b = 0; b < blocks; b++) { on?.(b); core.process(L, R, size); out.push(...L); }
  return Float32Array.from(out);
};
test("live: the audio does not depend on how it is cut into blocks", () => {
  const mk = () => new SynthCore(presetPatch("supersaw"), RATE);
  const a = mk(); a.noteOn(60, 100);
  const b = mk(); b.noteOn(60, 100);
  const x = stream(a, 32, 128); const y = stream(b, 8, 512);
  for (let i = 0; i < x.length; i += 97) assert.ok(Math.abs(x[i] - y[i]) < 1e-5, `differs at ${i}`);
});
test("live: a held note sounds, noteOff lets it die, and the voice is freed", () => {
  const c = new SynthCore(dry({ oscs: [{ shape: "saw" }], amp: { a: 0.001, d: 0.1, s: 1, r: 0.1 } }), RATE);
  c.noteOn(60, 100);
  const held = stream(c, 40, 128);
  assert.ok(rms(held, 3000, 5000) > 0.01 && c.active === 1);
  c.noteOff(60);
  const after = stream(c, 80, 128);
  assert.ok(rms(after, after.length - 1000, after.length) < 1e-4 && c.active === 0);
});
test("live: changing the patch changes a sounding note without cutting it", () => {
  const c = new SynthCore(dry({ oscs: [{ shape: "saw" }] }), RATE);
  c.noteOn(57, 100);
  const bright = stream(c, 40, 128);
  c.setPatch(dry({ oscs: [{ shape: "saw" }], filter: { cutoff: 300, keytrack: 0 } }));
  const dark = stream(c, 40, 128);
  assert.ok(c.active === 1 && rms(dark, 2000, 5000) > 0.001);
  assert.ok(at(dark, 4840, 1000, 5000) < at(bright, 4840, 1000, 5000) * 0.2);
});
test("live: more notes than voices releases the oldest held, and the pile stays bounded", () => {
  const c = new SynthCore(dry({ voices: 4 }), RATE);
  for (let i = 0; i < 20; i++) c.noteOn(40 + i, 100);
  assert.ok(c.active <= 8);
  const out = stream(c, 10, 128);
  assert.ok(out.every(Number.isFinite));
});
test("live: allNotesOff releases everything", () => {
  const c = new SynthCore(dry({ amp: { a: 0.001, d: 0.1, s: 1, r: 0.05 } }), RATE);
  [60, 64, 67].forEach((p) => c.noteOn(p, 100)); stream(c, 10, 128);
  c.allNotesOff(); stream(c, 60, 128);
  assert.equal(c.active, 0);
});
