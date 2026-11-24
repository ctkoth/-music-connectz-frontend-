import { test } from "node:test";
import assert from "node:assert/strict";
import { keepSegments } from "./stripSilence.js";

const rate = 8000;
const tone = (secs, amp = 0.5) => Float32Array.from({ length: secs * rate }, (_, i) => amp * Math.sin((2 * Math.PI * 220 * i) / rate));
const quiet = (secs) => new Float32Array(secs * rate);
const cat = (...parts) => Float32Array.from(parts.flatMap((p) => [...p]));

test("two phrases with dead air between them become two pieces, and the air is gone", () => {
  const x = cat(quiet(1), tone(1), quiet(2), tone(1), quiet(1));        // 0-1 quiet, 1-2 tone, 2-4 quiet, 4-5 tone, 5-6 quiet
  const segs = keepSegments([x], rate);
  assert.equal(segs.length, 2);
  assert.ok(Math.abs(segs[0].from - 0.94) < 0.03 && Math.abs(segs[0].to - 2.06) < 0.03, JSON.stringify(segs[0]));
  assert.ok(Math.abs(segs[1].from - 3.94) < 0.03 && Math.abs(segs[1].to - 5.06) < 0.03, JSON.stringify(segs[1]));
});

test("a short breath of silence inside a phrase is not a gap, and all-silence keeps nothing", () => {
  const x = cat(tone(1), quiet(0.2), tone(1));
  assert.equal(keepSegments([x], rate).length, 1);
  assert.deepEqual(keepSegments([quiet(3)], rate), []);
});

test("a lower threshold keeps quieter sound", () => {
  const x = cat(tone(1, 0.005), quiet(1));                              // about -46 dB
  assert.equal(keepSegments([x], rate, { thresholdDb: -40 }).length, 0);
  assert.equal(keepSegments([x], rate, { thresholdDb: -55 }).length, 1);
});
