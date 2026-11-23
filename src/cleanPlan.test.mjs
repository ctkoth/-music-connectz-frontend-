import test from "node:test";
import assert from "node:assert/strict";
import { MODE_ORDER, dupesOpen, openModes, dupeCopies, order, plan, sumBytes, targetBytes, human } from "./cleanPlan.js";

const F = (path, size, used) => ({ path, size, used });
const files = [F("a", 100, 5), F("b", 900, 9), F("c", 500, 1), F("d", 50, 0), F("e", 400, 7)];

test("target percent is of everything scanned; target size is capped at what exists", () => {
  assert.equal(sumBytes(files), 1950);
  assert.equal(targetBytes(files, { percent: 10 }), 195);
  assert.equal(targetBytes(files, { percent: 150 }), 1950);
  assert.equal(targetBytes(files, { bytes: 600 }), 600);
  assert.equal(targetBytes(files, { bytes: 99999 }), 1950);
  assert.equal(targetBytes(files, { percent: -5 }), 0);
});

test("size mode: biggest first; frequency mode: least recently used first", () => {
  assert.deepEqual(order(files, "size").map((f) => f.path), ["b", "c", "e", "a", "d"]);
  assert.deepEqual(order(files, "frequency").map((f) => f.path), ["d", "c", "a", "e", "b"]);
});

test("priority mode puts the large AND untouched file ahead of the one that is only large", () => {
  // c: size rank 1 + use rank 1 = 2; b: 0 + 4 = 4; e: 2 + 3 = 5; d: 4 + 0 = 4; a: 3 + 2 = 5
  assert.equal(order(files, "priority")[0].path, "c");
});

test("a plan stops the moment the target is reached, and says when the scan cannot reach it", () => {
  const p = plan(files, "size", 1000);
  assert.deepEqual(p.selected.map((f) => f.path), ["b", "c"]);
  assert.equal(p.freed, 1400);
  assert.ok(p.reached);
  const all = plan(files, "size", 99999);
  assert.equal(all.selected.length, 5);
  assert.equal(all.reached, false);
  assert.deepEqual(plan(files, "size", 0).selected, []);
});

test("ties never shuffle", () => {
  const t = [F("z", 10, 1), F("y", 10, 1)];
  assert.deepEqual(order(t, "priority").map((f) => f.path), ["y", "z"]);
});

test("human sizes", () => {
  assert.equal(human(512), "512 B");
  assert.equal(human(1536), "1.5 KB");
  assert.equal(human(5 * 1024 ** 3), "5.0 GB");
});

test("dupeCopies keeps the oldest of each group and names it, and never empties a group", () => {
  const f = (path, modified, size = 10) => ({ path, size, used: modified, modified });
  const files = [f("a/new.wav", 300), f("a/orig.wav", 100), f("b/mid.wav", 200), f("solo.wav", 50)];
  const out = dupeCopies(files, [{ size: 10, files: ["a/new.wav", "a/orig.wav", "b/mid.wav"] }, { size: 1, files: ["solo.wav"] }, { size: 1, files: ["gone.wav", "solo.wav"] }]);
  assert.deepEqual(out.map((x) => x.path).sort(), ["a/new.wav", "b/mid.wav"]);
  assert.ok(out.every((x) => x.dupeOf === "a/orig.wav"));
  assert.ok(!out.some((x) => x.path === "a/orig.wav"));
});

test("the tier's number opens ways in order, never fewer than one, and unknown or unlimited opens all", () => {
  assert.deepEqual(openModes(1), ["size"]);
  assert.deepEqual(openModes(2), ["size", "frequency"]);
  assert.deepEqual(openModes(null), MODE_ORDER);
  assert.deepEqual(openModes(undefined), MODE_ORDER);
  assert.deepEqual(openModes(0), ["size"]);
  assert.deepEqual(openModes(99), MODE_ORDER);
  assert.equal(dupesOpen(1), false); assert.equal(dupesOpen(2), true); assert.equal(dupesOpen(null), true);
});
