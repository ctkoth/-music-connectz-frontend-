import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_MAX, frecency, hasOwnApps, rankApps, withSeeds } from "./yourApps.js";

const now = Date.UTC(2026, 9, 29);
const DAY = 86400000;

test("pins lead, in the member's order, then their own apps by use", () => {
  const usage = { singz: 9, postz: 4, rapz: 2, bodiez: 1 };
  assert.deepEqual(rankApps({ usage, pins: ["lilith", "rapz"], now }), ["lilith", "rapz", "singz", "postz"]);
});

test("one visit is not yours yet", () => {
  assert.deepEqual(rankApps({ usage: { bodiez: 1 }, now }), []);
});

test("an app you stopped using fades behind one you use now", () => {
  const usage = { singz: 20, rapz: 6 };
  const last = { singz: now - 60 * DAY, rapz: now - DAY };
  assert.deepEqual(rankApps({ usage, last, now }), ["rapz", "singz"]);
  assert.ok(frecency("singz", usage, last, now) < 20 / 8);       // four half-lives later
});

test("the home screen and anything excluded never appear, and only real tabs do", () => {
  const usage = { toolz: 50, gone: 9, postz: 3 };
  assert.deepEqual(rankApps({ usage, now, exclude: ["toolz"], valid: new Set(["postz"]) }), ["postz"]);
});

test("the home leads with your apps only once there are three of them", () => {
  assert.equal(hasOwnApps({ usage: { singz: 3, postz: 2 }, now }), false);
  assert.equal(hasOwnApps({ usage: { singz: 3, postz: 2, rapz: 2 }, now }), true);
});

test("a new member's seeds are their first apps, and real use pushes them down", () => {
  assert.deepEqual(rankApps({ seeds: ["drumz", "battlez"], now }), ["drumz", "battlez"]);
  assert.deepEqual(rankApps({ usage: { postz: 3 }, seeds: ["drumz"], now }), ["postz", "drumz"]);
  assert.equal(hasOwnApps({ seeds: ["a", "b", "c"], now }), false);   // seeds are not use
});

test("seeding moves a repeat to the front and stays short", () => {
  assert.deepEqual(withSeeds(["singz", "postz"], ["postz"]), ["postz", "singz"]);
  assert.equal(withSeeds([], ["a", "b", "c", "d", "e", "f", "g"]).length, SEED_MAX);
});
