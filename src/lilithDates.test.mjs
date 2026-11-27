import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays, addMonths, daysBetween, dayLong, dayShort, dueLabel, isOverdue, localISODate, matchesQuery,
  monthGrid, monthTitle, parseISO, quickDates, shiftMonth,
} from "./lilithDates.js";

test("today is the member's own calendar day, whatever the hour", () => {
  assert.equal(localISODate(new Date(2026, 10, 27, 23, 30)), "2026-11-27");
  assert.equal(localISODate(new Date(2026, 10, 27, 0, 5)), "2026-11-27");
});

test("days between are whole days, signed, and cross years cleanly", () => {
  assert.equal(daysBetween("2026-11-27", "2026-11-29"), 2);
  assert.equal(daysBetween("2026-11-29", "2026-11-27"), -2);
  assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
});

test("adding days handles month, year and leap-year edges", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
});

test("adding months keeps the day, or the month's last day when the month is shorter", () => {
  assert.equal(addMonths("2026-11-27", 1), "2026-12-27");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
});

test("the day names come from the ISO day alone", () => {
  assert.equal(dayShort("2026-11-23"), "Mon 23 Nov");
  assert.equal(dayLong("2026-11-27"), "Friday 27 November 2026");
  assert.deepEqual(parseISO("2026-11-27"), { y: 2026, m: 11, d: 27 });
});

test("a row says overdue, today, tomorrow, or the day", () => {
  assert.equal(dueLabel("2026-11-20", "2026-11-27"), "Overdue · Fri 20 Nov");
  assert.equal(dueLabel("2026-11-27", "2026-11-27"), "Due today");
  assert.equal(dueLabel("2026-11-28", "2026-11-27"), "Due tomorrow");
  assert.equal(dueLabel("2026-12-04", "2026-11-27"), "Due Fri 4 Dec");
  assert.equal(dueLabel(null, "2026-11-27"), "");
  assert.equal(isOverdue("2026-11-26", "2026-11-27"), true);
  assert.equal(isOverdue("2026-11-27", "2026-11-27"), false);
});

test("a month's calendar is whole weeks, Sunday first, with the month's own days counted", () => {
  // 1 November 2026 is a Sunday: no lead days. It has five weeks, the last running into December.
  const nov = monthGrid(2026, 11);
  assert.equal(nov.length, 5);
  assert.ok(nov.every((week) => week.length === 7));
  assert.equal(nov[0][0].iso, "2026-11-01");
  assert.equal(nov.flat().filter((c) => c.inMonth).length, 30);
  assert.equal(nov[4][6].iso, "2026-12-05");
  // 1 February 2027 is a Monday: the grid starts on the Sunday before, in January.
  const feb = monthGrid(2027, 2);
  assert.equal(feb[0][0].iso, "2027-01-31");
  assert.equal(feb[0][0].inMonth, false);
  assert.equal(feb.flat().filter((c) => c.inMonth).length, 28);
});

test("the calendar's title and month steps", () => {
  assert.equal(monthTitle(2026, 11), "November 2026");
  assert.deepEqual(shiftMonth({ y: 2026, m: 12 }, 1), { y: 2027, m: 1 });
  assert.deepEqual(shiftMonth({ y: 2026, m: 1 }, -1), { y: 2025, m: 12 });
});

test("the quick picks are tomorrow, a week and a month on, and never today", () => {
  const picks = quickDates("2026-11-27");
  assert.deepEqual(picks.map((p) => [p.key, p.iso]), [
    ["tomorrow", "2026-11-28"], ["week", "2026-12-04"], ["month", "2026-12-27"],
  ]);
  assert.ok(picks.every((p) => p.iso !== "2026-11-27"));
});

test("search matches every word typed, in the title or the note", () => {
  const task = { title: "Send the stems", note: "to Ada, before Friday" };
  assert.equal(matchesQuery(task, "stems ada"), true);
  assert.equal(matchesQuery(task, "stems zzz"), false);
  assert.equal(matchesQuery(task, "  "), true);
  assert.equal(matchesQuery(task, "FRIDAY"), true);
});
