import { test } from "node:test";
import assert from "node:assert/strict";
import { validGroups, relabel, normalize, partnerOf, badge, linkWithNext, unlink, blocks, nextInPair, holdFor } from "./supersets.js";

const r = (id, group, sets = 3) => ({ exercise_id: id, sets, ...(group ? { group } : {}) });
const groups = (rows) => rows.map((x) => x.group ?? null);

test("a group is exactly two rows side by side; anything else is dropped", () => {
  assert.deepEqual(groups(validGroups([r(1, "A"), r(2, "A"), r(3)])), ["A", "A", null]);
  assert.deepEqual(groups(validGroups([r(1, "A"), r(2, "A"), r(3, "A")])), [null, null, null]);
  assert.deepEqual(groups(validGroups([r(1, "A"), r(3), r(2, "A")])), [null, null, null]);
  assert.deepEqual(groups(validGroups([r(1, "A"), r(2)])), [null, null]);
});

test("labels run A, B, C in routine order whatever they were called", () => {
  const rows = [r(1, "X"), r(2, "X"), r(3), r(4, "Q"), r(5, "Q")];
  assert.deepEqual(groups(relabel(rows)), ["A", "A", null, "B", "B"]);
});

test("linking two neighbours makes a pair, labelled and adjacent", () => {
  const out = linkWithNext([r(1), r(2), r(3)], 0);
  assert.deepEqual(groups(out), ["A", "A", null]);
  assert.equal(badge(out, 0), "A1");
  assert.equal(badge(out, 1), "A2");
  assert.equal(badge(out, 2), "");
});

test("linking refuses the last row and a row already in a pair, and changes nothing", () => {
  const rows = [r(1, "A"), r(2, "A"), r(3)];
  assert.equal(linkWithNext(rows, 2), null);
  assert.equal(linkWithNext(rows, 1), null);      // 2 is paired already
  assert.equal(linkWithNext([r(1), r(2)], 5), null);
  assert.equal(linkWithNext([r(1), r(2)], -1), null);
});

test("unlinking takes the pair apart and relabels the rest", () => {
  const rows = [r(1, "A"), r(2, "A"), r(3, "B"), r(4, "B")];
  assert.deepEqual(groups(unlink(rows, 1)), [null, null, "A", "A"]);
  assert.equal(unlink([r(1), r(2)], 0).length, 2);
});

test("editing by hand cannot leave a stale pair: removing one half frees the other", () => {
  const rows = [r(1, "A"), r(2, "A"), r(3)];
  assert.deepEqual(groups(normalize(rows.filter((x) => x.exercise_id !== 1))), [null, null]);
});

test("moving a half away from its partner breaks the pair", () => {
  const rows = [r(1, "A"), r(2, "A"), r(3)];
  const moved = [rows[0], rows[2], rows[1]];
  assert.deepEqual(groups(normalize(moved)), [null, null, null]);
});

test("a partner is the neighbour with the same group", () => {
  const rows = [r(1), r(2, "A"), r(3, "A")];
  assert.equal(partnerOf(rows, 1), 2);
  assert.equal(partnerOf(rows, 2), 1);
  assert.equal(partnerOf(rows, 0), -1);
});

test("blocks lays the plan out as singles and pairs", () => {
  const b = blocks([r(1), r(2, "A"), r(3, "A"), r(4)]);
  assert.deepEqual(b.map((x) => (x.pair ? x.pair.map((p) => p.exercise_id) : x.single.exercise_id)), [1, [2, 3], 4]);
});

test("a pair alternates, the first lift on a tie, and ends when both are done", () => {
  const pair = [r(1, "A", 3), r(2, "A", 3)];
  assert.equal(nextInPair(pair, 0, 0), 0);
  assert.equal(nextInPair(pair, 1, 0), 1);
  assert.equal(nextInPair(pair, 1, 1), 0);
  assert.equal(nextInPair(pair, 3, 2), 1);
  assert.equal(nextInPair(pair, 2, 3), 0);
  assert.equal(nextInPair(pair, 3, 3), null);
});

test("after the first half of a pair the rest clock is held and the second lift named", () => {
  const planned = [r(1, "A"), r(2, "A"), r(3)];
  const sets = { 1: [{}], 2: [] };
  assert.equal(holdFor(planned, sets, 1).exercise_id, 2);
  assert.equal(holdFor(planned, { 1: [{}], 2: [{}] }, 2), null);       // finished the round: rest
  assert.equal(holdFor(planned, { 1: [{}], 2: [{}] }, 1), null);
  assert.equal(holdFor(planned, { 3: [{}] }, 3), null);                // a single lift rests as always
});
