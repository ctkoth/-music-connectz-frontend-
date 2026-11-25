import { test } from "node:test";
import assert from "node:assert/strict";
import { foldTempo, stretchChannels, stretchFor } from "./tempoMatch.js";

test("a half or double reading is folded to the one nearest the project", () => {
  assert.equal(foldTempo(60, 120), 120);
  assert.equal(foldTempo(240, 120), 120);
  assert.equal(foldTempo(100, 120), 100);
  assert.equal(foldTempo(0, 120), null);
});

test("the stretch is the clip's tempo over the project's, and absurd ones are refused", () => {
  assert.ok(Math.abs(stretchFor(100, 120) - 100 / 120) < 1e-9);
  assert.equal(stretchFor(30, 120), null);
  assert.equal(stretchFor(500, 120), null);
});

test("stretching changes the length by the ratio and keeps the sound a tone", () => {
  const rate = 24000, n = rate * 2;
  const x = Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 220 * i) / rate));
  const [y] = stretchChannels([x], rate, 0, 2, 1.25);
  assert.ok(Math.abs(y.length - n * 1.25) < 2);
  let cross = 0, last = y[1000];
  for (let i = 1001; i < 9000; i++) { if (last <= 0 && y[i] > 0) cross++; last = y[i]; }
  const hz = cross / (8000 / rate);
  assert.ok(Math.abs(hz - 220) < 8, `pitch moved: ${hz}`);
});
