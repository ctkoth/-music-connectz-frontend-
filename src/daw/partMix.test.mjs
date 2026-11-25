import test from "node:test";
import assert from "node:assert/strict";
import { cleanGainPct, cleanPanPct, gainPctToDb, gainPctToLinear, panToUnit, panLabel, gainLabel } from "./partMix.js";

test("100% is unity, 50% is about -6 dB, 200% about +6 dB, 0% is the floor", () => {
  assert.equal(gainPctToDb(100), 0); assert.equal(gainPctToDb(50), -6); assert.equal(gainPctToDb(200), 6); assert.equal(gainPctToDb(0), -60);
  assert.equal(gainPctToLinear(150), 1.5);
});
test("junk falls back to unity and centre, and the ranges hold", () => {
  assert.equal(cleanGainPct("x"), 100); assert.equal(cleanGainPct(999), 200); assert.equal(cleanGainPct(-4), 0); assert.equal(cleanGainPct(""), 100);
  assert.equal(cleanPanPct(null), 0); assert.equal(cleanPanPct(400), 100); assert.equal(cleanPanPct(-400), -100);
});
test("pan maps to the panner's -1..1 and labels say which side", () => {
  assert.equal(panToUnit(-50), -0.5); assert.equal(panLabel(0), "Center"); assert.equal(panLabel(-30), "L 30%"); assert.equal(panLabel(100), "R 100%");
  assert.equal(gainLabel(100), "100% (0 dB)"); assert.equal(gainLabel(200), "200% (+6 dB)"); assert.equal(gainLabel(0), "Silent");
});
