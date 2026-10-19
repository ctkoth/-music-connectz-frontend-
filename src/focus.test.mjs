// Every focus app has to be a real tab. A key that isn't one renders a tile on
// the member home screen that goes nowhere — the dead-button class of bug this
// repo has shipped before (see imports.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOCUS_COACHES, FOCUS_SUPPORT, inFocus } from "./focus.js";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const start = app.indexOf("const TABS = [");
const tabs = new Set([...app.slice(start, app.indexOf("\n];", start)).matchAll(/key: "([a-z_]+)"/g)].map((m) => m[1]));

test("every focus app is a real tab", () => {
  for (const k of [...FOCUS_COACHES, ...FOCUS_SUPPORT]) assert.ok(tabs.has(k), `${k} is not a tab`);
});

test("focus keeps the coaches and BodieZ, and hides the empty rooms", () => {
  for (const k of FOCUS_COACHES) assert.ok(inFocus(k));
  assert.ok(inFocus("bodiez"));
  for (const k of ["collabz", "venuez", "merchz", "labelz", "distributez"]) assert.ok(!inFocus(k), k);
});
