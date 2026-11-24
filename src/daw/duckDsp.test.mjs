import { test } from "node:test";
import assert from "node:assert/strict";
import { createDuckCore, duckWorkletSource } from "./duckDsp.js";

const fs = 8000;
const sine = (amp, n, hz = 220) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / fs));
const rms = (x, a, b) => Math.sqrt(x.slice(a, b).reduce((s, v) => s + v * v, 0) / (b - a));

test("a loud sidechain turns the track down, and a silent one leaves it untouched", () => {
  const n = fs * 2, track = sine(0.5, n);
  const core = createDuckCore(fs), out1 = new Float32Array(n), out2 = new Float32Array(n);
  const sc = new Float32Array(n); sc.set(sine(0.8, fs, 100), fs);                   // quiet for 1 s, then loud for 1 s
  core.process(track, track, sc, sc, out1, out2, n, -30, 8, 5, 150, 18);
  const before = rms(out1, 1000, fs - 200), during = rms(out1, fs + 2000, n);
  assert.ok(Math.abs(before - rms(track, 1000, fs - 200)) < 1e-6, "untouched while the sidechain is silent");
  assert.ok(during < before * 0.4, `ducked: ${during} vs ${before}`);
});

test("the reduction never goes past the depth", () => {
  const n = fs, track = sine(0.5, n), sc = sine(1, n, 60);
  const core = createDuckCore(fs), o1 = new Float32Array(n), o2 = new Float32Array(n);
  const worst = core.process(track, track, sc, sc, o1, o2, n, -60, 20, 1, 100, 12);
  assert.ok(worst <= 12 + 1e-6, `reduction ${worst}`);
  assert.ok(rms(o1, 2000, n) >= rms(track, 2000, n) * 10 ** (-12 / 20) * 0.98);
});

test("the worklet source carries the core and registers the processor", () => {
  const src = duckWorkletSource();
  assert.match(src, /const createDuckCore = /); assert.match(src, /registerProcessor\("mcz-duck"/);
});
