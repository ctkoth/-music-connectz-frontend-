import test from "node:test";
import assert from "node:assert/strict";
import { levelFromSamples, holdPeak, levelAdvice, meterPos, latencyMs, FLOOR_DB } from "./audioIO.js";

const tone = (amp, n = 2048) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i * 0.1));

test("levels are in dBFS: a half-scale tone peaks near -6 dB, silence is the floor, full scale is clipping", () => {
  assert.ok(Math.abs(levelFromSamples(tone(0.5)).peakDb - -6.02) < 0.1);
  assert.equal(levelFromSamples(new Float32Array(100)).peakDb, FLOOR_DB);
  assert.equal(levelFromSamples(tone(1)).clipped, true);
  assert.equal(levelFromSamples(tone(0.5)).clipped, false);
  assert.ok(levelFromSamples(tone(0.5)).rmsDb < levelFromSamples(tone(0.5)).peakDb);
});

test("the advice is clip / hot / good / low / silent and says what to do, never just a colour", () => {
  assert.equal(levelAdvice(0, true).state, "clip");
  assert.equal(levelAdvice(-0.5, false).state, "clip");
  assert.equal(levelAdvice(-3, false).state, "hot");
  assert.equal(levelAdvice(-12, false).state, "good");
  assert.equal(levelAdvice(-30, false).state, "low");
  assert.equal(levelAdvice(-55, false).state, "silent");
  for (const a of [levelAdvice(0, true), levelAdvice(-3), levelAdvice(-12), levelAdvice(-30), levelAdvice(-55)]) assert.ok(a.say.length > 15);
});

test("a held peak jumps up at once and falls back slowly", () => {
  assert.equal(holdPeak(-40, -10, 0.016), -10);
  const fell = holdPeak(-10, -50, 1);
  assert.ok(fell < -10 && fell > -50);
  assert.equal(holdPeak(null, -30, 0.016), -30);
});

test("the meter runs from the floor to full scale and stays inside it", () => {
  assert.equal(meterPos(FLOOR_DB), 0); assert.equal(meterPos(0), 1); assert.equal(meterPos(10), 1); assert.equal(meterPos(-200), 0);
  assert.ok(meterPos(-30) > 0.45 && meterPos(-30) < 0.55);
});

test("latency is the browser's own figure, or null when it does not give one", () => {
  assert.equal(latencyMs({ baseLatency: 0.01, outputLatency: 0.02 }), 30);
  assert.equal(latencyMs({}), null);
  assert.equal(latencyMs(null), null);
});
