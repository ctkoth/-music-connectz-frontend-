import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PAGE, PAGE_MAX, durationText, filterKey, filtersActive, logQuery, mergeRows, refreshLimit, totalsLine } from "./sessionLog.js";

test("the query carries only what is set, and never asks past the server's ceiling", () => {
  assert.equal(logQuery(), "?limit=25");
  assert.equal(logQuery({ q: " leg day ", since: "2026-01-01", until: "2026-02-01", check: true, offset: 25 }),
    "?limit=25&offset=25&q=leg+day&since=2026-01-01&until=2026-02-01&check=1");
  assert.equal(logQuery({ limit: 5000 }), `?limit=${PAGE_MAX}`);
  assert.equal(logQuery({ id: 7, limit: 1 }), "?limit=1&id=7");
});

test("merging pages never repeats a session", () => {
  const a = [{ id: 3 }, { id: 2 }], b = [{ id: 2 }, { id: 1 }];
  assert.deepEqual(mergeRows(a, b).map((r) => r.id), [3, 2, 1]);
  assert.deepEqual(mergeRows([], b).map((r) => r.id), [2, 1]);
});

test("filters: active when anything narrows the list, and a change is a new key", () => {
  assert.equal(filtersActive({ q: "  ", since: "", until: "", check: false }), false);
  assert.equal(filtersActive({ q: "", since: "2026-01-01" }), true);
  assert.equal(filtersActive({ check: true }), true);
  assert.notEqual(filterKey({ q: "a" }), filterKey({ q: "b" }));
  assert.equal(filterKey({ q: " a " }), filterKey({ q: "a" }));
});

test("a refresh keeps how far down the member had paged, within the server's limit", () => {
  assert.equal(refreshLimit(0), PAGE);
  assert.equal(refreshLimit(10), PAGE);
  assert.equal(refreshLimit(60), 60);
  assert.equal(refreshLimit(900), PAGE_MAX);
});

test("a length that was not measured is blank, never 0:00", () => {
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  assert.equal(durationText(null, clock), "");
  assert.equal(durationText(3600, clock), "60:00");
});

test("the totals line", () => {
  assert.equal(totalsLine({ sessions: 42, sets: 610, volume_kg: 18400 }, (kg) => `${kg} kg`), "42 sessions · 610 sets · 18400 kg lifted");
  assert.equal(totalsLine({ sessions: 1, sets: 3, volume_kg: 0 }, (kg) => `${kg} kg`), "1 session · 3 sets · 0 kg lifted");
  assert.equal(totalsLine(null, String), "");
});

test("SessionZ is a tab, reads the log endpoint, and RoutineZ no longer keeps a second copy of the list", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  assert.match(src, /\{ key: "sessionz", label: "SessionZ" \}/);
  assert.ok(src.includes("/api/economy/bodiez/sessions/log/"));
  assert.ok(src.includes('tab === "sessionz"'));
  const routinez = src.slice(src.indexOf("function RoutineZView"), src.indexOf("function SessionZView"));
  assert.ok(!routinez.includes("history.slice"), "the logged-workouts list should live in SessionZ only");
});

import { byCompleted, completedAt, completedDate } from "./sessionLog.js";

test("SessionZ is newest COMPLETED first: a workout begun earlier but finished later sits above one finished before it", () => {
  const rows = [
    { id: 1, started_at: "2026-11-10T09:00:00Z", ended_at: "2026-11-10T10:00:00Z" },
    { id: 2, started_at: "2026-11-05T09:00:00Z", ended_at: "2026-11-12T08:00:00Z" },   // began last week, finished today
    { id: 3, started_at: "2026-11-11T09:00:00Z", ended_at: "2026-11-11T10:00:00Z" },
  ];
  assert.deepEqual(byCompleted(rows).map((r) => r.id), [2, 3, 1]);
  assert.deepEqual(byCompleted(rows.slice().reverse()).map((r) => r.id), [2, 3, 1]);
});

test("a tie on the completed time falls back to the newer id, the way the server does", () => {
  const t = "2026-11-12T08:00:00Z";
  assert.deepEqual(byCompleted([{ id: 4, ended_at: t }, { id: 9, ended_at: t }]).map((r) => r.id), [9, 4]);
});

test("pages that arrive out of order, or a row put at the top, still land newest-completed first", () => {
  const older = [{ id: 1, ended_at: "2026-11-01T10:00:00Z" }];
  const newer = [{ id: 2, ended_at: "2026-11-09T10:00:00Z" }];
  assert.deepEqual(mergeRows(older, newer).map((r) => r.id), [2, 1]);
});

test("every row says the day it was completed, with the year", () => {
  const d = completedDate({ id: 1, started_at: "2026-11-05T12:00:00Z", ended_at: "2026-11-12T12:00:00Z" }, "en-US");
  assert.match(d, /Nov/); assert.match(d, /12/); assert.match(d, /2026/);
  assert.equal(completedDate({ id: 2 }, "en-US"), "");                       // no date: say nothing, never 1970
  assert.equal(completedAt({ started_at: "2026-11-05T12:00:00Z" }), new Date("2026-11-05T12:00:00Z").getTime());
});

test("the SessionZ row shows the completed date and sorts by it", () => {
  const src = readFileSync(new URL("./apps/BodieZ.jsx", import.meta.url), "utf8");
  const view = src.slice(src.indexOf("function SessionZView"), src.indexOf("// Same scheduler shape"));
  assert.ok(view.includes("completedDate(h)"));
  assert.ok(view.includes("new Date(completedAt(h))"), "the date chip uses the completed time, not started_at");
  assert.ok(view.includes("setRows(byCompleted("));
});
