import test from "node:test";
import assert from "node:assert/strict";
import { parsePrice, totalLine, withMode, worthOf, modeOf } from "./inventoriez.js";

test("a piece's worth is an exact price or a $ level, worded and never converted", () => {
  assert.equal(worthOf({ price_cents: 124950 }), "$1,249.50");
  assert.equal(worthOf({ price_cents: 90000 }), "$900");
  assert.equal(worthOf({ price_level: 3 }), "$$$ (3/10)");
  assert.equal(worthOf({}), "");
});

test("switching how it is valued drops the other half", () => {
  const it = { name: "Amp", price_cents: 500 };
  assert.equal(modeOf(withMode(it, "level")), "level");
  assert.equal(withMode(it, "level").price_cents, undefined);
  assert.equal(modeOf(withMode({ name: "Amp", price_level: 4 }, "none")), "none");
});

test("typed prices: dollars and commas are fine, nonsense is not a price", () => {
  assert.equal(parsePrice("$1,200.5"), 120050);
  assert.equal(parsePrice("lots"), null);
  assert.equal(parsePrice("0"), null);
  assert.equal(parsePrice("2000000"), null);
});

test("the total adds dollars and counts levels beside them", () => {
  assert.equal(totalLine({ priced: 2, total_cents: 35000, levels: 1, level_avg: 6, unvalued: 0 }),
    "$350 across 2 priced pieces · 1 on your $ scale (average 6/10)");
  assert.equal(totalLine({ priced: 0, levels: 0, unvalued: 3 }), "");
});
