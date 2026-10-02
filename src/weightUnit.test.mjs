import { test } from "node:test";
import assert from "node:assert/strict";
import { regionDefault, fromKg, toKg, fmtWeight } from "./weightUnit.js";

test("US, Liberia and Myanmar default to lb; everywhere else kg", () => {
  assert.equal(regionDefault(["en-US"]), "lb");
  assert.equal(regionDefault(["es-US"]), "lb");
  assert.equal(regionDefault(["en-LR"]), "lb");
  assert.equal(regionDefault(["my-MM"]), "lb");
  assert.equal(regionDefault(["en-GB"]), "kg");
  assert.equal(regionDefault(["en-CA"]), "kg");
  assert.equal(regionDefault(["de-DE"]), "kg");
});

test("the first tag that names a region decides; none at all means kg", () => {
  assert.equal(regionDefault(["en", "en-US"]), "lb");
  assert.equal(regionDefault(["en"]), "kg");
  assert.equal(regionDefault([]), "kg");
});

test("a typed pound value survives the round trip through kg", () => {
  for (const lb of [5, 12.5, 35, 45, 135, 225, 405]) assert.equal(fromKg(toKg(lb, "lb"), "lb"), lb);
  assert.equal(toKg(35, "lb"), 15.88);
  assert.equal(toKg(35, "kg"), 35);
});

test("bodyweight (null) stays null, never 0", () => {
  assert.equal(fromKg(null, "lb"), null);
  assert.equal(toKg("", "lb"), null);
  assert.equal(fmtWeight(null, "lb"), "");
  assert.equal(fmtWeight(20, "kg"), "20kg");
  assert.equal(fmtWeight(20, "lb"), "44.1lb");
});
