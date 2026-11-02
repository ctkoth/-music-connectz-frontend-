import { test } from "node:test";
import assert from "node:assert/strict";
import { rankApps, carries, bump, searchApps } from "./sendto.js";

const TABS = [
  { key: "toolz", label: "Music ConnectZ" }, { key: "postz", label: "PostZ" },
  { key: "rapz", label: "RapZ" }, { key: "bodiez", label: "BodieZ" },
  { key: "videoconnectz", label: "VideoConnectZ" }, { key: "zodiacz", label: "ZodiacZ" },
];

test("every app is listed except the home menu and the one you came from", () => {
  const keys = rankApps(TABS, { from: "rapz", sort: "az" }).map((r) => r.key);
  assert.deepEqual(keys, ["bodiez", "postz", "videoconnectz", "zodiacz"]);
});

test("best fit puts the apps that use this kind first, then A-Z", () => {
  const keys = rankApps(TABS, { kind: "take", item: { post_id: 3 } }).map((r) => r.key);
  assert.deepEqual(keys.slice(0, 3), ["rapz", "postz", "videoconnectz"]);
  assert.deepEqual(keys.slice(3), ["bodiez", "zodiacz"]);
});

test("last used and most used read the device's usage, ties A-Z", () => {
  let u = {};
  u = bump(u, "zodiacz", 10); u = bump(u, "postz", 20); u = bump(u, "zodiacz", 5);
  assert.equal(rankApps(TABS, { sort: "last", usage: u })[0].key, "postz");
  assert.equal(rankApps(TABS, { sort: "most", usage: u })[0].key, "zodiacz");
});

test("carries is only true when the app reads a field the item has", () => {
  assert.equal(carries("rapz", { post_id: 1 }), true);
  assert.equal(carries("rapz", { title: "x" }), false);
  assert.equal(carries("bodiez", { post_id: 1 }), false);
});

test("search narrows by label or key", () => {
  assert.deepEqual(searchApps(rankApps(TABS, { sort: "az" }), "vid").map((r) => r.key), ["videoconnectz"]);
});
