import test from "node:test";
import assert from "node:assert/strict";
import { CAPTION_MAX, MAX_SCENES, cleanScenes, fitCaption, moveScene, readSeconds, sceneFromVideo, scenesFromPage, toVideoItems, totalSeconds } from "./scenes.js";

const page = { title: "Roof", panels: [
  { n: 1, image: "/a.png", dialogue: [{ who: "Lou", line: "Not today." }, { who: "Kat", line: "Then when, exactly, if not now on this roof?" }] },
  { n: 2, image: "/b.png", dialogue: [] },
  { n: 3, image: "", dialogue: [{ who: "Lou", line: "undrawn" }] },
] };

test("a drawn panel is one beat per line, an undrawn one is left out, zoom alternates", () => {
  const s = scenesFromPage(page);
  assert.equal(s.length, 3);
  assert.deepEqual(s.map((x) => x.url), ["/a.png", "/a.png", "/b.png"]);
  assert.equal(s[0].caption, "Lou: Not today.");
  assert.deepEqual(s.map((x) => x.motion), ["in", "in", "out"]);
  assert.ok(s[1].seconds > s[0].seconds);                 // a longer line stays up longer
  assert.equal(s[2].caption, "");
});

test("a page drawn as one image becomes its own beats", () => {
  const s = scenesFromPage({ title: "P", page_image: "/page.png", panels: [{ n: 1, image: "", dialogue: [{ who: "A", line: "hi" }, { who: "B", line: "yo" }] }] });
  assert.deepEqual(s.map((x) => [x.url, x.caption]), [["/page.png", "A: hi"], ["/page.png", "B: yo"]]);
});

test("a caption never passes VideoZ's limit, and is cut at a word", () => {
  const long = "word ".repeat(40);
  const c = fitCaption(long);
  assert.ok(c.length <= CAPTION_MAX);
  assert.ok(c.endsWith("…"));
  assert.equal(fitCaption("short"), "short");
});

test("reading time stays between 2 and 8 seconds", () => {
  assert.equal(readSeconds("hi"), 2);
  assert.equal(readSeconds("word ".repeat(50)), 8);
});

test("storage junk is repaired, and the hand-off carries timing, move and subtitle", () => {
  const s = cleanScenes([{ kind: "image", url: "/a.png", seconds: 999, motion: "spin", caption: "x" }, { kind: "evil", url: "/x" }, null,
    sceneFromVideo({ url: "/v.mp4", name: "Piece", seconds: 24 })]);
  assert.equal(s.length, 2);
  assert.equal(s[0].seconds, 20);
  assert.equal(s[0].motion, "none");
  assert.equal(totalSeconds(s), 44);
  const items = toVideoItems(s);
  assert.deepEqual(items[0], { url: "/a.png", name: "", kind: "image", seconds: 20, motion: undefined, text: "x" });
  assert.deepEqual(items[1], { url: "/v.mp4", name: "Piece", kind: "video" });
  assert.equal(toVideoItems(Array.from({ length: 100 }, () => s[0])).length, MAX_SCENES);
  assert.deepEqual(moveScene([1, 2, 3], 0, 1), [2, 1, 3]);
  assert.deepEqual(moveScene([1, 2, 3], 0, -1), [1, 2, 3]);
});
