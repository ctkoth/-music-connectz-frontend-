import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYear, yearOnlyStart, yearOnlyEnd, startIsYearOnly, endIsYearOnly, hasYearOnlyDates, skillDurationShown, skillYears } from "./personaSkills.js";

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

test("a year-only stop is stored as that year's 1 July", () => {
  assert.equal(yearOnlyEnd(2013), "2013-07-01");
});

test("only a 1 July with the flag counts as a year-only stop", () => {
  assert.equal(endIsYearOnly({ start: "2000-01-01", end: "2013-07-01", end_precision: "year" }), true);
  assert.equal(endIsYearOnly({ start: "2000-01-01", end: "2013-03-04", end_precision: "year" }), false);
  assert.equal(endIsYearOnly({ start: "2000-01-01", end: "2013-07-01" }), false);
  assert.equal(endIsYearOnly({ start: "2000-01-01", end_precision: "year" }), false);
  assert.equal(endIsYearOnly(undefined), false);
});

test("any year-only date, start or stop, makes the skill approximate", () => {
  assert.equal(hasYearOnlyDates({ periods: [{ start: "2000-03-04", end: "2010-07-01", end_precision: "year" }] }), true);
  assert.equal(hasYearOnlyDates({ periods: [{ start: "2000-01-01", precision: "year", end: "2010-05-06" }] }), true);
  assert.equal(hasYearOnlyDates({ periods: [{ start: "2000-03-04", end: "2010-05-06" }] }), false);
});

test("a year-only stop is never worded in months or days either", () => {
  const sk = { periods: [{ start: "2000-03-04", end: yearOnlyEnd(2010), end_precision: "year" }] };
  assert.equal(skillDurationShown(sk), "about 10 years");
});

test("a start and a stop in the same year is under a year, not dropped", () => {
  const y = thisYear - 3;
  const sk = { periods: [{ start: yearOnlyStart(y), precision: "year", end: yearOnlyEnd(y), end_precision: "year" }] };
  assert.equal(skillDurationShown(sk), "less than a year");
});
