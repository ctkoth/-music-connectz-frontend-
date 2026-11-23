import test from "node:test";
import assert from "node:assert/strict";
import { zoomPct, zoomFromPct, pctLabel, trackSize, TRACK_SIZES, ZOOM_BASE } from "./view.js";

test("100% is the old default and the conversion round-trips", () => {
  assert.equal(zoomPct(ZOOM_BASE), 100);
  assert.equal(zoomFromPct(250), 100);
  assert.ok(Math.abs(zoomFromPct(zoomPct(7.3)) - 7.3) < 1e-9);
});
test("a typed percentage is clamped, and junk does not break the view", () => {
  assert.equal(zoomFromPct(1e9), 400); assert.equal(zoomFromPct(0), 0.1);
  assert.equal(zoomFromPct("abc"), null); assert.equal(zoomFromPct(""), null);
});
test("labels keep useful digits", () => { assert.equal(pctLabel(40), "100%"); assert.equal(pctLabel(0.2), "0.50%"); assert.equal(pctLabel(2), "5.0%"); });
test("track sizes ascend and an unknown key is Normal", () => {
  const hs = TRACK_SIZES.map((s) => s.h);
  assert.deepEqual(hs, [...hs].sort((a, b) => a - b));
  assert.equal(trackSize("nope").key, "normal");
  assert.equal(TRACK_SIZES.filter((s) => !s.full).length, 1);   // only Compact hides rows
});
