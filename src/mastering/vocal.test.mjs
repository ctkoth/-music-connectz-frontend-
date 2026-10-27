// Raising a vocal that sits too low: a lift on the centre of a finished mix, and
// a separate vocal file mixed onto the beat at a level the member sets.
import test from "node:test";
import assert from "node:assert/strict";
import { applyVocalLift, mixVocal, cleanSettings, master, plan, VOCAL_LIFT_MAX, VOCAL_LEVEL_MAX, VOCAL_AUTO_MAX } from "./master.js";
import { analyse } from "./meter.js";
import { biquadInPlace, peaking, lowShelf } from "./dsp.js";

const FS = 48000;
const sine = (f, n = FS, a = 0.25) => Float32Array.from({ length: n }, (_, i) => a * Math.sin((2 * Math.PI * f * i) / FS));
const rmsDb = (x, from = FS / 4) => {
  let s = 0;
  for (let i = from; i < x.length; i++) s += x[i] * x[i];
  return 10 * Math.log10(s / (x.length - from));
};

test("the lift raises the centre in the voice range by what was asked", () => {
  const v = sine(2000);
  const ch = [Float32Array.from(v), Float32Array.from(v)];
  const before = rmsDb(ch[0]);
  applyVocalLift(ch, FS, 6);
  assert.ok(Math.abs(rmsDb(ch[0]) - before - 6) < 0.3, `moved ${rmsDb(ch[0]) - before} dB`);
});

test("the sides are left alone — a wide part does not move", () => {
  const v = sine(2000);
  const ch = [Float32Array.from(v), Float32Array.from(v.map((x) => -x))];   // pure side
  const before = rmsDb(ch[0]);
  applyVocalLift(ch, FS, 6);
  assert.ok(Math.abs(rmsDb(ch[0]) - before) < 0.05);
});

test("the low end barely moves — a centred kick is not the voice range", () => {
  const v = sine(60);
  const ch = [Float32Array.from(v), Float32Array.from(v)];
  const before = rmsDb(ch[0]);
  applyVocalLift(ch, FS, 6);
  assert.ok(rmsDb(ch[0]) - before < 0.8);
});

test("a vocal file lands on the beat at the level set, and a longer vocal is not cut off", () => {
  const beat = [new Float32Array(FS / 2), new Float32Array(FS / 2)];
  const vocal = [sine(1000, FS)];
  const { channels } = mixVocal(beat, FS, vocal, FS, -6);
  assert.equal(channels[0].length, FS);
  const peak = Math.max(...channels[1].slice(FS / 4));
  assert.ok(Math.abs(peak - 0.25 * Math.pow(10, -6 / 20)) < 0.005);
});

test("a vocal at another sample rate is converted to the beat's", () => {
  const beat = [new Float32Array(FS), new Float32Array(FS)];
  const { channels, resampled } = mixVocal(beat, FS, [sine(1000, 44100)], 44100, 0);
  assert.ok(resampled);
  assert.equal(channels[0].length, FS);
});

test("the settings are clamped, never trusted", () => {
  const s = cleanSettings({ vocal: 99, vocalLevel: -99 });
  assert.equal(s.vocal, VOCAL_LIFT_MAX);
  assert.equal(s.vocalLevel, -VOCAL_LEVEL_MAX);
  assert.equal(cleanSettings({ vocal: "junk" }).vocal, 0);
});

test("a master with a vocal file says it mixed it first, and a lift says what it did", () => {
  const beat = [sine(80, FS * 2, 0.2), sine(80, FS * 2, 0.2)];
  const out = master(beat, FS, { vocal: 3, vocalLevel: 2 }, null, null, { channels: [sine(1500, FS * 2, 0.1)], sampleRate: FS });
  assert.match(out.plan.vocalMix.why, /\+2\.0 dB/);
  assert.match(out.plan.vocal.why, /Vocal lift: \+3 dB/);
  const plain = master(beat, FS, { vocal: 0 }, null, null);
  assert.equal(plain.plan.vocal, null);
  assert.equal(plain.plan.vocalMix, null);
});

// A mix-shaped noise: pink-ish (a gentle low shelf over white), identical in
// both channels so it all sits in the centre, seeded so every run is the same.
function noiseMix(seconds = 3, scoopDb = 0) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  const x = Float32Array.from({ length: FS * seconds }, () => 0.1 * rnd());
  biquadInPlace(x, lowShelf(FS, 300, 6));
  if (scoopDb) biquadInPlace(x, peaking(FS, 2000, -scoopDb, 0.7));
  return [x, Float32Array.from(x)];
}

test("Auto is the default, and 'auto' survives cleaning", () => {
  assert.equal(cleanSettings({}).vocal, "auto");
  assert.equal(cleanSettings({ vocal: "auto" }).vocal, "auto");
});

test("Auto lifts a centre that is scooped where the voice lives, and caps it", () => {
  const mix = noiseMix(3, 10);
  const p = plan(analyse(mix, FS), { eq: false });
  assert.ok(p.vocal.auto);
  assert.ok(p.vocal.db > 0 && p.vocal.db <= VOCAL_AUTO_MAX, `lifted ${p.vocal.db}`);
  assert.match(p.vocal.why, /Auto vocal lift: the centre of your mix measured −/);
});

test("Auto leaves a mix that is not thin in the voice range alone, and says why", () => {
  const p = plan(analyse(noiseMix(3, 0), FS), { eq: false });
  assert.equal(p.vocal.db, 0);
  assert.match(p.vocal.why, /not low enough to lift/);
});

test("Auto measures what is still missing after the EQ, so the two never double up", () => {
  const mix = noiseMix(3, 10);
  const withEq = plan(analyse(mix, FS), { eq: true, intensity: "high" });
  const without = plan(analyse(mix, FS), { eq: false });
  assert.ok(withEq.vocal.db < without.vocal.db, `${withEq.vocal.db} should be under ${without.vocal.db}`);
});
