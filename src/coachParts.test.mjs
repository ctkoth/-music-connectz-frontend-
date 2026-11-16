import test from "node:test";
import assert from "node:assert/strict";
import { addCustomPart, partsField, partsLine, splitParts, togglePart } from "./coachParts.js";

test("picking parts: toggled in order, capped, and off leaves nothing on the wire", () => {
  let p = togglePart([], "Verse 1");
  p = togglePart(p, "Hook / chorus");
  assert.deepEqual(p, ["Verse 1", "Hook / chorus"]);
  assert.equal(partsField(p), "Verse 1|Hook / chorus");
  assert.equal(partsLine(p), "my parts: Verse 1, Hook / chorus");
  assert.deepEqual(togglePart(p, "Verse 1"), ["Hook / chorus"]);
  assert.deepEqual(togglePart(["a", "b"], "c", 2), ["a", "b"]);
  assert.equal(partsField([]), "");
  assert.equal(partsLine(null), "");
});

test("a typed part cannot break the separator, repeat, or pass the cap", () => {
  assert.deepEqual(addCustomPart([], "  my | 16\nbars "), ["my 16 bars"]);
  assert.deepEqual(addCustomPart(["Verse 2"], "verse 2"), ["Verse 2"]);
  assert.deepEqual(addCustomPart(["a"], "b", { max: 1 }), ["a"]);
  assert.deepEqual(addCustomPart([], "   "), []);
  assert.equal(addCustomPart([], "x".repeat(200), { maxChars: 60 })[0].length, 60);
});

test("the graded sections split into mine and the rest, and a row with no number is dropped", () => {
  const got = splitParts([{ label: "Verse 1", score: 7 }, { label: "Verse 2", score: 8, mine: true },
                          { label: "Hook" }, null, { label: "Bridge", score: 6, mine: true }]);
  assert.deepEqual(got.mine.map((p) => p.label), ["Verse 2", "Bridge"]);
  assert.deepEqual(got.others.map((p) => p.label), ["Verse 1"]);
  assert.deepEqual(splitParts(undefined), { mine: [], others: [] });
});
