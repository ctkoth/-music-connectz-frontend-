import test from "node:test";
import assert from "node:assert/strict";
import { blankForm, countAgainst, dialOption, formProblems, fromVoice, surfaceResult, toBody, toList } from "./voicez.js";

const DIALS = [{ key: "humour", default: "none", options: [{ key: "none", result: "No jokes." }, { key: "dry", result: "Deadpan." }] },
               { key: "contractions", default: true, options: [{ key: true, result: "Don't" }] }];

test("counts against the served cap", () => {
  assert.equal(countAgainst("abc", 5).label, "3 / 5");
  assert.equal(countAgainst("abcdef", 5).over, true);
});
test("lists are trimmed and de-duplicated", () => {
  assert.deepEqual(toList("a, B\n b ,, c"), ["a", "B", "c"]);
});
test("problems use the server's caps, never typed ones", () => {
  assert.deepEqual(formProblems({ name: "x", bio: "", sample: "" }, { name: 10 }), []);
  assert.equal(formProblems({ name: "", bio: "" }, {}).length, 1);
  assert.match(formProblems({ name: "x", bio: "yyyy" }, { bio: 3 })[0], /over 3/);
  assert.match(formProblems({ name: "x", phrases: "a,b,c" }, { phrases: 2 })[0], /up to 2/);
});
test("dial lookups and defaults", () => {
  assert.equal(dialOption(DIALS, "humour", "dry").result, "Deadpan.");
  assert.equal(dialOption(DIALS, "nope", "x"), null);
  assert.deepEqual(blankForm(DIALS).spec, { humour: "none", contractions: true });
});
test("surface result sentence comes from the server's options", () => {
  const s = { options: [{ choice: "preset:corey", result: "R" }] };
  assert.equal(surfaceResult(s, "preset:corey"), "R");
  assert.equal(surfaceResult(s, "custom:1"), "");
  assert.equal(surfaceResult(null, "x"), "");
});
test("form round-trips through the body", () => {
  const f = { ...blankForm(DIALS), name: " Owl ", phrases: "right then", avoid: "synergy" };
  const b = toBody(f);
  assert.equal(b.name, "Owl");
  assert.deepEqual(b.spec.signature_phrases, ["right then"]);
  const back = fromVoice({ name: "Owl", bio: "", sample: "", spec: b.spec });
  assert.equal(back.phrases, "right then");
  assert.equal(back.spec.humour, "none");
});
