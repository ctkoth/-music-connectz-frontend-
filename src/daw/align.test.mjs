import test from "node:test";
import assert from "node:assert/strict";
import { RATE, bestLag, reduce, shiftTrack, verdict } from "./align.js";
import { addRegion, addSource, newSession, playlistOf } from "./session.js";

const fs = 8000;
function noise(n, seed = 1) { const a = new Float32Array(n); let x = seed; for (let i = 0; i < n; i++) { x = (x * 16807) % 2147483647; a[i] = x / 2147483647 - 0.5; } return a; }
function delayed(src, d) { const a = new Float32Array(src.length); for (let i = d; i < src.length; i++) a[i] = src[i - d]; return a; }

test("a track 40 ms late is found and moved 40 ms earlier", () => {
  const ref = noise(fs * 3); const late = delayed(ref, Math.round(0.04 * fs));
  const m = bestLag(reduce([ref], fs), reduce([late], fs));
  assert.ok(Math.abs(m.lag - 0.04) <= 1 / RATE, `lag ${m.lag}`);
  assert.ok(m.corr > 0.9);
  const v = verdict(m); assert.ok(Math.abs(v.move + 0.04) <= 1 / RATE); assert.equal(v.flip, false);
});

test("an upside-down copy is a flip, not a move", () => {
  const ref = noise(fs * 3); const inv = ref.map((v) => -v);
  const v = verdict(bestLag(reduce([ref], fs), reduce([inv], fs)));
  assert.equal(v.flip, true); assert.equal(v.move, 0); assert.match(v.why, /polarity/);
});

test("an unrelated part is left alone, never moved on a guess", () => {
  const v = verdict(bestLag(reduce([noise(fs * 3, 1)], fs), reduce([noise(fs * 3, 99)], fs)));
  assert.equal(v.move, 0); assert.equal(v.flip, false); assert.match(v.why, /No clear match/);
});

test("shifting before 0:00 starts the region later in its audio instead", () => {
  let s = addSource(newSession(), { id: "a", name: "a", duration: 10 });
  s = addRegion(s, s.tracks[0].id, { src: "a", at: 0.01 });
  s = shiftTrack(s, s.tracks[0].id, -0.04);
  const r = playlistOf(s.tracks[0]).regions[0];
  assert.equal(r.at, 0); assert.ok(Math.abs(r.in - 0.03) < 1e-9);
});
