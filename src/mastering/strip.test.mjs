import test from "node:test";
import assert from "node:assert/strict";
import { applyStrip, cleanStrip, eqAt, stripIsFlat, stripKey, stripWords, FLAT, HP_BY_ROLE } from "./strip.js";
import { mixTracks, needsMix, suggestMix } from "./multitrack.js";

const fs = 44100;
const tone = (f, amp = 0.3, secs = 1) => { const x = new Float32Array(fs * secs); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / fs); return x; };
const rmsDb = (x, from = Math.floor(x.length / 2)) => { let a = 0; for (let i = from; i < x.length; i++) a += x[i] * x[i]; return 10 * Math.log10(a / (x.length - from)); };

test("a flat strip is flat, and junk cleans to flat", () => {
  assert.ok(stripIsFlat(undefined));
  assert.ok(stripIsFlat(FLAT));
  assert.ok(stripIsFlat({ low: "x", mid: NaN, comp: { on: true, ratio: 1 } }));
  assert.equal(stripKey(undefined), "");
  const c = cleanStrip({ low: 40, hp: 5, midHz: 99999, comp: { ratio: 99, speed: "warp" } });
  assert.equal(c.low, 12); assert.equal(c.hp, 0); assert.equal(c.midHz, 8000); assert.equal(c.comp.ratio, 10); assert.equal(c.comp.speed, "medium");
});

test("each EQ band moves its own frequencies by what it says", () => {
  assert.ok(Math.abs(eqAt({ low: 6 }, fs, 30) - 6) < 0.6, "low shelf reaches its gain below the corner");
  assert.ok(Math.abs(eqAt({ low: 6 }, fs, 5000)) < 0.2, "and leaves the highs alone");
  assert.ok(Math.abs(eqAt({ mid: -6, midHz: 2000 }, fs, 2000) + 6) < 0.05, "mid bell is exact at its centre");
  assert.ok(Math.abs(eqAt({ high: 4 }, fs, 16000) - 4) < 0.6);
  assert.ok(eqAt({ hp: 100 }, fs, 30) < -18, "high-pass cuts well below its corner");
  assert.ok(Math.abs(eqAt({ hp: 100 }, fs, 1000)) < 0.1, "and passes the mids");
});

test("the rendered EQ matches the curve", () => {
  const x = tone(2000);
  const out = applyStrip([x, x], fs, { mid: 6, midHz: 2000 });
  assert.ok(Math.abs(rmsDb(out.channels[0]) - rmsDb(x) - 6) < 0.1);
  assert.notEqual(out.channels[0], x, "the input is not changed in place");
});

test("the compressor takes off what the ratio says above the threshold, and nothing below it", () => {
  const loud = tone(1000, 0.9, 2);                     // peak power ≈ −0.9 dB, far over −30
  const quiet = tone(1000, 0.001, 2);                  // ≈ −60 dB, far under
  const set = { comp: { on: true, thresholdDb: -30, ratio: 4, speed: "fast" } };
  const a = applyStrip([loud, loud], fs, set);
  assert.ok(a.maxGrDb > 18 && a.maxGrDb < 25, `took off ${a.maxGrDb}`);   // ~29 dB over × (1 − 1/4) ≈ 22
  const b = applyStrip([quiet, quiet], fs, set);
  assert.equal(b.maxGrDb, 0);
  assert.ok(Math.abs(rmsDb(b.channels[0]) - rmsDb(quiet)) < 0.01);
  const m = applyStrip([quiet, quiet], fs, { comp: { on: true, ratio: 1, makeupDb: 6 } });
  assert.ok(Math.abs(rmsDb(m.channels[0]) - rmsDb(quiet) - 6) < 0.05, "make-up gain is applied");
});

test("the mix runs the strip before gain and pan, and says so", () => {
  const x = tone(2000);
  const plain = mixTracks([{ channels: [x, x] }, { channels: [x, x], mute: true }], fs);
  const cut = mixTracks([{ channels: [x, x], strip: { mid: -6, midHz: 2000 }, name: "Vox" }, { channels: [x, x], mute: true }], fs);
  assert.ok(Math.abs(rmsDb(cut.channels[0]) - rmsDb(plain.channels[0]) + 6) < 0.1);
  assert.match(cut.lines[0], /^Vox: −6 dB at 2 kHz; /);
  assert.ok(needsMix([{ channels: [x], strip: { low: 2 } }]), "one song with an EQ is no longer a plain master");
  assert.ok(!needsMix([{ channels: [x], strip: FLAT }]));
});

test("the suggestion cuts lows by role, keeps bass weight, and never lowers a cut already set", () => {
  const m = { lufs: -18, bright: 0, widthDb: -Infinity };
  const out = suggestMix([
    { role: "lead", m }, { role: "bass", m }, { role: "backing", m, strip: { hp: 300 } }, { role: "drums", m },
  ]);
  assert.equal(out[0].hp, HP_BY_ROLE.lead.hz);
  assert.match(out[0].why, /High-pass at 90 Hz/);
  assert.equal(out[1].hp, 0);
  assert.equal(out[2].hp, 300, "the member's higher cut stays");
  assert.equal(out[3].hp, 0);
});

test("words describe what was set", () => {
  assert.equal(stripWords(FLAT), "");
  assert.equal(stripWords({ hp: 90, high: 2 }), "high-pass at 90 Hz, highs +2 dB");
  assert.match(stripWords({ comp: { on: true, thresholdDb: -20, ratio: 3, speed: "slow" } }, { maxGrDb: 0, avgGrDb: 0 }), /never reached the threshold/);
});
