import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FILTER, DEFAULT_SORT, filterTakes, genresOf, needsAll, sortTakes, sortValue } from "./takeSort.js";

const T = (id, at, overall, extra = {}) => ({ id, at, overall, scores: {}, ...extra });
const takes = [
  T(1, "2026-10-10T10:00:00Z", 6, { exact: 6.2, scores: { flow: 5 }, genre: "Trap" }),
  T(2, "2026-10-12T10:00:00Z", 7, { exact: 7.4, scores: { flow: 8 }, genre: "Drill", pb: true }),
  T(3, "2026-10-11T10:00:00Z", 6, { exact: 6.2, scores: {}, genre: "Trap" }),
  T(4, "2026-10-09T10:00:00Z", 4, { scores: { flow: 2 }, genre: "" }),
];
const ids = (xs) => xs.map((t) => t.id);

test("date sorts both ways", () => {
  assert.deepEqual(ids(sortTakes(takes, { by: "date", dir: "desc" })), [2, 3, 1, 4]);
  assert.deepEqual(ids(sortTakes(takes, { by: "date", dir: "asc" })), [4, 1, 3, 2]);
});

test("overall uses the exact score, and ties break newest first", () => {
  assert.deepEqual(ids(sortTakes(takes, { by: "overall", dir: "desc" })), [2, 3, 1, 4]);
  assert.deepEqual(ids(sortTakes(takes, { by: "overall", dir: "asc" })), [4, 3, 1, 2]);
});

test("a take with no value for a dimension sorts last in BOTH directions, never as 0", () => {
  assert.deepEqual(ids(sortTakes(takes, { by: "flow", dir: "desc" })).slice(0, 3), [2, 1, 4]);
  assert.deepEqual(ids(sortTakes(takes, { by: "flow", dir: "asc" })).slice(0, 3), [4, 1, 2]);
  assert.equal(ids(sortTakes(takes, { by: "flow", dir: "asc" })).at(-1), 3);
  assert.equal(sortValue(takes[2], "flow"), null);
});

test("sorting never changes the input", () => {
  const copy = JSON.stringify(takes);
  sortTakes(takes, { by: "overall", dir: "asc" });
  assert.equal(JSON.stringify(takes), copy);
});

test("filters: personal bests and genre, together", () => {
  assert.deepEqual(ids(filterTakes(takes, { pbOnly: true, genre: "" })), [2]);
  assert.deepEqual(ids(filterTakes(takes, { pbOnly: false, genre: "Trap" })), [1, 3]);
  assert.deepEqual(ids(filterTakes(takes, { pbOnly: true, genre: "Trap" })), []);
  assert.deepEqual(genresOf(takes), ["Drill", "Trap"]);
});

test("only the default view can use the first page; anything else needs every take", () => {
  assert.equal(needsAll(DEFAULT_SORT, DEFAULT_FILTER), false);
  assert.equal(needsAll({ by: "date", dir: "asc" }, DEFAULT_FILTER), true);
  assert.equal(needsAll(DEFAULT_SORT, { pbOnly: true, genre: "" }), true);
  assert.equal(needsAll({ by: "flow", dir: "desc" }, DEFAULT_FILTER), true);
});
