import test from "node:test";
import assert from "node:assert/strict";
import { shareText } from "./shareText.js";

test("a high score is a dare, a mid one a flex, a low one the start of a climb", () => {
  assert.match(shareText({ score: 9 }), /beat it/);
  assert.match(shareText({ score: 6, exact: 6.2 }), /6\.2\/10/);
  assert.match(shareText({ score: 4 }), /Day one/);
  assert.match(shareText({ score: 4 }), /climb/);
});

test("it frames the number it is given and never makes one up", () => {
  assert.doesNotMatch(shareText({ score: 4 }), /10\/10|9\/10/);
  assert.equal(shareText({}), "Get your take scored by the AI coach, free:");
  assert.match(shareText({ score: 6, exact: 6 }), /6\/10/);        // whole stays whole
});

test("an improvement says from, to and how long", () => {
  const t = shareText({ progress: { label: "Flow 🌊", was: 4.5, now: 5.8, days: 14 } });
  assert.match(t, /Flow/);
  assert.match(t, /4\.5 → 5\.8 in 14 days/);
});

test("a personal best is announced as one, whatever the number", () => {
  assert.match(shareText({ score: 4, pb: true }), /personal best/);
  assert.match(shareText({ score: 4, pb: true }), /4\/10/);
  assert.doesNotMatch(shareText({ score: 4, pb: false }), /personal best/);
});
