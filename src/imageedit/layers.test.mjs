import test from "node:test";
import assert from "node:assert/strict";
import {
  ADJ0, MAX_LAYERS, MAX_SIDE, addLayer, addStroke, below, crop, cropRect, duplicateLayer, filterOf, fitImage,
  moveLayer, newDoc, pick, removeLayer, resizeCanvas, updateLayer,
} from "./layers.js";

test("a new document has a background fill at the bottom", () => {
  const d = newDoc(800, 600);
  assert.equal(d.w, 800);
  assert.equal(d.layers.length, 1);
  assert.equal(d.layers[0].kind, "fill");
});

test("sizes are clamped to what a tab can hold", () => {
  assert.equal(newDoc(99999, 0).w, MAX_SIDE);
  assert.equal(newDoc(99999, 0).h, 1);
});

test("a new layer goes on top, or directly above the one named", () => {
  let d = newDoc();
  d = addLayer(d, { kind: "paint", id: "a" });
  d = addLayer(d, { kind: "text", id: "b" });
  assert.deepEqual(d.layers.map((l) => l.id).slice(0, 2), ["b", "a"]);
  d = addLayer(d, { kind: "paint", id: "c" }, "a");
  assert.deepEqual(d.layers.map((l) => l.id).slice(0, 3), ["b", "c", "a"]);
});

test("the stack stops at MAX_LAYERS rather than growing without end", () => {
  let d = newDoc(10, 10, null);
  for (let i = 0; i < MAX_LAYERS + 5; i++) d = addLayer(d, { kind: "paint" });
  assert.equal(d.layers.length, MAX_LAYERS);
});

test("move up and down swap neighbours and stop at the ends", () => {
  let d = addLayer(addLayer(newDoc(10, 10, null), { id: "a" }), { id: "b" });
  assert.deepEqual(moveLayer(d, "a", -1).layers.map((l) => l.id), ["a", "b"]);
  assert.equal(moveLayer(d, "b", -1), d);
  assert.equal(below(d, "b").id, "a");
  assert.equal(below(d, "a"), null);
});

test("update keeps the id and kind and cleans what it is given", () => {
  let d = addLayer(newDoc(), { kind: "text", id: "t" });
  d = updateLayer(d, "t", { id: "x", kind: "image", opacity: 400, blend: "nonsense", adj: { blur: 999 } });
  const l = d.layers[0];
  assert.equal(l.id, "t");
  assert.equal(l.kind, "text");
  assert.equal(l.opacity, 100);
  assert.equal(l.blend, "source-over");
  assert.equal(l.adj.blur, 40);
});

test("duplicate sits directly above the original, offset, and remove drops it", () => {
  let d = addLayer(newDoc(), { kind: "text", id: "t", x: 5 });
  d = duplicateLayer(d, "t");
  assert.equal(d.layers.length, 3);
  assert.equal(d.layers[1].id, "t");
  assert.equal(d.layers[0].x, 25);
  assert.equal(removeLayer(d, "t").layers.length, 2);
});

test("filterOf is empty at rest and names only what moved", () => {
  assert.equal(filterOf(ADJ0), "");
  assert.equal(filterOf({ ...ADJ0, contrast: 120, hue: -10 }), "contrast(120%) hue-rotate(-10deg)");
});

test("strokes are stored relative to the layer, so moving the layer moves the paint", () => {
  let d = addLayer(newDoc(), { kind: "paint", id: "p", x: 100, y: 50 });
  d = addStroke(d, "p", { color: "#f00", size: 10, points: [[110, 60], [120, 70]] });
  assert.deepEqual(d.layers[0].strokes[0].points, [[10, 10], [20, 20]]);
  assert.equal(addStroke(d, "missing", { points: [[1, 1]] }), d);
});

test("crop shifts layers and never touches a fill", () => {
  let d = addLayer(newDoc(1000, 1000), { kind: "text", id: "t", x: 300, y: 400 });
  const r = cropRect(d, [500, 600], [200, 100]);
  assert.deepEqual(r, { x: 200, y: 100, w: 300, h: 500 });
  d = crop(d, r);
  assert.equal(d.w, 300);
  assert.equal(d.layers[0].x, 100);
  assert.equal(d.layers[1].x, 0);
  assert.equal(cropRect(d, [5, 5], [6, 6]), null);
});

test("resizing the canvas from the centre keeps content centred", () => {
  const d = resizeCanvas(addLayer(newDoc(100, 100), { kind: "text", id: "t", x: 10 }), 200, 100);
  assert.equal(d.layers[0].x, 60);
});

test("a big image is fitted down, a small one is never enlarged", () => {
  const d = newDoc(1000, 500);
  assert.deepEqual(fitImage(d, 2000, 500), { scale: 0.5, x: 0, y: 125 });
  assert.equal(fitImage(d, 100, 100).scale, 1);
});

test("pick grabs the topmost visible, unlocked layer under the point", () => {
  let d = newDoc(1000, 1000);
  d = addLayer(d, { kind: "image", id: "low", x: 0, y: 0, w: 500, h: 500 });
  d = addLayer(d, { kind: "image", id: "high", x: 100, y: 100, w: 100, h: 100 });
  assert.equal(pick(d, 150, 150), "high");
  assert.equal(pick(updateLayer(d, "high", { visible: false }), 150, 150), "low");
  assert.equal(pick(updateLayer(d, "high", { locked: true }), 150, 150), "low");
  assert.equal(pick(d, 900, 900), null);
});

test("pen pressure is kept per point, clamped, and a mouse stroke carries none", () => {
  let d = addLayer(newDoc(), { kind: "paint", id: "p" });
  d = addStroke(d, "p", { points: [[1, 1, 0.333], [2, 2, 5]] });
  assert.deepEqual(d.layers[0].strokes[0].points, [[1, 1, 0.33], [2, 2, 1]]);
});
