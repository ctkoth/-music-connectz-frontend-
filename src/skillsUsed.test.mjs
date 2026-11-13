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

test("an old skill is years only: a member knows the year they started, not the month", () => {
  const line = experienceLine({ learned: "2012-03-01", periods: [{ start: "2012-03-01" }], active: true, years: 13 });
  assert.equal(line, "Learned 2012 · 13 years");
});

test("a young skill keeps the precision the member really has", () => {
  const d = new Date(); d.setMonth(d.getMonth() - 8); d.setDate(1);
  const iso = d.toISOString().slice(0, 10);
  const line = experienceLine({ learned: iso, periods: [{ start: iso }], active: true, years: 0 });
  assert.match(line, new RegExp(`^Learned ${monthYear(iso)} · \\d+ months?$`));
});

test("the switch to years-only is at two years", () => {
  assert.equal(experienceLine({ learned: "2000-06-15", periods: [{ start: "2000-06-15" }], years: 1 }).includes("year"), true);
  assert.match(experienceLine({ learned: "2000-06-15", periods: [{ start: "2000-06-15" }], active: true, years: 2 }), /^Learned 2000 · 2 years$/);
});

test("an undated skill says so and never reads as zero experience", () => {
  assert.equal(experienceLine({ learned: null, periods: [] }), "Learned: no start date yet");
  assert.equal(experienceLine(undefined), "Learned: no start date yet");
});

test("a skill the member stopped says which year, and counts only the time served", () => {
  const line = experienceLine({ learned: "2000-01-01", periods: [{ start: "2000-01-01", end: "2010-01-01" }],
                                active: false, last_played: "2010-01-01", years: 10 });
  assert.equal(line, "Learned 2000 · 10 years · last practised 2010");
});

test("monthYear refuses what is not a date", () => {
  assert.equal(monthYear("nope"), "");
  assert.equal(monthYear("2012-13-01"), "");
});

test("a year-only start says the year and 'about', never a month", () => {
  assert.equal(experienceLine({ learned: "2012-01-01", learned_precision: "year", periods: [{ start: "2012-01-01", precision: "year" }], active: true, years: 13 }),
               "Learned 2012 · about 13 years");
  assert.equal(experienceLine({ learned: "2026-01-01", learned_precision: "year", periods: [{ start: "2026-01-01", precision: "year" }], active: true, years: 0 }),
               "Learned 2026 · less than a year");
});

test("a year-only stop makes the length an estimate and the last-practised a year", () => {
  assert.equal(experienceLine({ learned: "2000-03-04", learned_precision: "day", approximate: true, active: false,
    last_played: "2010-07-01", last_played_precision: "year", years: 10,
    periods: [{ start: "2000-03-04", end: "2010-07-01", end_precision: "year" }] }),
    "Learned 2000 · about 10 years · last practised 2010");
});

test("a young skill stopped within one year says less than a year", () => {
  const d = new Date(); d.setMonth(d.getMonth() - 10); d.setDate(1);
  const iso = d.toISOString().slice(0, 10);
  assert.equal(experienceLine({ learned: iso, learned_precision: "day", approximate: true, active: false,
    last_played: `${d.getFullYear()}-07-01`, last_played_precision: "year", years: 0, periods: [{ start: iso, end: `${d.getFullYear()}-07-01`, end_precision: "year" }] }).includes("less than a year"), true);
});
