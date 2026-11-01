import test from "node:test";
import assert from "node:assert/strict";
import { isGone, goneCount, checkSummary } from "./fileStatus.js";

test("only a server-marked file is gone", () => {
  assert.equal(isGone({ missing: true }), true);
  assert.equal(isGone({ missing: false }), false);
  assert.equal(isGone({}), false);
  assert.equal(isGone(null), false);
  assert.equal(goneCount([{ missing: true }, {}, { missing: true }]), 2);
  assert.equal(goneCount(undefined), 0);
});

test("a clean check says everything is there and deletes nothing to report", () => {
  assert.equal(checkSummary({ checked: 3, present: 3, gone: 0, came_back: 0, unreadable: 0 }),
    "All 3 files are on the server.");
  assert.equal(checkSummary({ checked: 1, gone: 0 }), "All 1 file is on the server.");
});

test("lost files are counted and the summary says nothing was deleted", () => {
  const s = checkSummary({ checked: 5, present: 2, gone: 3, came_back: 0, unreadable: 0 });
  assert.match(s, /3 of 5 files are no longer on the server/);
  assert.match(s, /Nothing was deleted/);
});

test("an unreachable store is never reported as lost files", () => {
  const s = checkSummary({ checked: 0, gone: 0, unreadable: 4 });
  assert.match(s, /4 couldn't be checked/);
  assert.match(s, /not marked lost/);
});

test("no files and no response", () => {
  assert.equal(checkSummary({ checked: 0, unreadable: 0 }), "You have no files to check.");
  assert.equal(checkSummary(null), "");
});
