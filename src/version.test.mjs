import test from "node:test";
import assert from "node:assert/strict";
import { versionLabel, newerBuild } from "./version.js";

const run = { version: "0.59.0", build: null, commit: "a1b2c3d", built: "2026-10-12" };

test("the label names the commit, and the build number only when there is one", () => {
  assert.equal(versionLabel(run), "v0.59.0 · a1b2c3d");
  assert.equal(versionLabel({ ...run, build: 412 }), "v0.59.0 · build 412 · a1b2c3d");
  assert.equal(versionLabel({ version: "dev", commit: "dev" }), "dev build");
});

test("a different commit is a newer build, even with the same package version", () => {
  const remote = { ...run, commit: "9f8e7d6" };
  assert.deepEqual(newerBuild(run, remote), remote);
});

test("the same commit, a dev build, or anything that isn't a version document says nothing", () => {
  assert.equal(newerBuild(run, { ...run }), null);
  assert.equal(newerBuild({ commit: "dev" }, { ...run, commit: "9f8e7d6" }), null);
  assert.equal(newerBuild(run, null), null);
  assert.equal(newerBuild(run, "<!doctype html>"), null);
  assert.equal(newerBuild(run, { commit: "not-a-sha" }), null);
  assert.equal(newerBuild(run, { commit: "dev" }), null);
});
