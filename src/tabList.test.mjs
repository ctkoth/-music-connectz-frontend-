// The Lilith tag picker offers only tabs the shell has. The list it reads is a
// copy of App.jsx's TABS array, because TABS is JSX and cannot be imported under
// plain node. This test is the guard that keeps the copy honest: a tab added to
// TABS and not to TAB_LIST fails here, and so does a stale entry left behind.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TAB_LIST, isTabKey, tabLabel } from "./tabList.js";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const start = app.indexOf("const TABS = [");
const end = app.indexOf("\n];", start);
const block = app.slice(start, end);
const fromApp = [...block.matchAll(/\{ key: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
const entryCount = (block.match(/\{ key:/g) || []).length;

test("every TABS entry in App.jsx is one this test can read", () => {
  assert.equal(
    fromApp.length,
    entryCount,
    "a TABS entry is not in the { key: \"…\", label: \"…\" } form this test reads; extend the pattern above, then regenerate with: node tools/gen-tablist.cjs src/App.jsx src/tabList.js",
  );
});

test("the picker's tab list is exactly App.jsx's TABS, in order", () => {
  assert.deepEqual(TAB_LIST.map((t) => [t.key, t.label]), fromApp);
});

test("tab keys are unique and look like keys", () => {
  const keys = TAB_LIST.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length, "duplicate tab key");
  for (const k of keys) assert.match(k, /^[a-z][a-z0-9_]*$/, `${k} is not a clean tab key`);
});

test("tabLabel and isTabKey answer for real tabs only", () => {
  assert.equal(tabLabel("postz"), "PostZ");
  assert.equal(isTabKey("postz"), true);
  assert.equal(tabLabel("nope"), null);
  assert.equal(isTabKey("nope"), false);
  // A Map lookup, so a prototype name is not a tab.
  assert.equal(tabLabel("__proto__"), null);
  assert.equal(isTabKey("constructor"), false);
});
