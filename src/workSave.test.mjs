import test from "node:test";
import assert from "node:assert/strict";
import { offerBack } from "./workSaveCore.js";

const remote = { updated: 2000, name: "Episode", data: { title: "Night" } };

test("a copy on the account is offered only when it is newer than this device's", () => {
  assert.equal(offerBack({ updated: 1000, data: {} }, remote, { title: "Day" }), true);
  assert.equal(offerBack({ updated: 3000, data: {} }, remote, { title: "Day" }), false);
  assert.equal(offerBack(null, remote, { title: "Day" }), true);
});

test("a copy that matches what the screen already holds is never offered", () => {
  assert.equal(offerBack(null, remote, { title: "Night" }), false);
  assert.equal(offerBack(null, null, { title: "Night" }), false);
  assert.equal(offerBack(null, { updated: 5 }, { title: "Night" }), false);
});
