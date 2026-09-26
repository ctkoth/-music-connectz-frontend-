// A door speaks its own language — and only claims what the door is.
import { test } from "node:test";
import assert from "node:assert/strict";
import { doorCopy, dimName } from "./doorCopy.js";

const DRUMS = {
  label: "DrumZ", coach: "drum coach", performer: "drummer",
  scores: ["Timing ⏱️", "Groove 🕺", "Dynamics 📊", "Consistency 📐", "Fills 🥁"],
};
const SING = {
  label: "SingZ", coach: "vocal coach", performer: "vocalist",
  scores: ["Pitch 🎯", "Tone 🌈", "Breath 🫁", "Range 📏", "Agility 🌪️"],
};

test("dimName strips the emoji and lowercases", () => {
  assert.equal(dimName("Timing ⏱️"), "timing");
  assert.equal(dimName("Pitch 🎯"), "pitch");
  assert.equal(dimName(""), "");
  assert.equal(dimName(undefined), "");
});

test("the drum door talks about drums and never about pitch or breath", () => {
  const c = doorCopy(DRUMS, "DrumZ");
  assert.equal(c.specific, true);
  assert.match(c.headline, /drum coach/);
  assert.match(c.scoredOn, /Groove/);
  assert.match(c.example, /Timing is solid, but groove cost you 2 points/);
  const all = [c.headline, c.scoredOn, c.example, c.shareText(7)].join(" ").toLowerCase();
  assert.doesNotMatch(all, /pitch|breath|sustain/);
});

test("the singing door keeps talking about singing", () => {
  const c = doorCopy(SING, "SingZ");
  assert.match(c.headline, /vocal coach/);
  assert.match(c.example, /Pitch is solid, but tone cost you 2 points/);
});

test("two doors never get the same headline", () => {
  assert.notEqual(doorCopy(DRUMS, "DrumZ").headline, doorCopy(SING, "SingZ").headline);
});

test("scores are read aloud as a list", () => {
  assert.equal(
    doorCopy(DRUMS, "DrumZ").scoredOn,
    "Scored on Timing ⏱️, Groove 🕺, Dynamics 📊, Consistency 📐 and Fills 🥁.",
  );
});

test("no door data falls back to the generic copy rather than guessing", () => {
  for (const d of [undefined, {}, { coach: "drum coach" }, { coach: "x", scores: ["One"] }]) {
    const c = doorCopy(d, "SingZ");
    assert.equal(c.specific, false);
    assert.equal(c.headline, "One take scored — free, instantly");
    assert.equal(c.scoredOn, "");
  }
});

test("the share names the score and the door, and promises only what the coach does", () => {
  const c = doorCopy(DRUMS, "DrumZ");
  assert.match(c.shareText(8), /8\/10 on my DrumZ take/);
  assert.match(c.shareText(8), /drum coach/);
  assert.match(c.shareText(null), /DrumZ take scored free/);
  assert.doesNotMatch(c.shareText(8), /guarantee|best|#1/i);
});
