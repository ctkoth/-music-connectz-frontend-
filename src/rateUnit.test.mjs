import test from "node:test";
import assert from "node:assert/strict";
import { suggestedRateUnit, rateUnitOf, skillQuoteLine } from "./personaSkills.js";

test("studio skills suggest hourly, finished pieces suggest per work", () => {
  assert.equal(suggestedRateUnit("mixengineer", "mixing"), "hour");
  assert.equal(suggestedRateUnit("mixengineer", "mastering"), "hour");
  assert.equal(suggestedRateUnit("producer", "any_production"), "hour");
  assert.equal(suggestedRateUnit("independent_artist", "recording"), "hour");
  assert.equal(suggestedRateUnit("ghostwriter", "lyrics"), "work");
});

test("a price with no stored unit is hourly, never silently per work", () => {
  assert.equal(rateUnitOf({ rate_cents: 5000 }), "hour");
  assert.equal(rateUnitOf({ rate_cents: 700, rate_unit: "work" }), "work");
  assert.equal(rateUnitOf(null), "hour");
});

test("a quoted skill price names its unit when the server sent one", () => {
  assert.equal(skillQuoteLine({ cents: 5, unit: "hour" }, "Mixing"), "Mixing 5 (per hour)");
  assert.equal(skillQuoteLine({ cents: 5, unit: "work" }, "Cover"), "Cover 5 (per work)");
  assert.equal(skillQuoteLine({ cents: 5 }, "Old"), "Old 5");
});
