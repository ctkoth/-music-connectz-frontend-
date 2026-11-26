import assert from "node:assert/strict";
import { test } from "node:test";
import { keepGranted, trimOnMove } from "./autoTrim.js";

const row = (id, sets, extra = {}) => ({ orig_id: id, exercise_id: id, sets, name: `L${id}`, ...extra });

test("moving on trims a part-done lift to what was done: 3/5 becomes 3/3", () => {
  const r = trimOnMove({ planned: [row(1, 5), row(2, 3)], doneBy: { 1: 3 }, loggedId: 2 });
  assert.equal(r.over[1], 3);
  assert.deepEqual(r.auto, [1]);
  assert.deepEqual(r.trimmed, [{ name: "L1", sets: 3, orig_id: 1, exercise_id: 1 }]);
});

test("an untouched lift, a finished one and the lift being logged are left alone", () => {
  const r = trimOnMove({ planned: [row(1, 5), row(2, 3), row(3, 4)], doneBy: { 2: 3, 3: 1 }, loggedId: 3 });
  assert.deepEqual(r.over, {});
  assert.deepEqual(r.trimmed, []);
});

test("the two halves of a superset are never trimmed for each other", () => {
  const byGroup = trimOnMove({ planned: [row(1, 4, { group: "A" }), row(2, 4, { group: "A" })], doneBy: { 1: 2, 2: 1 }, loggedId: 2 });
  assert.deepEqual(byGroup.over, {});
  const bySession = trimOnMove({ planned: [row(1, 4), row(2, 4)], doneBy: { 1: 2 }, loggedId: 2, pairs: [[1, 2]] });
  assert.deepEqual(bySession.over, {});
});

test("a target the member set by hand is theirs", () => {
  const r = trimOnMove({ planned: [row(1, 4), row(2, 3)], doneBy: { 1: 2 }, loggedId: 2, over: { 1: 4 }, auto: [] });
  assert.equal(r.over[1], 4);
});

test("coming back to a trimmed lift grows its target with the sets done", () => {
  const r = trimOnMove({ planned: [row(1, 3), row(2, 3)], doneBy: { 1: 3 }, loggedId: 1, over: { 1: 3 }, auto: [1] });
  assert.equal(r.over[1], 4);
});

test("a lift added on the day is never trimmed (it has no plan)", () => {
  const r = trimOnMove({ planned: [row(9, 2, { extra: true }), row(2, 3)], doneBy: { 9: 1 }, loggedId: 2 });
  assert.deepEqual(r.over, {});
});

test("only the trims the server granted are applied; a refused lift reads as planned", () => {
  const before = { over: {}, auto: [] };
  const after = trimOnMove({ planned: [row(1, 5), row(2, 4), row(3, 3)], doneBy: { 1: 3, 2: 2 }, loggedId: 3 });
  const kept = keepGranted(before, after, [1]);
  assert.deepEqual(kept.over, { 1: 3 });
  assert.deepEqual(kept.auto, [1]);
  assert.deepEqual(kept.trimmed.map((x) => x.name), ["L1"]);
});

test("a trimmed lift growing back needs no grant", () => {
  const before = { over: { 1: 3 }, auto: [1] };
  const after = trimOnMove({ planned: [row(1, 3), row(2, 3)], doneBy: { 1: 3 }, loggedId: 1, ...before });
  assert.equal(keepGranted(before, after, []).over[1], 4);
});
