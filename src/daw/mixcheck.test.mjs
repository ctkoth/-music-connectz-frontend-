import test from "node:test";
import assert from "node:assert/strict";
import { clashes, duckPoints, envelope, headroomMove, peakDb, shiftFader } from "./mixcheck.js";

test("headroom moves every fader the same amount to land the peak at -6 dB", () => {
  assert.equal(Math.round(peakDb([new Float32Array([0.5, -1])])), 0);
  assert.equal(headroomMove(0), -6);
  assert.equal(headroomMove(-12), 6);
  assert.equal(headroomMove(-6.2), 0, "close enough is left alone");
  assert.equal(headroomMove(-Infinity), 0);
  assert.equal(shiftFader(10, 6), 12, "a fader never goes past its own range");
});

test("two parts loud in one band: the less central one gets the dip", () => {
  const bands = (peak) => [100, 250, 500, 1000, 2000, 4000].map((f) => ({ f, db: f === peak ? -10 : -30 }));
  const got = clashes([
    { id: "v", name: "vocal", role: "lead", bands: bands(2000) },
    { id: "s", name: "synth", role: "instrument", bands: bands(2000) },
    { id: "b", name: "bass", role: "bass", bands: bands(100) },
  ]);
  assert.equal(got.length, 1);
  assert.equal(got[0].id, "s"); assert.equal(got[0].f, 2000); assert.ok(got[0].gain < 0);
  assert.match(got[0].why, /vocal/);
});

test("ducking dips while the lead is there and comes back after", () => {
  const rate = 1000, ch = new Float32Array(rate * 2);
  for (let i = 500; i < 1000; i++) ch[i] = Math.sin(i);     // the lead sings from 0.5 s to 1.0 s
  const pts = duckPoints(envelope([ch], rate), 0);
  const at = (t) => [...pts].reverse().find((p) => p.t <= t)?.v ?? 0;
  assert.equal(at(0.2), 0); assert.equal(at(0.7), -4); assert.equal(at(1.6), 0);
});
