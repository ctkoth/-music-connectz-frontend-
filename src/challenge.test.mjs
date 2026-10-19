import test from "node:test";
import assert from "node:assert/strict";
import { beatVerdict } from "./challenge.js";

test("a higher score wins and says by how much it stands", () => {
  const v = beatVerdict({ mine: 7.4, theirs: "6.2", who: "kay" });
  assert.equal(v.won, true);
  assert.match(v.text, /beat @kay — 7.4 to 6.2/);
});

test("a lower score does not win and points at the way to fix it", () => {
  const v = beatVerdict({ mine: 5, theirs: 6, who: "kay" });
  assert.equal(v.won, false);
  assert.match(v.text, /still hold it, 6 to 5/);
});

test("a tie is a tie, and a card with no number is no comparison", () => {
  assert.match(beatVerdict({ mine: 6, theirs: "6.0", who: "kay" }).text, /dead heat/);
  assert.equal(beatVerdict({ mine: 6, theirs: null }), null);
  assert.equal(beatVerdict({ mine: null, theirs: 6 }), null);
});
