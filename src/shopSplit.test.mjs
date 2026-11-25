import { test } from "node:test";
import assert from "node:assert/strict";
import { previewSplit, keepsRange } from "./shopSplit.js";

const meta = { base_cents: { shirt: 1300 }, dev_tax: { free: 0.1, premium: 0.05, statz: 0.03 } };

test("matches the server's rule: tax on the markup only", () => {
  assert.deepEqual(previewSplit(meta, "shirt", 1000, 0.1), { price: 2300, printer: 1300, dev_tax: 100, designer: 900 });
});
test("range runs from the dearest-tax buyer to the cheapest", () => {
  assert.deepEqual(keepsRange(meta, "shirt", 1000), { min: 900, max: 970 });
});
test("an unknown product previews nothing", () => {
  assert.equal(previewSplit(meta, "mug", 100, 0.1), null);
  assert.equal(keepsRange(meta, "mug", 100), null);
});
