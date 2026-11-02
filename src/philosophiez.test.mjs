import { test } from "node:test";
import assert from "node:assert/strict";
import { labelMap, philosophyQuery, toggleKey, whoSees } from "./philosophiez.js";

const vis = [
  { field: "politics", level: ["private"] },
  { field: "philosophy", level: ["member"] },
  { field: "religion", level: ["member", "friends"] },
];

test("who can see a field is read from the member's own row, never assumed", () => {
  assert.equal(whoSees(vis, [], "politics"), "Only you");
  assert.equal(whoSees(vis, [], "philosophy"), "Members");
  assert.equal(whoSees(vis, [{ token: "friends", label: "Friends" }], "religion"), "Members + Friends");
  assert.equal(whoSees(vis, [], "unknown_field"), "");
  assert.equal(whoSees(undefined, [], "politics"), "");
});

test("an audience token the screen does not know is shown as it came", () => {
  assert.equal(whoSees([{ field: "politics", level: ["group:7"] }], [], "politics"), "group:7");
});

test("the query is built in one place and is empty when nothing is chosen", () => {
  assert.equal(philosophyQuery({}), "");
  assert.equal(philosophyQuery({ philosophies: ["stoicism", "humanism"], politics: ["centrist"] }),
    "philosophies=stoicism,humanism&politics=centrist");
  assert.equal(philosophyQuery({ politics: ["centrist"] }), "politics=centrist");
});

test("toggling never mutates the list it was given", () => {
  const a = ["x"];
  assert.deepEqual(toggleKey(a, "y"), ["x", "y"]);
  assert.deepEqual(toggleKey(a, "x"), []);
  assert.deepEqual(a, ["x"]);
});

test("a label map reads a served list and tolerates none", () => {
  assert.deepEqual(labelMap([{ key: "a", label: "A" }]), { a: "A" });
  assert.deepEqual(labelMap(undefined), {});
});
