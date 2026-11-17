import test from "node:test";
import assert from "node:assert/strict";
import { backgroundDab, dabsAlong, magicErase, sample } from "./pixels.js";

// A 10×10 white picture with a red 4×4 square at (3,3) and one isolated white dot inside the red.
function picture() {
  const w = 10, h = 10, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const red = x >= 3 && x < 7 && y >= 3 && y < 7 && !(x === 5 && y === 5);
    data.set(red ? [255, 0, 0, 255] : [255, 255, 255, 255], i);
  }
  return { data, width: w, height: h };
}
const alpha = (img, x, y) => img.data[(y * img.width + x) * 4 + 3];

test("magic eraser clears the connected area like the click and stops at the subject", () => {
  const img = picture();
  const n = magicErase(img, 0, 0);
  assert.equal(n, 100 - 16);
  assert.equal(alpha(img, 0, 0), 0);
  assert.equal(alpha(img, 4, 4), 255);
  assert.equal(alpha(img, 5, 5), 255, "the white dot inside the red is not connected");
});

test("non-contiguous clears every match, the enclosed dot included", () => {
  const img = picture();
  assert.equal(magicErase(img, 0, 0, { contiguous: false }), 85);
  assert.equal(alpha(img, 5, 5), 0);
});

test("tolerance decides what counts as similar", () => {
  const img = picture();
  img.data.set([235, 235, 235, 255], 0); // one off-white corner pixel
  magicErase(img, 9, 9, { tolerance: 0 });
  assert.equal(alpha(img, 0, 0), 255);
  const again = picture();
  again.data.set([235, 235, 235, 255], 0);
  magicErase(again, 9, 9, { tolerance: 10 });
  assert.equal(alpha(again, 0, 0), 0);
});

test("a click on empty space or off the picture changes nothing", () => {
  const img = picture();
  magicErase(img, 0, 0);
  assert.equal(magicErase(img, 0, 0), 0);
  assert.equal(magicErase(img, -1, 50), 0);
});

test("background eraser takes the sampled colour inside the dab and leaves the subject", () => {
  const img = picture();
  const n = backgroundDab(img, 4, 4, 10, sample(img, 0, 0));
  assert.ok(n > 0);
  assert.equal(alpha(img, 1, 4), 0);
  assert.equal(alpha(img, 4, 4), 255);
  assert.equal(sample(img, 1, 4), null);
});

test("dabs along a drag leave no gaps", () => {
  const d = dabsAlong([0, 0], [100, 0], 20);
  assert.ok(d.length >= 20);
  assert.deepEqual(d.at(-1), [100, 0]);
});
