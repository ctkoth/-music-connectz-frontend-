import test from "node:test";
import assert from "node:assert/strict";
import { cleanStep, describeStep, loadActions, replay, saveActions } from "./actions.js";
import { healDab } from "./selection.js";

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test("steps are cleaned: unknown kinds dropped, only numbers and short strings kept", () => {
  assert.equal(cleanStep({ kind: "rm -rf" }), null);
  assert.deepEqual(cleanStep({ kind: "filter", key: "blur", amount: 4, evil: [1], fn: () => 1 }), { kind: "filter", key: "blur", amount: 4 });
  assert.deepEqual(cleanStep({ kind: "levels", levels: { gamma: 2, x: "no" } }), { kind: "levels", levels: { gamma: 2 } });
  assert.equal(describeStep({ kind: "size", k: 0.5 }), "Image size 50%");
});

test("actions save and load per device, and junk storage reads as none", () => {
  const s = mem();
  saveActions([{ name: "Moody", steps: [{ kind: "filter", key: "vignette", amount: 50 }, { kind: "bogus" }] }], s);
  const back = loadActions(s);
  assert.equal(back[0].steps.length, 1);
  s.setItem("mcz_imagez_actions", "{not json");
  assert.deepEqual(loadActions(s), []);
});

test("replay runs every step in order and stops at a failing one", async () => {
  const seen = [];
  const ok = await replay({ steps: [{ kind: "rotate", dir: 1 }, { kind: "size", k: 2 }] }, (s) => seen.push(s.kind));
  assert.deepEqual([ok.done, seen], [2, ["rotate", "size"]]);
  const bad = await replay({ steps: [{ kind: "rotate", dir: 1 }, { kind: "size", k: 2 }] }, (s) => { if (s.kind === "size") throw new Error("too big"); });
  assert.deepEqual(bad, { done: 1, failed: "Image size 200%", error: "too big" });
});

test("the healing brush takes texture from the source and colour from where it lands", () => {
  const w = 20, h = 10, make = (f) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set(f(x, y), (y * w + x) * 4); return { data: d, width: w, height: h }; };
  // Left half grey with a dark spot at (15,5); right half... source area at (5,5) is plain grey 100.
  const img = make((x, y) => (x === 15 && y === 5 ? [0, 0, 0, 255] : x >= 10 ? [200, 200, 200, 255] : [100, 100, 100, 255]));
  const src = make((x, y) => [...img.data.slice((y * w + x) * 4, (y * w + x) * 4 + 4)]);
  healDab(img, src, 15, 5, -10, 0, 6);
  const v = img.data[(5 * w + 15) * 4];
  assert.ok(v > 150, `the spot took the surrounding 200, not the source's 100 (got ${v})`);
});
