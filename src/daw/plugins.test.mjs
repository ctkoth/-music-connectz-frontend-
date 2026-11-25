import { test } from "node:test";
import assert from "node:assert/strict";

test("an effect's blend amount survives cleaning, and 100 is not stored", async () => {
  const { cleanInsert, newInsert } = await import("./plugins.js");
  const half = cleanInsert({ ...newInsert("comp"), amount: 50 });
  assert.equal(half.amount, 50);
  assert.equal(cleanInsert({ ...newInsert("comp"), amount: 100 }).amount, undefined);
  assert.equal(cleanInsert({ ...newInsert("comp"), amount: 900 }).amount, undefined);   // clamped to 100 = untouched
  assert.equal(cleanInsert({ ...newInsert("comp"), amount: -5 }).amount, 0);
});
