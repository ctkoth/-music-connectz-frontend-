import { test } from "node:test";
import assert from "node:assert/strict";
import { KEY, TTL_MS, readReturn, stashReturn, takeReturn, clearReturn } from "./auth/returnTo.js";

function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _m: m,
  };
}
const T = { access: "a1", refresh: "r1" };

test("a stash round-trips and names the account it belongs to", () => {
  const s = fakeStorage();
  assert.equal(stashReturn("main", T, s, 1000), true);
  assert.deepEqual(readReturn(s, 1000), { username: "main", access: "a1", refresh: "r1", at: 1000 });
});

test("there is ONE slot, and a second stash never overwrites the first", () => {
  const s = fakeStorage();
  assert.equal(stashReturn("main", T, s, 1000), true);
  assert.equal(stashReturn("other", { access: "a2", refresh: "r2" }, s, 1001), false);
  assert.equal(readReturn(s, 1001).username, "main");
});

test("taking it uses it up", () => {
  const s = fakeStorage();
  stashReturn("main", T, s, 1000);
  assert.equal(takeReturn(s, 1001).username, "main");
  assert.equal(readReturn(s, 1002), null);
  assert.equal(s._m.has(KEY), false);
});

test("it expires, and an expired one is removed rather than offered", () => {
  const s = fakeStorage();
  stashReturn("main", T, s, 0);
  assert.equal(readReturn(s, TTL_MS - 1).username, "main");
  assert.equal(readReturn(s, TTL_MS), null);
  assert.equal(s._m.has(KEY), false);
});

test("an expired stash does not block a new one", () => {
  const s = fakeStorage();
  stashReturn("old", T, s, 0);
  assert.equal(stashReturn("main", T, s, TTL_MS + 5), true);
  assert.equal(readReturn(s, TTL_MS + 5).username, "main");
});

test("clearing it removes it", () => {
  const s = fakeStorage();
  stashReturn("main", T, s, 1000);
  clearReturn(s);
  assert.equal(readReturn(s, 1001), null);
});

test("junk in storage is never an account to switch to", () => {
  for (const raw of ["", "not json", "{}", JSON.stringify({ username: "x" }),
    JSON.stringify({ username: "", access: "a", refresh: "r", at: 1 }),
    JSON.stringify({ username: "x", access: "a", refresh: "r", at: "yesterday" })]) {
    const s = fakeStorage({ [KEY]: raw });
    assert.equal(readReturn(s, 5), null, raw);
  }
});

test("no storage means no stash, said honestly", () => {
  assert.equal(stashReturn("main", T, null), false);
  assert.equal(readReturn(null), null);
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(stashReturn("main", T, blocked), false);
  assert.equal(readReturn(blocked), null);
});

test("a stash with a missing token is refused", () => {
  const s = fakeStorage();
  assert.equal(stashReturn("main", { access: "a", refresh: "" }, s, 1), false);
  assert.equal(stashReturn("main", { access: "", refresh: "r" }, s, 1), false);
  assert.equal(stashReturn("", T, s, 1), false);
});
