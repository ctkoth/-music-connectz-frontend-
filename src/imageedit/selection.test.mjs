import test from "node:test";
import assert from "node:assert/strict";
import {
  allSel, applyLUT, blurDab, bounds, clearSelected, cloneDab, combine, curveLUT, ellipseSel, emptySel, feather,
  fillSelected, invert, isEmpty, keepSelected, levelsLUT, polygonSel, rectSel, smudgeDab, wandSel,
} from "./selection.js";

const count = (s) => s.data.reduce((n, v) => n + (v ? 1 : 0), 0);
function img(w, h, f) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4);
  return { data, width: w, height: h };
}

test("rectangle and ellipse select what they should, clipped to the canvas", () => {
  assert.equal(count(rectSel(10, 10, { x: 2, y: 2, w: 3, h: 4 })), 12);
  assert.equal(count(rectSel(10, 10, { x: -5, y: -5, w: 7, h: 7 })), 4);
  const e = ellipseSel(20, 20, { x: 0, y: 0, w: 20, h: 20 });
  assert.ok(Math.abs(count(e) - Math.PI * 100) < 20);
  assert.equal(e.data[0], 0);
});

test("lasso fills the inside of the outline", () => {
  const s = polygonSel(10, 10, [[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.equal(count(s), 100);
  const tri = polygonSel(10, 10, [[0, 0], [10, 0], [0, 10]]);
  assert.ok(count(tri) > 40 && count(tri) < 60);
  assert.ok(isEmpty(polygonSel(10, 10, [[0, 0], [5, 5]])));
});

test("add, subtract, intersect and invert behave like Photoshop's", () => {
  const a = rectSel(10, 1, { x: 0, y: 0, w: 6, h: 1 }), b = rectSel(10, 1, { x: 4, y: 0, w: 6, h: 1 });
  assert.equal(count(combine(a, b, "add")), 10);
  assert.equal(count(combine(a, b, "subtract")), 4);
  assert.equal(count(combine(a, b, "intersect")), 2);
  assert.equal(count(combine(a, b, "new")), 6);
  assert.equal(count(invert(a)), 4);
  assert.deepEqual(bounds(b), { x: 4, y: 0, w: 6, h: 1 });
  assert.equal(bounds(emptySel(3, 3)), null);
});

test("the wand picks the connected colour region", () => {
  const im = img(6, 6, (x) => (x < 3 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  assert.equal(count(wandSel(im, 0, 0)), 18);
  assert.equal(count(wandSel(im, 5, 5, { tolerance: 100 })), 36);
});

test("feather softens the edge and keeps the middle solid", () => {
  const f = feather(rectSel(20, 20, { x: 5, y: 5, w: 10, h: 10 }), 2);
  assert.equal(f.data[10 * 20 + 10], 255);
  const edge = f.data[10 * 20 + 5];
  assert.ok(edge > 0 && edge < 255);
});

test("copy keeps the selection, delete clears it, fill paints only inside", () => {
  const red = () => img(4, 1, () => [255, 0, 0, 255]);
  const s = rectSel(4, 1, { x: 0, y: 0, w: 2, h: 1 });
  assert.deepEqual([...keepSelected(red(), s).data].filter((_, i) => i % 4 === 3), [255, 255, 0, 0]);
  assert.deepEqual([...clearSelected(red(), s).data].filter((_, i) => i % 4 === 3), [0, 0, 255, 255]);
  const filled = fillSelected(img(4, 1, () => [0, 0, 0, 0]), s, [0, 255, 0]);
  assert.deepEqual([...filled.data.slice(0, 4)], [0, 255, 0, 255]);
  assert.equal(filled.data[11], 0);
});

test("levels stretch and gamma lifts mids; curves pass through their points", () => {
  const l = levelsLUT({ inBlack: 50, inWhite: 200 });
  assert.equal(l[50], 0); assert.equal(l[200], 255); assert.equal(l[0], 0);
  assert.ok(levelsLUT({ gamma: 2 })[128] > 128);
  const c = curveLUT([[0, 0], [128, 180], [255, 255]]);
  assert.equal(c[128], 180);
  for (let v = 1; v < 256; v++) assert.ok(c[v] >= c[v - 1], "monotone");
  assert.deepEqual([...curveLUT([[0, 0], [255, 255]])].slice(0, 3), [0, 1, 2]);
});

test("a table applies only inside the selection", () => {
  const im = img(2, 1, () => [100, 100, 100, 255]);
  applyLUT(im, levelsLUT({ outBlack: 200 }), rectSel(2, 1, { x: 0, y: 0, w: 1, h: 1 }));
  assert.ok(im.data[0] > 200);
  assert.equal(im.data[4], 100);
});

test("clone copies from the offset, blur evens out a spike, smudge drags colour", () => {
  const src = img(10, 1, (x) => (x < 5 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  const dst = img(10, 1, (x) => (x < 5 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  cloneDab(dst, src, 7, 0, -5, 0, 1);
  assert.deepEqual([...dst.data.slice(28, 32)], [255, 0, 0, 255]);

  const spike = img(5, 5, (x, y) => (x === 2 && y === 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]));
  blurDab(spike, 2, 2, 3, 1);
  assert.ok(spike.data[(2 * 5 + 2) * 4] < 255);

  const sm = img(10, 1, (x) => (x < 5 ? [255, 0, 0, 255] : [0, 0, 255, 255]));
  const carry = new Map();
  smudgeDab(sm, carry, 3, 0, 2, 1);
  smudgeDab(sm, carry, 6, 0, 2, 1);
  assert.ok(sm.data[6 * 4] > 0, "red was carried into the blue");
  assert.equal(allSel(2, 2).data[3], 255);
});
