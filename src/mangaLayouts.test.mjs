import test from "node:test";
import assert from "node:assert/strict";
import { LAYOUTS, defaultBubble, layoutFor, moveBox, resizeBox } from "./mangaLayouts.js";

const inside = ([x, y, w, h]) => x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.0001 && y + h <= 1.0001;
const overlap = (a, b) => a[0] < b[0] + b[2] - 1e-6 && b[0] < a[0] + a[2] - 1e-6 && a[1] < b[1] + b[3] - 1e-6 && b[1] < a[1] + a[3] - 1e-6;

test("every layout gives exactly n panels, on the page, never overlapping", () => {
  for (const [key] of LAYOUTS) for (let n = 1; n <= 9; n++) {
    const boxes = layoutFor(key, n);
    assert.equal(boxes.length, n, `${key} ${n}`);
    for (const b of boxes) assert.ok(inside(b), `${key} ${n} ${b}`);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(!overlap(boxes[i], boxes[j]), `${key} ${n}: ${i} and ${j} overlap`);
  }
});

test("there are more than six layouts, so StatZ's 'all' is more than Premium's six", () => {
  assert.ok(LAYOUTS.length > 6);
});

test("boxes stay on the page when moved or resized", () => {
  assert.deepEqual(moveBox([0.5, 0.5, 0.4, 0.4], 0.5, -1), [0.6, 0, 0.4, 0.4]);
  assert.deepEqual(resizeBox([0.5, 0.5, 0.4, 0.4], 1, -1), [0.5, 0.5, 0.5, 0.05]);
  assert.ok(defaultBubble(1, 2).x < 1);
});
