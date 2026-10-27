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
