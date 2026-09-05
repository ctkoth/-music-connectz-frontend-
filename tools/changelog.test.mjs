// node --test tools/
//
// The changelog is the one screen that describes the app to the people using
// it, and it is a hand-written JS array — which means the two ways it rots are
// a duplicated id (the unread dot silently stops working) and a tier number
// retyped into prose (the exact drift the "20 free prompts" rule exists for).
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CHANGELOG } from "../src/changelog.js";

test("there is at least one entry and it is shaped", () => {
  assert.ok(CHANGELOG.length > 0);
  for (const r of CHANGELOG) {
    assert.match(r.id, /^[a-z0-9-]+$/, "id is the unread key — keep it stable and slug-shaped");
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/, `${r.id} needs an ISO date`);
    assert.ok(r.title?.length > 10, `${r.id} needs a real title`);
    assert.ok(Array.isArray(r.lines) && r.lines.length, `${r.id} needs lines`);
  }
});

test("ids are unique, because the unread dot is keyed on the newest one", () => {
  const ids = CHANGELOG.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("entries are newest first — the header dot reads CHANGELOG[0]", () => {
  const dates = CHANGELOG.map((r) => r.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("a line says what it does, not just that something happened", () => {
  for (const r of CHANGELOG) {
    for (const l of r.lines) {
      assert.ok(l.length > 40, `${r.id}: "${l}" is too short to explain anything`);
    }
  }
});

test("no tier ladder is retyped into the prose", () => {
  // Server-published numbers only. "20 free prompts" got into nine files this
  // way, and a changelog is exactly where a tenth would land.
  const banned = /\b(free|premium|statz)\s+\d+\s*(\/|per\s)?\s*(day|prompts?|runs?)\b/i;
  for (const r of CHANGELOG) {
    for (const l of r.lines) {
      assert.ok(!banned.test(l), `${r.id} hardcodes a tier number: "${l}"`);
    }
  }
});
