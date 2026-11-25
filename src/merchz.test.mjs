import { test } from "node:test";
import assert from "node:assert/strict";
import { PRODUCTS, placeArt, isLight } from "./merchz.js";

test("all nine products, each with a print area inside the canvas", () => {
  assert.deepEqual(PRODUCTS.map((p) => p.key), ["shirt", "hoodie", "towel", "bandana", "wavecap", "durag", "mug", "phonecase", "baseballcap"]);
  for (const p of PRODUCTS) { const a = p.area; assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 1 && a.y + a.h <= 1, p.key); }
});
test("art never leaves the print area, whatever the nudge", () => {
  for (const p of PRODUCTS) for (const [dx, dy] of [[-5, -5], [5, 5], [0, 0]]) {
    const r = placeArt(p.key, 1000, 300, 600, 1, dx, dy), a = p.area;
    assert.ok(r.x >= a.x * 600 - 1e-6 && r.y >= a.y * 600 - 1e-6, p.key);
    assert.ok(r.x + r.w <= (a.x + a.w) * 600 + 1e-6 && r.y + r.h <= (a.y + a.h) * 600 + 1e-6, p.key);
  }
});
test("scale shrinks the art, aspect kept", () => {
  const a = placeArt("shirt", 200, 100, 600, 1), b = placeArt("shirt", 200, 100, 600, 0.5);
  assert.ok(Math.abs(b.w - a.w / 2) < 1e-6); assert.ok(Math.abs(a.w / a.h - 2) < 1e-6);
});
test("light colours are light", () => { assert.ok(isLight("#ffffff")); assert.ok(!isLight("#111111")); });
