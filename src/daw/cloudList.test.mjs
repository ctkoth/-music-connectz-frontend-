import test from "node:test";
import assert from "node:assert/strict";
import { mb, mergeLists, originNote, sourcesToSend } from "./cloudList.js";

test("only sounds without an upload are sent", () => {
  assert.deepEqual(sourcesToSend({ sources: { a: {}, b: {}, c: {} } }, { b: 7 }), ["a", "c"]);
  assert.deepEqual(sourcesToSend(null, {}), []);
});

test("a session made on another device shows up, and a newer account copy is flagged", () => {
  const local = [{ id: "x", name: "X", updated: 100 }, { id: "y", name: "Y", updated: 300 }];
  const remote = [{ id: "x", name: "X", updated: 200 }, { id: "y", name: "Y", updated: 250 }, { id: "z", name: "Z", updated: 150 }];
  const rows = mergeLists(local, remote);
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by.x.remote, "newer"); assert.equal(by.x.updated, 200);
  assert.equal(by.y.remote, undefined); assert.equal(by.y.updated, 300);   // this device's is newer: not pulled over
  assert.equal(by.z.remote, "only");
  assert.deepEqual(rows.map((r) => r.id), ["y", "x", "z"]);
});

test("the notes say where a row came from", () => {
  assert.match(originNote({ remote: "only" }), /from your account/);
  assert.match(originNote({ remote: "newer" }), /newer/);
  assert.equal(originNote({}), "");
  assert.equal(mb(1572864), 1.5);
});
