// The display language: numbers never make a new string, and a bad translation never reaches the screen.
import test from "node:test";
import assert from "node:assert/strict";
import { addToCache, cleanChoice, fromTemplate, langMatches, splitSpace, toTemplate, worth } from "./uiLang.js";

test("only strings with words in them are worth sending", () => {
  for (const s of ["Save routine", "OK", "Guardar", "保存する"]) assert.ok(worth(s), s);
  for (const s of ["", " ", "7", "$4.00", "🎤", "x", "1:05", "a".repeat(300)]) assert.ok(!worth(s), s);
});

test("a sentence with numbers is one template whatever the numbers are", () => {
  assert.equal(toTemplate("12 plays").template, toTemplate("13 plays").template);
  const t = toTemplate("Done 38% of the plan — 3 of 8 sets in 1:05");
  assert.equal(t.template, "Done {0}% of the plan — {1} of {2} sets in {3}");
  assert.deepEqual(t.nums, ["38", "3", "8", "1:05"]);
  assert.deepEqual(toTemplate("$1,250.50 saved").nums, ["1,250.50"]);
});

test("numbers go back where the translation put them, in any order", () => {
  assert.equal(fromTemplate("{1} de {0}", ["3", "8"]), "8 de 3");
  assert.equal(fromTemplate("Guardar", []), "Guardar");
});

test("a translation that lost or invented a number is refused", () => {
  assert.equal(fromTemplate("reproducciones", ["12"]), null);
  assert.equal(fromTemplate("{0} y {1}", ["12"]), null);
});

test("the space around a string survives", () => {
  assert.deepEqual(splitSpace("  Save \n"), { lead: "  ", core: "Save", tail: " \n" });
  assert.deepEqual(splitSpace("Save"), { lead: "", core: "Save", tail: "" });
});

test("the cache merges per language and never touches another", () => {
  const c = addToCache({ fr: { Play: "Lire" } }, "es", { Play: "Reproducir" });
  assert.deepEqual(c, { fr: { Play: "Lire" }, es: { Play: "Reproducir" } });
  assert.equal(addToCache(c, "es", { Stop: "Parar" }).es.Play, "Reproducir");
});

test("a stored choice is cleaned, and English is no choice", () => {
  assert.equal(cleanChoice(null), null);
  assert.equal(cleanChoice({ code: "en" }), null);
  assert.equal(cleanChoice("es"), null);
  assert.deepEqual(cleanChoice({ code: "ar", own: "العربية", flag: "🇸🇦", rtl: 1 }), { code: "ar", own: "العربية", flag: "🇸🇦", rtl: true });
});

test("the picker's search reads either name or the code", () => {
  const es = { code: "es", name: "Spanish", own: "Español" };
  for (const q of ["", "span", "ESPA", "es"]) assert.ok(langMatches(es, q), q);
  assert.ok(!langMatches(es, "german"));
});
