import test from "node:test";
import assert from "node:assert/strict";
import { pick, bump } from "./remember.js";

test("last used wins over most used", () => {
  let row = { last: null, counts: {} };
  for (const v of ["a", "a", "a", "b"]) row = bump(row, v);
  assert.equal(pick(row), "b");
});

test("falls back to most used when the last is no longer offered", () => {
  let row = { last: null, counts: {} };
  for (const v of ["a", "a", "b", "c"]) row = bump(row, v);
  assert.equal(pick(row, ["a", "b"]), "a");
});

test("nothing remembered, or nothing still offered, is null", () => {
  assert.equal(pick({ last: null, counts: {} }), null);
  assert.equal(pick(bump({ last: null, counts: {} }, "x"), ["y"]), null);
});

test("blank values are never remembered", () => {
  const row = bump({ last: "a", counts: { a: 1 } }, "");
  assert.equal(row.last, "a");
});

test("memory is bounded", () => {
  let row = { last: null, counts: {} };
  for (let i = 0; i < 100; i++) row = bump(row, "v" + i);
  assert.ok(Object.keys(row.counts).length <= 40);
  assert.equal(row.last, "v99");
});
