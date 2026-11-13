import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYear, yearOnlyStart, startIsYearOnly, skillDurationShown, skillYears } from "./personaSkills.js";

const thisYear = new Date().getFullYear();

test("a year is exactly four digits inside 1900..this year", () => {
  assert.equal(parseYear("2012"), 2012);
  assert.equal(parseYear(String(thisYear)), thisYear);
  for (const bad of ["20", "201", "20123", "abcd", "", null, "1899", String(thisYear + 1)]) assert.equal(parseYear(bad), null, String(bad));
});

test("a year-only answer is stored as that year's 1 January", () => {
  assert.equal(yearOnlyStart(2012), "2012-01-01");
});

test("only a 1 January with the flag counts as year-only", () => {
  assert.equal(startIsYearOnly({ periods: [{ start: "2012-01-01", precision: "year" }] }), true);
  assert.equal(startIsYearOnly({ periods: [{ start: "2012-06-15", precision: "year" }] }), false);
  assert.equal(startIsYearOnly({ periods: [{ start: "2012-01-01" }] }), false);
  assert.equal(startIsYearOnly({ start: "2012-01-01" }), false);
  assert.equal(startIsYearOnly(undefined), false);
});

test("a year-only skill is never worded in months or days", () => {
  const sk = { periods: [{ start: yearOnlyStart(thisYear - 13), precision: "year" }] };
  assert.equal(skillDurationShown(sk), "about 13 years");
  assert.equal(skillDurationShown({ periods: [{ start: yearOnlyStart(thisYear), precision: "year" }] }), "less than a year");
});

test("calendar years since 1 January is exactly the whole years served", () => {
  assert.equal(skillYears({ periods: [{ start: yearOnlyStart(thisYear - 7), precision: "year" }] }), 7);
});

test("a full date keeps its precise wording", () => {
  const d = new Date(); d.setFullYear(d.getFullYear() - 5);
  const iso = d.toISOString().slice(0, 10);
  assert.doesNotMatch(skillDurationShown({ periods: [{ start: iso }] }), /about/);
});
