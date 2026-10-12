import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MOUNTED, OCC_ANCHORS, doorsFor, gridTabs } from "./occRoutes.js";

const ROOT = new URL("../../../", import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, "utf8");

// The keys App.jsx really mounts: every `key: "…"` of an entry in TABS.
const appSrc = read("src/App.jsx");
const tabsBlock = appSrc.slice(appSrc.indexOf("const TABS = ["));
const REAL = new Set([...tabsBlock.slice(0, tabsBlock.indexOf("\n];")).matchAll(/\{\s*key:\s*"([a-z0-9_]+)"/g)].map((m) => m[1]));

test("the parse of App.jsx found the tabs (so the checks below mean something)", () => {
  assert.ok(REAL.size > 40, `found ${REAL.size}`);
  for (const k of ["occ", "postz", "collabz", "sentenceconnectz", "journalz"]) assert.ok(REAL.has(k), k);
});

test("every tab OCC may open is a tab App.jsx mounts", () => {
  for (const k of MOUNTED) assert.ok(REAL.has(k), `${k} is not in App.jsx TABS — a door to it is a dead button`);
});

test("the tabs the server used to name that never existed are not claimed", () => {
  for (const k of ["imagez", "writez", "modelz", "social-compose"]) {
    assert.ok(!MOUNTED.has(k), k);
    assert.ok(!REAL.has(k), k);
  }
});

test("every OCC anchor is really on OCC's screen", () => {
  const src = read("src/apps/OCC.jsx") + read("src/components/occ/OccChat.jsx");
  for (const a of OCC_ANCHORS) assert.match(src, new RegExp(`data-tour="${a}"`), a);
});

test("WorkZ doors: only mounted tabs survive, whatever the payload says", () => {
  const sendTo = [
    { key: "postz", tab: "postz" }, { key: "imagez", tab: "imagez" },
    { key: "writez", tab: "writez" }, { key: "x", tab: "sentenceconnectz" },
    null, { key: "no-tab" },
  ];
  assert.deepEqual(doorsFor(sendTo).map((t) => t.key), ["postz", "x"]);
  assert.deepEqual(doorsFor(undefined), []);
});

test("inside a shell there are no outward doors at all", () => {
  assert.deepEqual(doorsFor([{ key: "postz", tab: "postz" }, { key: "x", tab: "sentenceconnectz" }], { inShell: true }), []);
});

test("the tab grid draws built tabs with a mounted door, and nothing in a shell", () => {
  const tabs = [
    { key: "taskz", built: true, open_in: "occ" }, { key: "editor", built: false },
    { key: "callz", built: true, open_in: "callz" }, { key: "ghost", built: true, open_in: "imagez" },
    { key: "nodoor", built: true },
  ];
  assert.deepEqual(gridTabs(tabs).map((t) => t.key), ["taskz", "callz"]);
  assert.deepEqual(gridTabs(tabs, { inShell: true }), []);
  // A tab with no screen is never drawn — no "Not built yet" card with no button.
  assert.ok(!gridTabs(tabs).some((t) => t.key === "editor"));
  assert.deepEqual(gridTabs(undefined), []);
});
