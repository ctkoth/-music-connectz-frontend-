import { test } from "node:test";
import assert from "node:assert/strict";
import { flatSkills, ratingDetail, workShown, workLine, monthYear, experienceLine, decimalYears, fullDate } from "./skillsUsed.js";

test("an unrated skill says so and never reads as a 0", () => {
  assert.equal(ratingDetail({ skill: "mixing", rating: null, count: 0 }), "not rated yet");
  assert.equal(ratingDetail(undefined), "not rated yet");
});

test("a rated skill says how many ratings stand behind the median", () => {
  assert.equal(ratingDetail({ rating: 7.5, count: 12 }), "median of 12 ratings");
  assert.equal(ratingDetail({ rating: 9, count: 1 }), "median of 1 rating");
});

test("the coach blend is said, so the number is never unexplained", () => {
  assert.match(ratingDetail({ rating: 8, count: 4, coach: { takes: 3 } }), /AI coach/);
});

test("work lists what it was given and counts what was left off", () => {
  const s = { work: [{ id: 1 }, { id: 2 }], work_total: 5 };
  const { shown, more } = workShown(s);
  assert.equal(shown.length, 2);
  assert.equal(more, 3);
  assert.deepEqual(workShown({}), { shown: [], more: 0 });
});

test("a line names the post, its score and how many scored it", () => {
  assert.equal(workLine({ id: 3, title: "Midnight", rating: 8, count: 3 }), "Midnight — 8/10 from 3");
  assert.equal(workLine({ id: 3, title: "Midnight", rating: 7.5, count: 2 }), "Midnight — 7.5/10 from 2");
  assert.equal(workLine({ id: 3, title: "", rating: null, count: 1 }), "Post 3");
});

test("flatSkills tolerates an empty or failed answer", () => {
  assert.deepEqual(flatSkills(null), []);
  assert.deepEqual(flatSkills({ personas: [{ skills: [{ skill: "a" }] }, { skills: [{ skill: "b" }] }] }).map((s) => s.skill), ["a", "b"]);
});

const NOW = Date.UTC(2026, 10, 20);

test("experience is years with one decimal, and .5 is six months", () => {
  assert.equal(decimalYears({ periods: [{ start: "2024-11-20", end: "2025-05-21" }] }, NOW), 0.5);
  assert.equal(decimalYears({ periods: [{ start: "2005-06-20" }] }, NOW), 21.4);
});

test("a skill reads the date it started and its years, not months", () => {
  assert.equal(experienceLine({ learned: "2012-03-04", periods: [{ start: "2012-03-04" }], active: true }, NOW),
               "Started Mar 4, 2012 · 14.7 years experience");
  assert.equal(experienceLine({ learned: "2026-05-20", periods: [{ start: "2026-05-20" }], active: true }, NOW),
               "Started May 20, 2026 · 0.5 years experience");
});

test("an undated skill says so and never reads as zero experience", () => {
  assert.equal(experienceLine({ learned: null, periods: [] }, NOW), "Started: no start date yet");
  assert.equal(experienceLine(undefined, NOW), "Started: no start date yet");
});

test("a skill the member stopped counts only the time served", () => {
  const line = experienceLine({ learned: "2000-01-01", periods: [{ start: "2000-01-01", end: "2010-01-01" }],
                                active: false, last_played: "2010-01-01" }, NOW);
  assert.equal(line, "Started Jan 1, 2000 · 10.0 years experience · last practised Jan 1, 2010");
});

test("fullDate refuses what is not a date", () => {
  assert.equal(fullDate("nope"), "");
  assert.equal(fullDate("2012-03-04"), "Mar 4, 2012");
});

test("monthYear refuses what is not a date", () => {
  assert.equal(monthYear("nope"), "");
  assert.equal(monthYear("2012-13-01"), "");
});

test("a year-only start says the year and 'about', never a day", () => {
  assert.equal(experienceLine({ learned: "2012-01-01", learned_precision: "year", periods: [{ start: "2012-01-01", precision: "year" }], active: true }, NOW),
               "Started 2012 · about 14.9 years experience");
});

test("a year-only stop makes the length an estimate and the last-practised a year", () => {
  assert.equal(experienceLine({ learned: "2000-03-04", learned_precision: "day", approximate: true, active: false,
    last_played: "2010-07-01", last_played_precision: "year",
    periods: [{ start: "2000-03-04", end: "2010-07-01", end_precision: "year" }] }, NOW),
    "Started Mar 4, 2000 · about 10.3 years experience · last practised 2010");
});
