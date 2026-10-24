import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_WARN_AT, dueWarnings, endsAtText, latestDue, untilText, warningText } from "./statzWarn.js";

test("nothing is due until the clock crosses a threshold, and nothing after the end", () => {
  assert.deepEqual(dueWarnings(3000), []);
  assert.deepEqual(dueWarnings(300), [300]);
  assert.deepEqual(dueWarnings(0), []);
  assert.deepEqual(dueWarnings(-5), []);
});

test("a threshold already said is not said again, and the next one still is", () => {
  assert.deepEqual(dueWarnings(59, DEFAULT_WARN_AT, new Set([300])), [60]);
  assert.deepEqual(dueWarnings(59, DEFAULT_WARN_AT, new Set([300, 60])), []);
});

test("a tab that slept through both says only the latest", () => {
  assert.equal(latestDue(50, [300, 60], new Set()), 60);
  assert.equal(latestDue(250, [300, 60], new Set()), 300);
  assert.equal(latestDue(250, [300, 60], new Set([300])), null);
});

test("the wording names the time left, what locks, and that what was built stays", () => {
  const w = warningText(300, [{ label: "Who viewed your posts, as DAW tracks" }]);
  assert.match(w.title, /5 minutes left/);
  assert.match(w.body, /who viewed your posts, as daw tracks lock when it ends/);
  assert.match(w.body, /stays yours/);
  assert.match(warningText(60).title, /1 minute left/);
});

test("the clock time is stated, and a bad date says nothing rather than Invalid Date", () => {
  assert.match(endsAtText("2026-10-17T15:42:00Z", "en-US"), /^ends at \d{1,2}:\d{2}/);
  assert.equal(endsAtText("nope"), "");
});

test("the wait for the next free sample is said in hours and minutes", () => {
  assert.equal(untilText(5 * 3600 + 12 * 60 + 9), "5h 12m");
  assert.equal(untilText(42 * 60), "42m");
  assert.equal(untilText(30), "under a minute");
  assert.equal(untilText(-4), "under a minute");
  assert.equal(untilText(undefined), "under a minute");
});
