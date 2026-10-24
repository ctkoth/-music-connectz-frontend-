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

test("HookZ and FeelZ ride the share sentence when the coach gave them, and only then", async () => {
  const { shareText, extrasText } = await import("./shareText.js");
  const ex = [{ label: "HookZ 🪝", value: 8 }, { label: "FeelZ 💗", value: 6.5 }];
  assert.equal(extrasText(ex), "HookZ 8 · FeelZ 6.5");
  assert.match(shareText({ score: 7, exact: 7.2, extras: ex }), /7\.2\/10 \(HookZ 8 · FeelZ 6\.5\)/);
  assert.equal(shareText({ score: 7, exact: 7.2 }), shareText({ score: 7, exact: 7.2, extras: [] }));
  assert.equal(extrasText([{ label: "FeelZ", value: null }]), "");
});
