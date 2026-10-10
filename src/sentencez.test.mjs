import test from "node:test";
import assert from "node:assert/strict";
import { nextTierBrief, pickKind, visibleKinds } from "./sentencez.js";

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
