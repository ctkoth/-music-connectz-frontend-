import test from "node:test";
import assert from "node:assert/strict";
import { bandCap, bandRoom, cleanBands, defaultBands, newBand, nextBandCap, MAX_BANDS } from "./eqbands.js";

test("the band count is the tier's, applied where a band is added", () => {
  assert.equal(bandCap({ eq_bands: 3 }), 3);
  assert.equal(bandCap({ eq_bands: null }), null);
  assert.equal(bandCap(null), undefined);
  assert.deepEqual(bandRoom(3, 3), { ok: false, left: 0 });
  assert.deepEqual(bandRoom(2, 6), { ok: true, left: 4 });
  assert.equal(bandRoom(8, null).ok, true, "unlimited");
  assert.equal(bandRoom(MAX_BANDS, null).ok, false, "to the engine's bound");
  assert.equal(bandRoom(5, undefined).ok, true, "unknown blocks nothing");
  assert.equal(nextBandCap({ tier: "free", tiers: { premium: { eq_bands: 6 } } }), 6);
});

test("an EQ over the count keeps every band (a lapse never cuts the list)", () => {
  const seven = Array.from({ length: 7 }, (_, i) => ({ type: "peaking", f: 100 * (i + 1), gain: 1 }));
  assert.equal(cleanBands(seven).length, 7);
  assert.equal(cleanBands(Array(50).fill({ type: "peaking", f: 1000 })).length, MAX_BANDS);
  assert.equal(cleanBands([{ type: "nope", f: 1 }, { type: "peaking" }]).length, 0);
});

test("a new band lands in the widest empty stretch", () => {
  const d = defaultBands();
  assert.equal(d.length, 3);
  const b = newBand(d);
  assert.equal(b.type, "peaking");
  assert.ok(b.f > 300 && b.f < 330, `100 Hz to 1 kHz is the widest gap (3.3 octaves), so ~316 Hz: got ${b.f}`);
});
