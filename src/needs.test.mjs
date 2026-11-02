// A need that lists a key which is not a tab renders a button that goes nowhere.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NEEDS, appsFor } from "./needs.js";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const start = app.indexOf("const TABS = [");
const labels = Object.fromEntries([...app.slice(start, app.indexOf("\n];", start)).matchAll(/key: "([a-z_]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
const tabs = new Set([...app.slice(start, app.indexOf("\n];", start)).matchAll(/key: "([a-z_]+)"/g)].map((m) => m[1]));

test("every app a need names is a real tab", () => {
  for (const n of NEEDS) for (const a of n.apps) {
    assert.ok(tabs.has(a.key), `${n.key}: ${a.key} is not a tab`);
    assert.equal(a.label, labels[a.key], `${a.key} label drifted from the tab`);
  }
});

test("every need says what each app does for the member, with no repeats inside a need", () => {
  const keys = new Set();
  for (const n of NEEDS) {
    assert.ok(n.title && n.blurb && n.emoji, n.key);
    assert.ok(n.apps.length >= 2, `${n.key} has too few apps`);
    const seen = new Set();
    for (const a of n.apps) {
      assert.ok(a.why && a.why.length > 10, `${n.key}/${a.key} has no reason`);
      assert.ok(!seen.has(a.key), `${n.key} repeats ${a.key}`);
      seen.add(a.key);
    }
    assert.ok(!keys.has(n.key), `duplicate need ${n.key}`);
    keys.add(n.key);
  }
});

test("an unknown need has no apps rather than throwing", () => {
  assert.deepEqual(appsFor("nope"), []);
  assert.ok(appsFor("better").length > 0);
});
