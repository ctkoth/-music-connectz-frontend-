import test from "node:test";
import assert from "node:assert/strict";
import { labelFor, moveRow, normalizeUrl, pasteSummary, parsePasted, planAdd } from "./portfolio.js";

test("a bare domain gets the scheme people leave off", () => {
  assert.equal(normalizeUrl("example.com/me"), "https://example.com/me");
  assert.equal(normalizeUrl("  https://a.b/c "), "https://a.b/c");
  assert.equal(normalizeUrl("mailto:me@x.com"), "mailto:me@x.com");
  assert.equal(normalizeUrl("   "), "");
});

test("the label guess is the host without www", () => {
  assert.equal(labelFor("https://www.youtube.com/watch?v=1"), "youtube.com");
  assert.equal(labelFor("nonsense"), "nonsense");
});

test("pasted lines become rows; 'Label | url' keeps the label; junk is reported, not dropped silently", () => {
  const { rows, invalid } = parsePasted(`
    youtube.com/watch?v=1
    My EP | https://open.spotify.com/album/2

    javascript:alert(1)
    just words
    mailto:me@example.com
  `);
  assert.deepEqual(rows.map((r) => r.url), ["https://youtube.com/watch?v=1", "https://open.spotify.com/album/2", "mailto:me@example.com"]);
  assert.equal(rows[1].label, "My EP");
  assert.equal(rows[0].label, "youtube.com");
  assert.deepEqual(invalid, ["javascript:alert(1)", "just words"]);
});

test("the ceiling keeps the first links pasted and says how many it left out", () => {
  const existing = [{ label: "a", url: "https://a.com/" }];
  const incoming = ["b", "c", "d", "e"].map((x) => ({ label: x, url: `https://${x}.com` }));
  const plan = planAdd(existing, incoming, 3);
  assert.deepEqual(plan.added.map((r) => r.label), ["b", "c"]);
  assert.deepEqual(plan.overLimit.map((r) => r.label), ["d", "e"]);
  assert.equal(plan.rows.length, 3);
});

test("a duplicate is not a second row, whatever the trailing slash or case", () => {
  const existing = [{ label: "a", url: "https://A.com/" }];
  const plan = planAdd(existing, [{ label: "x", url: "https://a.com" }, { label: "y", url: "https://new.com" }, { label: "z", url: "https://new.com/" }], 10);
  assert.equal(plan.added.length, 1);
  assert.equal(plan.duplicates.length, 2);
});

test("somebody already over the ceiling can add nothing and loses nothing", () => {
  const existing = Array.from({ length: 30 }, (_, i) => ({ label: String(i), url: `https://x.com/${i}` }));
  const plan = planAdd(existing, [{ label: "n", url: "https://new.com" }], 25);
  assert.equal(plan.added.length, 0);
  assert.equal(plan.overLimit.length, 1);
  assert.equal(plan.rows.length, 30);
});

test("the summary names everything that did not go in", () => {
  const s = pasteSummary({ added: [1, 2], duplicates: [1], overLimit: [1, 2, 3] }, ["x"], 25);
  assert.match(s, /2 added/);
  assert.match(s, /1 already on your list/);
  assert.match(s, /1 not a link/);
  assert.match(s, /3 left out — your list holds 25/);
  assert.equal(pasteSummary({ added: [1], duplicates: [], overLimit: [] }, [], 25), "1 added");
});

test("a moveRow off either end is no moveRow", () => {
  assert.deepEqual(moveRow([1, 2, 3], 0, -1), [1, 2, 3]);
  assert.deepEqual(moveRow([1, 2, 3], 2, 1), [1, 2, 3]);
  assert.deepEqual(moveRow([1, 2, 3], 1, -1), [2, 1, 3]);
});
