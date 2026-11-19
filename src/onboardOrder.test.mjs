import test from "node:test";
import assert from "node:assert/strict";
import { coreDone, firstCoach, nextStep, ordered } from "./onboardOrder.js";

test("the score comes first, and profile fields wait until after posting and rating", () => {
  const keys = ordered([{ key: "birthday" }, { key: "refer" }, { key: "post" }, { key: "score" }, { key: "rate" }, { key: "profile" }]).map((s) => s.key);
  assert.deepEqual(keys, ["score", "post", "rate", "profile", "birthday", "refer"]);
});

test("one next step: the first not done", () => {
  assert.equal(nextStep([{ key: "post", done: false }, { key: "score", done: true }]).key, "post");
  assert.equal(nextStep([{ key: "score", done: true }]), null);
});

test("the bonus asks for the score, a post and ratings — not paperwork", () => {
  const s = (o) => ["score", "post", "rate", "birthday"].map((k) => ({ key: k, done: !!o[k] }));
  assert.ok(coreDone(s({ score: 1, post: 1, rate: 1 })));
  assert.ok(!coreDone(s({ score: 1, post: 1, birthday: 1 })));
});

test("the first score opens the coach they tried, else one they picked, else SingZ", () => {
  assert.equal(firstCoach({ trialApp: "rapz" }), "rapz");
  assert.equal(firstCoach({ seeds: ["postz", "drumz"] }), "drumz");
  assert.equal(firstCoach({ trialApp: "nonsense" }), "singz");
});
