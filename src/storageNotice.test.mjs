import test from "node:test";
import assert from "node:assert/strict";
import { NOTICE_HOURS, noticeDue, storageNotice } from "./storageNotice.js";

test("the notice appears only when the server itself says uploads are temporary", () => {
  assert.ok(storageNotice({ uploads: { ephemeral: true, durable: false } }));
  assert.equal(storageNotice({ uploads: { ephemeral: false, durable: true } }), null);
  assert.equal(storageNotice({}), null);
  assert.equal(storageNotice(null), null);
  assert.equal(storageNotice({ uploads: { ephemeral: "yes" } }), null);   // only a real true counts: nothing is guessed
});

test("it says what can happen and what to do, in plain words", () => {
  const n = storageNotice({ uploads: { ephemeral: true } });
  assert.match(n.body, /erased/);
  assert.match(n.body, /download/i);
  assert.ok(n.cta);
});

test("it comes back every day until the storage is fixed, not on every page", () => {
  const now = 10 * 24 * 3600 * 1000;
  assert.equal(noticeDue(0, now), true);
  assert.equal(noticeDue(now - 3600 * 1000, now), false);
  assert.equal(noticeDue(now - (NOTICE_HOURS + 1) * 3600 * 1000, now), true);
});
