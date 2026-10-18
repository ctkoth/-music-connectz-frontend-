import test from "node:test";
import assert from "node:assert/strict";
import { briefCut, cutNote, nextTierBrief, pickKind, visibleKinds } from "./sentencez.js";

const KINDS = [
  { key: "resume", allowed: true },
  { key: "lyrics", allowed: true },
  { key: "contract", allowed: false, needs: ["Manager"] },
];

test("the standalone drops a kind it has no way to unlock; the main app lists it", () => {
  assert.deepEqual(visibleKinds(KINDS, true).map((k) => k.key), ["resume", "lyrics"]);
  assert.deepEqual(visibleKinds(KINDS, false).map((k) => k.key), ["resume", "lyrics", "contract"]);
});

test("a kind with no `allowed` field is treated as open, not hidden", () => {
  assert.equal(visibleKinds([{ key: "poem" }], true).length, 1);
});

test("a bad kinds payload is an empty list, never a throw", () => {
  assert.deepEqual(visibleKinds(undefined, true), []);
  assert.deepEqual(visibleKinds("nope", false), []);
});

test("it lands on the kind asked for, else the first on offer", () => {
  const open = visibleKinds(KINDS, true);
  assert.equal(pickKind(open, "lyrics"), "lyrics");
  assert.equal(pickKind(open, "contract"), "resume");
  assert.equal(pickKind([], "resume"), "resume");
});

test("the next tier's brief is the server's number, and absent when there is none to give", () => {
  const ladder = [{ tier: "free", chars: 3000 }, { tier: "premium", chars: 6000 }, { tier: "statz", chars: null }];
  assert.deepEqual(nextTierBrief({ tier: "free", brief_ladder: ladder }), { tier: "premium", label: "Premium", chars: 6000 });
  assert.deepEqual(nextTierBrief({ tier: "premium", brief_ladder: ladder }), { tier: "statz", label: "StatZ", chars: null });
  assert.equal(nextTierBrief({ tier: "statz", brief_ladder: ladder }), null);
  assert.equal(nextTierBrief({ tier: "free" }), null);        // an older API: say nothing rather than guess
  assert.equal(nextTierBrief(null), null);
});

test("a brief over the limit is cut at the limit, and says how many characters went", () => {
  const long = "a".repeat(3050);
  const { kept, cut } = briefCut(long, 3000);
  assert.equal(kept.length, 3000);
  assert.equal(cut, 50);
  assert.deepEqual(briefCut("short", 3000), { kept: "short", cut: 0 });
  assert.deepEqual(briefCut("x".repeat(3000), 3000), { kept: "x".repeat(3000), cut: 0 });   // exactly the limit loses nothing
});

test("the first characters pasted are the ones kept", () => {
  assert.equal(briefCut("abcdefghij", 4).kept, "abcd");
});

test("no limit served means nothing is cut", () => {
  assert.deepEqual(briefCut("whatever", null), { kept: "whatever", cut: 0 });
  assert.deepEqual(briefCut("whatever", undefined), { kept: "whatever", cut: 0 });
  assert.deepEqual(briefCut(undefined, 10), { kept: "", cut: 0 });
});

test("the cut note counts what was left off, and is silent when nothing was", () => {
  assert.equal(cutNote(0, 3000), "");
  assert.match(cutNote(50, 300), /^50 characters didn't fit and were left off the end/);
  assert.match(cutNote(50, 300), /your brief holds 300\./);
  assert.match(cutNote(1, 300), /^1 character didn't fit and was left off/);
});

test("the standalone writer never offers a fixer", () => {
  const kinds = [{ key: "resume", allowed: true }, { key: "punchlines", allowed: true, fixer: true }];
  assert.deepEqual(visibleKinds(kinds, true).map((k) => k.key), ["resume"]);
  assert.deepEqual(visibleKinds(kinds, false).map((k) => k.key), ["resume", "punchlines"]);
});
