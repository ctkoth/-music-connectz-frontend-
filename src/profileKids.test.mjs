import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  KIDS, PARTNER_GENDERS, changedFields, fieldsOf, kidLine, same, saveState, unsavedKids, unsavedNames,
} from "./profileKids.js";
import { ENERGY } from "./resources.js";

const base = () => fieldsOf({
  bio: "hi", birthday: "1990-11-01", nats: ["Irish"], sel: [{ key: "rapper", name: "Rapper", skills: [] }],
  partners: ["male"], subs: { thc: "often" }, sober: false, languages: { en: "fluent" }, religion: "",
  personality: "", pf: { inventory: [{ name: "SM7B" }], genres: ["trap"], timezone: "UTC" },
});

test("an untouched profile has nothing unsaved", () => {
  assert.deepEqual(changedFields(base(), base()), []);
});

test("order of a picker's choices is not a change", () => {
  const a = { ...base(), partners: ["male", "female"] };
  const b = { ...base(), partners: ["female", "male"] };
  assert.deepEqual(changedFields(a, b), []);
});

test("order of an object's keys is not a change", () => {
  assert.ok(same({ thc: "often", alcohol: "rarely" }, { alcohol: "rarely", thc: "often" }));
});

test("order of the member's own ordered lists IS a change", () => {
  const a = { ...base(), "pf.inventory": [{ name: "A" }, { name: "B" }] };
  const b = { ...base(), "pf.inventory": [{ name: "B" }, { name: "A" }] };
  assert.deepEqual(changedFields(a, b), ["pf.inventory"]);
});

test("each child owns only its own fields", () => {
  const saved = base();
  const now = { ...saved, partners: ["male", "female"], languages: { en: "fluent", es: "beginner" } };
  const kids = unsavedKids(changedFields(saved, now));
  assert.deepEqual([...kids].sort(), ["languagez", "preferencez"]);
});

test("the inventory lives in the profile fields but belongs to InVenTorieZ", () => {
  const saved = base();
  const now = { ...saved, "pf.inventory": [...saved["pf.inventory"], { name: "Juno" }] };
  assert.ok(unsavedKids(changedFields(saved, now)).has("inventoriez"));
});

test("sober with nothing declared is not a change the server would ever see, until sober itself flips", () => {
  const s = { subs: {}, sober: false };
  const a = fieldsOf({ ...s, pf: {} });
  const b = fieldsOf({ subs: { thc: "often" }, sober: true, pf: {} });
  // `subs` is what is sent: sober sends {}, so only the sober flag moved.
  assert.deepEqual(changedFields(a, b), ["sober"]);
});

test("names: children first, once each, and the rest by what they are", () => {
  const saved = base();
  const now = { ...saved, bio: "new", partners: [], "pf.cover_url": "x", subs: {}, sober: true };
  const names = unsavedNames(changedFields(saved, now));
  assert.deepEqual(names.slice(0, 2), ["PreferenceZ", "SubstanceZ"]);
  assert.equal(names.filter((n) => n === "SubstanceZ").length, 1);
  assert.ok(names.includes("your bio") && names.includes("your cover"));
});

test("every field the save writes has a name, so nothing is saved unmentioned", () => {
  const owned = new Set(KIDS.flatMap((k) => k.fields));
  const src = readFileSync(new URL("./profileKids.js", import.meta.url), "utf8");
  for (const f of Object.keys(base())) {
    assert.ok(owned.has(f) || src.includes(`"${f}"`) || src.includes(`  ${f}:`) || src.includes(` ${f}:`),
      `${f} is saved but unnamed`);
  }
});

test("the save bar has three honest states", () => {
  assert.equal(saveState({ changed: [], busy: false, savedAt: null }).tone, "idle");
  const dirty = saveState({ changed: ["partners"], busy: false, savedAt: new Date() });
  assert.equal(dirty.tone, "dirty");
  assert.match(dirty.text, /PreferenceZ/);
  const done = saveState({ changed: [], busy: false, savedAt: new Date(2026, 10, 1, 14, 5) });
  assert.equal(done.tone, "saved");
  assert.match(done.text, /All changes saved/);
  assert.equal(saveState({ changed: ["bio"], busy: true, savedAt: null }).tone, "busy");
});

test("a long list of unsaved names is cut, and says how many were left out", () => {
  const all = ["partners", "subs", "languages", "religion", "birthday", "bio"];
  const s = saveState({ changed: all, busy: false, savedAt: null });
  assert.match(s.text, /\+\d+ more/);
});

test("a child says only what the member declared", () => {
  assert.equal(kidLine("preferencez", { partners: [] }), null);
  assert.equal(kidLine("preferencez", { partners: ["female", "nonbinary"] }), "Female, Non-binary");
  assert.equal(kidLine("substancez", { subs: {}, sober: false }), null);
  assert.equal(kidLine("substancez", { subs: { thc: "often", dxm: "rarely" } }), "2 declared");
  assert.equal(kidLine("substancez", { subs: {}, sober: true }), "Sober by choice");
  assert.equal(kidLine("languagez", { languages: { en: "fluent" } }), "1 language");
  assert.equal(kidLine("inventoriez", { inventory: [1, 2, 3] }), "3 pieces");
  assert.equal(kidLine("religionz", { religion: "" }), null);
});

test("the sign line needs a birthday, and never makes up a sign", () => {
  assert.equal(kidLine("zodiacz", { birthday: "" , zodiac: "Leo" }), null);
  assert.equal(kidLine("zodiacz", { birthday: "1990-11-01", zodiac: "Scorpio", zodiac_cn: { animal: "Horse" } }),
    "Scorpio · Year of the Horse");
  assert.match(kidLine("zodiacz", { birthday: "1990-11-01" }), /once you save/);
});

test("SocialZ reads the server's own numbers", () => {
  assert.equal(kidLine("socialz", { social: { counted: 2, reach: 12400, energy_per_hour: 1240 } }),
    `2 counted · reach ${(12400).toLocaleString()} · 1240 ${ENERGY}/hr`);
  assert.equal(kidLine("socialz", null), null);
});

test("the three genders PreferenceZ offers", () => {
  assert.deepEqual(PARTNER_GENDERS.map(([k]) => k), ["male", "female", "nonbinary"]);
});
