import test from "node:test";
import assert from "node:assert/strict";
import { FILTERS, applyFilter, bucketFill, toneDab } from "./filters.js";
import { rectSel } from "./selection.js";

function img(w, h, f) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}
const px = (im, x, y) => [...im.data.slice((y * im.width + x) * 4, (y * im.width + x) * 4 + 4)];

test("the bucket fills the connected area and stops at a different colour", () => {
  const im = img(6, 1, (x) => (x === 3 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  assert.equal(bucketFill(im, 0, 0, [255, 0, 0]), 3);
  assert.deepEqual(px(im, 0, 0), [255, 0, 0, 255]);
  assert.deepEqual(px(im, 5, 0), [255, 255, 255, 255]);
  const all = img(6, 1, (x) => (x === 3 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
  assert.equal(bucketFill(all, 0, 0, [255, 0, 0], { contiguous: false }), 5);
});

test("the bucket fills transparent space too, and respects a selection", () => {
  const im = img(4, 1, () => [0, 0, 0, 0]);
  bucketFill(im, 0, 0, [0, 0, 255], { sel: rectSel(4, 1, { x: 0, y: 0, w: 2, h: 1 }) });
  assert.deepEqual(px(im, 1, 0), [0, 0, 255, 255]);
  assert.equal(px(im, 3, 0)[3], 0);
});

test("dodge lightens, burn darkens, sponge greys", () => {
  const grey = () => img(5, 5, () => [100, 150, 200, 255]);
  const a = grey(); toneDab(a, 2, 2, 5, "dodge", 1); assert.ok(px(a, 2, 2)[0] > 100);
  const b = grey(); toneDab(b, 2, 2, 5, "burn", 1); assert.ok(px(b, 2, 2)[0] < 100);
  const c = grey(); toneDab(c, 2, 2, 5, "sponge", 1); const [r, , bl] = px(c, 2, 2); assert.ok(bl - r < 100);
});

test("every filter in the menu runs and changes something; selection limits it", () => {
  for (const key of Object.keys(FILTERS)) {
    const im = img(8, 8, (x, y) => [x * 30, y * 30, 120, 255]);
    const before = [...im.data];
    applyFilter(im, key, { amount: FILTERS[key].amount?.[2] ?? 50, radius: FILTERS[key].radius?.[2] ?? 2 }, null, () => 0.9);
    assert.notDeepEqual([...im.data], before, key);
  }
  const im = img(8, 1, (x) => [x * 30, 0, 0, 255]);
  applyFilter(im, "threshold", { amount: 128 }, rectSel(8, 1, { x: 0, y: 0, w: 4, h: 1 }));
  assert.deepEqual(px(im, 6, 0), [180, 0, 0, 255]);
  assert.equal(px(im, 1, 0)[0], 0);
});
