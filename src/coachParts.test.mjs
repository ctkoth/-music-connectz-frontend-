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

test("the breakdown table: a row per graded parameter, the leader marked, an ungraded cell a null", async () => {
  const { breakdownTable, compareLine } = await import("./coachParts.js");
  const parts = [{ label: "Verse 1", score: 7, scores: { flow: 8, wordplay: 6 } },
                 { label: "Verse 2", score: 8, mine: true, scores: { flow: 7, wordplay: 9, imagery: 7 } },
                 { label: "Hook", score: 8, scores: { flow: 8 } }, { label: "no score" }];
  const t = breakdownTable(parts, { flow: "Flow", wordplay: "Wordplay", imagery: "Imagery", story: "Story" });
  assert.deepEqual(t.sections.map((s) => s.label), ["Verse 1", "Verse 2", "Hook"]);
  const by = Object.fromEntries(t.rows.map((r) => [r.key, r]));
  assert.equal(by._overall.best, -1, "two sections level at the top: nobody leads");
  assert.deepEqual(by.flow.cells, [8, 7, 8]);
  assert.equal(by.flow.best, -1);
  assert.equal(by.wordplay.best, 1);
  assert.deepEqual(by.imagery.cells, [null, 7, null]);
  assert.equal(by.imagery.best, -1, "one graded section leads nobody");
  assert.equal(by.story, undefined, "a parameter nobody was graded on is not a row");
  assert.equal(compareLine(null), "");
  assert.equal(compareLine({ ranked: [{ label: "Verse 2", score: 8 }, { label: "Verse 1", score: 7 }], best: "Verse 2",
    by_factor: [{ label: "Wordplay", best: "Verse 2", lead: 3 }, { label: "Flow", best: "Verse 1", lead: 1 }] }),
    "Verse 2 is the strongest section (8/10). Verse 2 leads Wordplay by 3.");
  assert.match(compareLine({ ranked: [{ label: "A", score: 8 }, { label: "B", score: 8 }], best: null, by_factor: [] }), /A and B are level/);
});
