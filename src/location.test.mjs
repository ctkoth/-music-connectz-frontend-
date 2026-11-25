import test from "node:test";
import assert from "node:assert/strict";
import { locationError } from "./location.js";

test("each failure says its own cause and that nothing was stored", () => {
  const msgs = [1, 2, 3, null].map((code) => locationError(code === null ? null : { code }));
  assert.equal(new Set(msgs).size, 4);
  for (const m of msgs) assert.match(m, /Nothing was stored/);
  assert.match(msgs[0], /Settings/);
});
