import test from "node:test";
import assert from "node:assert/strict";
import { doorForSkill, postCoachApp } from "./trialSkill.js";

const doors = [{ app_key: "singz" }, { app_key: "rapz" }, { app_key: "guitarz" }, { app_key: "drumz" }];

test("a skill name finds its door however it is spelled", () => {
  for (const n of ["Guitar", "guitar", "GuitarZ", " guitarz "]) assert.equal(doorForSkill(n, doors), "guitarz");
});
test("the first skill that has a door wins; none means no door", () => {
  assert.equal(doorForSkill(["Mixing", "Drum", "Guitar"], doors), "drumz");
  assert.equal(doorForSkill("Mixing", doors), "");
  assert.equal(doorForSkill("Guitar", null), "");
  assert.equal(doorForSkill("", doors), "");
});
test("a post names the coach that read it, or nothing", () => {
  assert.equal(postCoachApp({ coach: { app_key: "RapZ" } }), "rapz");
  assert.equal(postCoachApp({ coach: { state: "shown", read: { app_key: "drumz" } } }), "drumz");
  assert.equal(postCoachApp({ coach: { state: "none" } }), "");
  assert.equal(postCoachApp(null), "");
});
