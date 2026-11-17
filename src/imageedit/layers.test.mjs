import test from "node:test";
import assert from "node:assert/strict";
import {
  addMaskStroke, effective, groupLayers, ungroup, updateGroup, snap, hasStyle, moveLayerTo, gradeOpacity, replaceLayer, fromProject, shapeFromDrag, toProject,
  ADJ0, MAX_SIDE, canAdd, cleanFont, fontsFor, addLayer, addStroke, below, crop, cropRect, duplicateLayer, filterOf, fitImage,
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

test("the tier sets the ceiling, and null (StatZ) is unlimited", () => {
  let d = newDoc(10, 10, null);
  for (let i = 0; i < 80; i++) d = addLayer(d, { kind: "paint" });
  assert.equal(d.layers.length, 80);
  assert.equal(canAdd(d, 5), false);
  assert.equal(canAdd(d, null), true);
  assert.equal(canAdd(newDoc(), 5), true);
});

test("text options are cleaned: an unknown font falls back, sizes are bounded", () => {
  assert.equal(fontsFor(6).length, 6);
  assert.ok(fontsFor(null).length > 6);
  assert.equal(cleanFont("Papyrus"), "Papyrus, Inter, system-ui, sans-serif");
  assert.equal(cleanFont(cleanFont("Papyrus")), "Papyrus, Inter, system-ui, sans-serif");
  assert.equal(cleanFont("x; } body { color: red"), "Inter, system-ui, sans-serif");
  const l = addLayer(newDoc(), { kind: "text", font: "evil()", align: "middle", outlineW: 999, italic: 1 }).layers[0];
  assert.equal(l.font, "Inter, system-ui, sans-serif");
  assert.equal(l.align, "left");
  assert.equal(l.outlineW, 100);
  assert.equal(l.italic, true);
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

test("a mask stroke needs a mask, and crop moves the mask with the canvas", () => {
  let d = addLayer(newDoc(1000, 1000), { kind: "paint", id: "p" });
  assert.equal(addMaskStroke(d, "p", { hide: true, points: [[10, 10]] }), d);
  d = updateLayer(d, "p", { mask: { strokes: [] } });
  d = addMaskStroke(d, "p", { hide: true, size: 30, points: [[110, 120]] });
  assert.deepEqual(d.layers[0].mask.strokes[0], { hide: true, size: 30, points: [[110, 120]] });
  d = crop(d, { x: 100, y: 100, w: 500, h: 500 });
  assert.deepEqual(d.layers[0].mask.strokes[0].points, [[10, 20]]);
});

test("shapes from a drag: boxes normalise, a line keeps its direction", () => {
  assert.deepEqual(shapeFromDrag([50, 60], [10, 20], "rect"), { x: 10, y: 20, w: 40, h: 40 });
  assert.deepEqual(shapeFromDrag([50, 60], [10, 20], "line"), { x: 50, y: 60, w: -40, h: -40 });
  const d = addLayer(newDoc(), { kind: "shape", shape: "nonsense" });
  assert.equal(d.layers[0].shape, "rect");
});

test("a project round-trips, and a file with an outside image address drops that layer", async () => {
  let d = addLayer(newDoc(300, 200), { kind: "text", text: "hi", flipX: true });
  d = addLayer(d, { kind: "image", src: "blob:x", w: 10, h: 10 });
  const text = await toProject(d, async () => "data:image/png;base64,AAAA");
  const back = fromProject(text);
  assert.equal(back.w, 300);
  assert.deepEqual(back.layers.map((l) => l.kind), ["image", "text", "fill"]);
  assert.equal(back.layers[1].flipX, true);
  const evil = text.replace("data:image/png;base64,AAAA", "https://example.com/x.png");
  assert.deepEqual(fromProject(evil).layers.map((l) => l.kind), ["text", "fill"]);
  assert.throws(() => fromProject("{}"));
});

test("graded opacity steps down the stack and leaves the background fill", () => {
  let d = newDoc();
  for (const id of ["a", "b", "c"]) d = addLayer(d, { kind: "paint", id });
  d = gradeOpacity(d, 100, 20);
  assert.deepEqual(d.layers.map((l) => l.opacity), [100, 60, 20, 100]);
});

test("a mask fade is cleaned, and replace keeps the slot and id", () => {
  let d = addLayer(newDoc(), { kind: "paint", id: "p", mask: { strokes: [], fade: { from: 500, style: "x" } } });
  assert.deepEqual(d.layers[0].mask.fade, { from: 100, to: 0, angle: 90, style: "linear" });
  d = replaceLayer(d, "p", { kind: "image", src: "blob:z", w: 5, h: 5, opacity: 40 });
  assert.equal(d.layers[0].id, "p");
  assert.equal(d.layers[0].kind, "image");
  assert.equal(d.layers[0].opacity, 40);
});

test("dragging a layer to a slot moves it there and clamps past the ends", () => {
  let d = newDoc(10, 10, null);
  for (const id of ["a", "b", "c"]) d = addLayer(d, { id });
  assert.deepEqual(moveLayerTo(d, "a", 0).layers.map((l) => l.id), ["a", "c", "b"]);
  assert.deepEqual(moveLayerTo(d, "c", 99).layers.map((l) => l.id), ["b", "a", "c"]);
  assert.equal(moveLayerTo(d, "c", 0), d);
});

test("grouping pulls layers together, and the group's switch and opacity apply to them", () => {
  let d = newDoc(100, 100);
  for (const id of ["a", "b", "c"]) d = addLayer(d, { kind: "paint", id, opacity: 80 });
  d = groupLayers(d, ["c", "a"], "Pair");
  const gid = d.layers.find((l) => l.id === "a").group;
  assert.deepEqual(d.layers.map((l) => l.id).slice(0, 3), ["c", "a", "b"]);
  d = updateGroup(d, gid, { opacity: 50 });
  assert.deepEqual(effective(d, d.layers[0]), { visible: true, opacity: 40 });
  d = updateGroup(d, gid, { visible: false });
  assert.equal(effective(d, d.layers[1]).visible, false);
  assert.equal(effective(d, d.layers[2]).visible, true);
  d = ungroup(d, gid);
  assert.equal(d.layers[0].group, null);
  assert.deepEqual(d.groups, {});
});

test("groups survive a project file; a layer naming a missing group is ungrouped", async () => {
  let d = groupLayers(addLayer(newDoc(10, 10), { kind: "text", id: "t" }), ["t"], "G");
  const back = fromProject(await toProject(d, async (x) => x));
  assert.equal(Object.values(back.groups)[0].name, "G");
  assert.ok(back.layers[0].group);
  const broken = JSON.parse(await toProject(d, async (x) => x)); broken.groups = {};
  assert.equal(fromProject(JSON.stringify(broken)).layers[0].group, null);
});

test("snapping lands on the canvas centre within the threshold and not beyond", () => {
  const d = newDoc(1000, 1000);
  const near = snap(d, "x", { x: 446, y: 10, w: 100, h: 100 }, 8);
  assert.equal(near.dx, 4);
  assert.deepEqual(near.guides.v, [500]);
  assert.equal(snap(d, "x", { x: 300, y: 300, w: 10, h: 10 }, 8).dx, 0);
});

test("styles are cleaned and only count when one is on", () => {
  const l = addLayer(newDoc(), { kind: "text", style: { shadow: { on: true, blur: 9999 } } }).layers[0];
  assert.equal(l.style.shadow.blur, 200);
  assert.equal(hasStyle(l), true);
  assert.equal(hasStyle(addLayer(newDoc(), { kind: "text", style: { shadow: { on: false } } }).layers[0]), false);
});
