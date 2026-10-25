import { test } from "node:test";
import assert from "node:assert/strict";
import { wrapLines, schedule, cardAt, scoreText, bestVideoMime } from "./coachPromo.js";

test("lines wrap at the width and stop at the line limit with an ellipsis", () => {
  assert.deepEqual(wrapLines("one two three four", 9), ["one two", "three", "four"]);
  const many = wrapLines("a ".repeat(200), 5, 2);
  assert.equal(many.length, 2);
  assert.ok(many[1].endsWith("…"));
});

test("verdict, then strengths, then fixes, sliced evenly across the length", () => {
  const cards = schedule({ verdict: "V", strengths: ["S1"], fixes: [{ text: "F1" }, "F2"] }, 30);
  assert.deepEqual(cards.map((c) => c.tone), ["verdict", "good", "fix", "fix"]);
  assert.equal(cards[0].end, 7.5);
  assert.equal(cardAt(cards, 8).text, "S1");
});

test("too many cards for a short video keeps the earliest, at least 3 seconds each", () => {
  const cards = schedule({ verdict: "V", strengths: ["a", "b", "c"], fixes: ["x", "y", "z"] }, 15);
  assert.equal(cards.length, 5);
  assert.ok(cards.every((c) => c.end - c.start >= 3));
});

test("the score is the exact one the member saw, and mp4 wins when supported", () => {
  assert.equal(scoreText({ exact: 7.24, score: 7 }), "7.2");
  assert.equal(scoreText({ score: 6 }), "6");
  assert.equal(bestVideoMime((m) => m.startsWith("video/webm")), "video/webm;codecs=vp9,opus");
  assert.equal(bestVideoMime((m) => m === "video/mp4"), "video/mp4");
});
