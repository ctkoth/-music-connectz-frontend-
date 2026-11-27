import { test } from "node:test";
import assert from "node:assert/strict";
import { countWords, ladderOf, planWords, upgradeWords } from "./tierCount.js";

test("a served count reads as a word, and an unserved one says nothing", () => {
  assert.equal(countWords(12), "12");
  assert.equal(countWords(0), "0");
  assert.equal(countWords(null), "unlimited");
  assert.equal(countWords(undefined), null);
});

test("a Free member sees both plans above, with the served numbers", () => {
  assert.equal(upgradeWords(3, { premium: 6, statz: 12 }), "Premium has 6, StatZ has 12");
});

test("a Premium member sees only StatZ above", () => {
  assert.equal(upgradeWords(6, { premium: 6, statz: 12 }), "StatZ has 12");
});

test("a StatZ member has nothing above, so no line", () => {
  assert.equal(upgradeWords(12, { premium: 6, statz: 12 }), "");
});

test("an unlimited plan reads as unlimited, and as keeps-as-many in a refusal", () => {
  assert.equal(upgradeWords(3, { premium: 6, statz: null }), "Premium has 6, StatZ is unlimited");
  assert.equal(upgradeWords(3, { premium: 6, statz: null }, "keeps"), "Premium keeps 6, StatZ keeps as many as you like");
  assert.equal(upgradeWords(6, { premium: 6, statz: null }), "StatZ is unlimited");
});

test("nothing is above an unlimited count, and an unknown count says nothing", () => {
  assert.equal(upgradeWords(null, { premium: 6, statz: 12 }), "");
  assert.equal(upgradeWords(undefined, { premium: 6, statz: 12 }), "");
});

test("a plan whose number was not sent is left out, never guessed", () => {
  assert.equal(upgradeWords(3, { premium: 6 }), "Premium has 6");
  assert.equal(upgradeWords(3, { statz: 12 }), "StatZ has 12");
  assert.equal(upgradeWords(3, undefined), "");
});

test("a StatZ number that is not above the member's is not named (the ladder rule)", () => {
  assert.equal(upgradeWords(6, { premium: 6, statz: 6 }), "");
});

test("planWords reads the member's count and the served ladder off one /limits/ payload", () => {
  const free = { tier: "free", eq_bands: 3, tiers: { premium: { eq_bands: 6 }, statz: { eq_bands: 12 } } };
  assert.equal(planWords(free, "eq_bands"), "Premium has 6, StatZ has 12");
  assert.deepEqual(ladderOf(free, "eq_bands"), { premium: 6, statz: 12 });
  const premium = { tier: "premium", eq_bands: 6, tiers: { premium: { eq_bands: 6 }, statz: { eq_bands: 12 } } };
  assert.equal(planWords(premium, "eq_bands"), "StatZ has 12");
  assert.equal(planWords(undefined, "eq_bands"), "");
});
