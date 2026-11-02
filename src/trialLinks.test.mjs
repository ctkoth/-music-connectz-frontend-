// The tab address of every trial opens the trial. This pins the decision in trialLinks.js and, more
// importantly, that every client-only tool it sends somebody to is a real public route in App.jsx
// (a redirect to a path nothing serves would land a visitor on "/", which is the failure this exists
// to prevent).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PUBLIC_TOOL_PATHS, TRIAL_DOOR_FALLBACK, needsDoorList, trialPathFor } from "./trialLinks.js";

test("a scored coach in the server's list opens its trial, query string intact", () => {
  assert.equal(trialPathFor("rapz", ["singz", "rapz"], "?src=reddit&ref=ctkoth", "#x"), "/try/rapz?src=reddit&ref=ctkoth#x");
  assert.equal(trialPathFor("guitarz", ["guitarz"]), "/try/guitarz");
});

test("a coach the server does not list, and tabs with no trial, fall through to /login", () => {
  assert.equal(trialPathFor("flutez", ["singz", "rapz"]), "");
  assert.equal(trialPathFor("postz", ["singz", "rapz"]), "");
  assert.equal(trialPathFor("rapz", null), "");
});

test("the fallback keeps the two doors that have always existed", () => {
  assert.deepEqual(TRIAL_DOOR_FALLBACK, ["singz", "rapz"]);
  assert.equal(trialPathFor("rapz", TRIAL_DOOR_FALLBACK), "/try/rapz");
});

test("BodieZ has its own trial and needs no server list", () => {
  assert.equal(trialPathFor("bodiez", null, "?src=ad"), "/try/bodiez?src=ad");
});

test("client-only tools resolve with no server answer at all", () => {
  for (const [key, path] of Object.entries(PUBLIC_TOOL_PATHS)) {
    assert.equal(needsDoorList(key), false);
    assert.equal(trialPathFor(key, null, "?src=x"), `${path}?src=x`);
  }
  assert.equal(needsDoorList("rapz"), true);
});

test("every tool path is a public route in App.jsx and every tool key is a tab", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  for (const [key, path] of Object.entries(PUBLIC_TOOL_PATHS)) {
    assert.ok(app.includes(`path="${path}"`), `${path} is not a <Route> in App.jsx`);
    assert.ok(app.includes(`{ key: "${key}",`), `${key} is not a tab`);
  }
});

test("the redirect never lands on a trial route App.jsx does not serve", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.ok(app.includes('path="/try/:appKey"') && app.includes('path="/try/bodiez"'));
});
