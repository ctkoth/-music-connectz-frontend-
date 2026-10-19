import test from "node:test";
import assert from "node:assert/strict";
import { eligible } from "./autoMemo.js";

test("a select with an empty-value option is a filter or picker, never autofilled", () => {
  assert.equal(eligible(["", "a", "b"]), false);
  assert.equal(eligible(["a", "b"]), true);
  assert.equal(eligible(["a"]), false);
});
