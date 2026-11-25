import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGain, peakOf } from "./normalize.js";

const tone = (amp, n = 1000) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i / 7));
test("a quiet track is raised so its peak lands on the target", () => {
  const r = normalizeGain([tone(0.25)]);              // ~ -12 dBFS
  assert.ok(Math.abs(r.peakDb + 12) < 0.5);
  assert.ok(Math.abs(r.gain - 11) < 0.6);             // target -1, inside the +12 dB fader
});
test("a hot track is turned down", () => assert.ok(normalizeGain([tone(1)]).gain < 0));
test("the louder channel decides", () => assert.equal(peakOf([tone(0.1), tone(0.5)]).toFixed(1), "0.5"));
test("silence is left alone, never boosted into noise", () => assert.equal(normalizeGain([new Float32Array(500)]), null));
test("the boost stops at the fader's top and says so", () => {
  const r = normalizeGain([tone(0.001)]);
  assert.equal(r.gain, 12); assert.equal(r.clamped, true);
});
