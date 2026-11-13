import { test } from "node:test";
import assert from "node:assert/strict";
import { flatSkills, ratingDetail, workShown, workLine, monthYear, experienceLine } from "./skillsUsed.js";

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

test("experience is the date learned and the length from it to today", () => {
  const start = new Date(); start.setFullYear(start.getFullYear() - 5);
  const iso = start.toISOString().slice(0, 10);
  const line = experienceLine({ learned: iso, periods: [{ start: iso }], active: true });
  // Five calendar years back is 5 years plus whatever months the date arithmetic leaves.
  assert.match(line, new RegExp(`^Learned ${monthYear(iso)} · (4 years 1\\d months?|5 years( \\d+ months?)?)$`));
});

test("an undated skill says so and never reads as zero experience", () => {
  assert.equal(experienceLine({ learned: null, periods: [] }), "Learned: no start date yet");
  assert.equal(experienceLine(undefined), "Learned: no start date yet");
});

test("a skill the member stopped says when, and counts only the time served", () => {
  const line = experienceLine({ learned: "2000-01-01", periods: [{ start: "2000-01-01", end: "2010-01-01" }],
                                active: false, last_played: "2010-01-01" });
  assert.match(line, /^Learned Jan 2000 · 10 years · last practised Jan 2010$/);
});

test("monthYear refuses what is not a date", () => {
  assert.equal(monthYear("nope"), "");
  assert.equal(monthYear("2012-13-01"), "");
});
