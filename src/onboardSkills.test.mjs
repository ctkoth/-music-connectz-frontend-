import { test } from "node:test";
import assert from "node:assert/strict";
import { personaSkillRows, skillsStepDone, personasWithoutSkills } from "./onboardSkills.js";

const mix = { key: "mixengineer", name: "Mix / Master Engineer", skills: [{ name: "protools" }, { name: "ableton" }] };
const art = { key: "indieartist", name: "Independent Artist", skills: [] };

test("one row per persona, with how many skills sit under it", () => {
  const rows = personaSkillRows([mix, art]);
  assert.deepEqual(rows.map((r) => [r.key, r.count]), [["mixengineer", 2], ["indieartist", 0]]);
  assert.match(rows[0].label, /Mix/);
});

test("the step is done once any persona has a skill, not only when all do", () => {
  assert.equal(skillsStepDone([mix, art]), true);
  assert.equal(skillsStepDone([art]), false);
  assert.equal(skillsStepDone([]), false);
  assert.equal(skillsStepDone(undefined), false);
});

test("the nudge lists only the personas with nothing yet", () => {
  assert.deepEqual(personasWithoutSkills([mix, art]).map((r) => r.key), ["indieartist"]);
});

test("a persona saved as a bare string is a persona with no skills, not a crash", () => {
  assert.deepEqual(personaSkillRows(["producer"]).map((r) => [r.key, r.count]), [["producer", 0]]);
});
