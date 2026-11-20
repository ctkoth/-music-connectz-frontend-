import test from "node:test";
import assert from "node:assert/strict";
import { createLimiterCore, limiterWorkletSource } from "./limiterDsp.js";

const FS = 48000;
const dbToLin = (d) => 10 ** (d / 20);
const run = (l, r, { drive = 1, ceilDb = -1, release = 100, block = 128 } = {}) => {
  const core = createLimiterCore(FS), o1 = new Float32Array(l.length), o2 = new Float32Array(l.length);
  let gr = 0;
  for (let i = 0; i < l.length; i += block) {
    const n = Math.min(block, l.length - i);
    gr = Math.max(gr, core.process(l.subarray(i, i + n), r.subarray(i, i + n), o1.subarray(i, i + n), o2.subarray(i, i + n), n, drive, dbToLin(ceilDb), release));
  }
  return { o1, o2, gr, latency: core.latency };
};
const peak = (a, from = 0) => { let m = 0; for (let i = from; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m; };

test("no sample ever passes the ceiling, even on a sudden loud hit after silence", () => {
  const l = new Float32Array(FS), r = new Float32Array(FS);
  for (let i = 20000; i < 20600; i++) { l[i] = 0.95 * Math.sin(i * 0.3); r[i] = 0.6 * Math.sin(i * 0.2); }
  l[20010] = 1.0;                                    // a full-scale click
  const { o1, o2 } = run(l, r, { drive: dbToLin(12), ceilDb: -1 });
  assert.ok(peak(o1) <= dbToLin(-1) + 1e-6, `left ${peak(o1)}`);
  assert.ok(peak(o2) <= dbToLin(-1) + 1e-6, `right ${peak(o2)}`);
});

test("the guarantee holds at every block size", () => {
  const l = new Float32Array(20000), r = new Float32Array(20000);
  for (let i = 0; i < l.length; i++) { l[i] = Math.sin(i * 0.05) * (1 + (i % 4000 < 300 ? 3 : 0)); r[i] = l[i] * 0.7; }
  for (const block of [1, 7, 128, 500]) {
    const { o1 } = run(l, r, { drive: dbToLin(6), ceilDb: -3, block });
    assert.ok(peak(o1) <= dbToLin(-3) + 1e-6, `block ${block}: ${peak(o1)}`);
  }
});

test("a signal under the ceiling comes out unchanged (just late)", () => {
  const l = new Float32Array(8000); for (let i = 0; i < l.length; i++) l[i] = 0.3 * Math.sin(i * 0.1);
  const { o1, gr, latency } = run(l, l, { drive: 1, ceilDb: -1 });
  assert.equal(gr, 0);
  for (let i = latency + 10; i < l.length; i++) assert.ok(Math.abs(o1[i] - l[i - latency]) < 1e-6);
});

test("it is linked: the quiet side is turned down with the loud one, so the image does not lean", () => {
  const l = new Float32Array(6000).fill(0), r = new Float32Array(6000).fill(0);
  for (let i = 2000; i < 4000; i++) { l[i] = 1.5; r[i] = 0.5; }
  const { o1, o2 } = run(l, r, { ceilDb: -1 });
  const mid = 3500;
  assert.ok(Math.abs(o1[mid] / o2[mid] - 3) < 1e-3, `ratio ${o1[mid] / o2[mid]}`);
});

test("it recovers after the hit instead of staying turned down", () => {
  const l = new Float32Array(FS), r = new Float32Array(FS);
  for (let i = 1000; i < 1100; i++) l[i] = r[i] = 1.5;
  for (let i = 1100; i < l.length; i++) l[i] = r[i] = 0.2;
  const { o1 } = run(l, r, { release: 50 });
  assert.ok(Math.abs(o1[FS - 100] - 0.2) < 0.005, `tail ${o1[FS - 100]}`);
});

test("the gain moves in a ramp, not a step (no click at the start of the squash)", () => {
  const l = new Float32Array(6000).fill(0.1); for (let i = 3000; i < 3500; i++) l[i] = 1.2;
  const { o1 } = run(l, l, { ceilDb: -1 });
  let worst = 0; for (let i = 400; i < 3000; i++) worst = Math.max(worst, Math.abs(o1[i] - o1[i - 1]));
  assert.ok(worst < 0.02, `largest step before the hit ${worst}`);
});

test("the worklet source carries the core and registers the limiter", () => {
  const src = limiterWorkletSource();
  assert.match(src, /registerProcessor\("mcz-limiter"/);
  assert.match(src, /function createLimiterCore/);
  new Function("AudioWorkletProcessor", "registerProcessor", "sampleRate", src + "; return McLimiter;")(class {}, () => {}, FS);
});

test("the worklet binds the core by name, so a renamed (minified) function still works", () => {
  const src = limiterWorkletSource();
  assert.match(src, /const createLimiterCore = function/);
  // Simulate a minifier: a core whose own name is different, printed the same way the source does.
  const renamed = createLimiterCore.toString().replace("function createLimiterCore", "function r");
  const src2 = `const createLimiterCore = ${renamed};\nreturn createLimiterCore(48000, 2).latency;`;
  assert.equal(new Function(src2)(), 95);
});
