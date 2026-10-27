import test from "node:test";
import assert from "node:assert/strict";
import { arrange } from "./friendz.js";

const names = (rows) => rows.map((r) => r.name);

test("partners lead, then the closest to partnering, then the rest by name", () => {
  const rows = arrange(
    ["zed", "amy", "bob", "cat", "dan"],
    ["dan"],
    [{ username: "cat", works: 1, needs: 2 }, { username: "bob", works: 2, needs: 1 }],
  );
  assert.deepEqual(names(rows), ["dan", "bob", "cat", "amy", "zed"]);
  assert.equal(rows[0].partner, true);
  assert.equal(rows[1].almost.needs, 1);
});

test("matching is case-insensitive and keeps the name as the server sent it", () => {
  const rows = arrange(["Amy"], ["amy"], []);
  assert.deepEqual(names(rows), ["Amy"]);
  assert.equal(rows[0].partner, true);
});

test("an older API with no `almost`, or nothing at all, still renders a list", () => {
  assert.deepEqual(names(arrange(["b", "a"], [], undefined)), ["a", "b"]);
  assert.deepEqual(arrange(undefined, undefined, undefined), []);
});

test("somebody only partway there is not marked a partner", () => {
  const [r] = arrange(["cat"], [], [{ username: "cat", works: 2, needs: 1 }]);
  assert.equal(r.partner, false);
  assert.equal(r.almost.works + r.almost.needs, 3);
});
