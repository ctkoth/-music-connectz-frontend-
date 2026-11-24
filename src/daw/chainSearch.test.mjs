import test from "node:test";
import assert from "node:assert/strict";
import { roleOfTrack, searchChains, suitsRole } from "./chainSearch.js";
import { STARTERS } from "./tonePresets.js";

test("an empty search returns every chain, none lost", () => {
  assert.equal(searchChains(STARTERS, "").length, STARTERS.length);
});

test("every word must match, in the name, the group or what it does", () => {
  const r = searchChains(STARTERS, "drum bus");
  assert.ok(r.length && r.every((s) => /drum/i.test(`${s.name} ${s.group} ${s.what}`) && /bus/i.test(`${s.name} ${s.group} ${s.what}`)));
  assert.ok(r.some((s) => s.key === "drum_bus"));
  assert.deepEqual(searchChains(STARTERS, "zzzznotachain"), []);
});

test("the chains that suit the track's role come first, and nothing is hidden", () => {
  const all = searchChains(STARTERS, "", "drums");
  assert.equal(all.length, STARTERS.length);
  const firstOther = all.findIndex((s) => !suitsRole(s, "drums"));
  assert.ok(firstOther > 0 && all.slice(0, firstOther).every((s) => s.group === "Drums"));
  assert.ok(all.slice(firstOther).every((s) => !suitsRole(s, "drums")));
});

test("a track's role is its own, else guessed from its name", () => {
  assert.equal(roleOfTrack({ name: "808 bass.wav" }), "bass");
  assert.equal(roleOfTrack({ name: "x.wav", role: "lead" }), "lead");
  assert.equal(roleOfTrack(null), "other");
});

test("a vocal track is offered voice and rap chains, and nothing suits an unknown role", () => {
  const top = searchChains(STARTERS, "", "lead")[0];
  assert.ok(suitsRole(top, "lead"));
  assert.ok(STARTERS.every((s) => !suitsRole(s, "other")));
});
