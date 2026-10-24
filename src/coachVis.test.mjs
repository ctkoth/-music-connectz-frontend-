// What a setting SAYS it does. The server decides who sees the read; these
// tests hold the sentences the member reads before choosing, because a control
// that names an option without its result is the thing Corey keeps finding.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NO_READ, POST_CHOICES, READ_CHOICES, REMOVE_RESULT, defaultTitle, dimensionRows,
  firstSentence, givenOn, memberSees, mmss, readChoiceLabel, readResult,
  shareTokenOf, sizeLabel, storageLine, strangerSees,
} from "./coachVis.js";

const POSTS = POST_CHOICES.map((c) => c.value);
const READS = READ_CHOICES.map((c) => c.value);

test("the three choices are the server's three values, in widening order", () => {
  assert.deepEqual(READS, ["", "members", "private"]);
  assert.deepEqual(READ_CHOICES.map((c) => c.label), ["Same as the post", "Members only", "Only me"]);
});

test("the post choices carry the explanations PostZ's own composer uses", () => {
  assert.equal(POST_CHOICES.find((c) => c.value === "restricted").tip, "Visible to members only");
  assert.equal(POST_CHOICES.find((c) => c.value === "private").tip, "Just you");
  assert.match(POST_CHOICES.find((c) => c.value === "public").tip, /\+25%/);
});

test("every choice, on every kind of post, says what happens — in words", () => {
  for (const p of POSTS) for (const c of READS) {
    const s = readResult(c, p);
    assert.ok(s.length > 30, `${p}/${c} is a sentence, not a label`);
    assert.ok(!s.includes("!"), "no exclamation marks");
    assert.ok(!/\bAI\b/.test(s), "the coach, never 'the AI'");
  }
});

test("the founder's wording for a public post, exactly", () => {
  assert.equal(readResult("", "public"),
    "Anyone with the link — including people from Reddit or TikTok who aren't members — sees your score and the coach's notes next to your song.");
  assert.equal(readResult("members", "public"),
    "Strangers hear your song and see a locked coach card; signed-in members see the score and notes.");
  assert.equal(readResult("private", "public"), "Only you see the read; the song is still posted.");
});

test("the same setting means different things on different posts", () => {
  assert.notEqual(readResult("", "public"), readResult("", "restricted"));
  assert.notEqual(readResult("", "restricted"), readResult("", "private"));
});

test("on a private post 'members only' is not a promise it cannot keep", () => {
  assert.match(readResult("members", "private"), /still can't open it/);
});

test("a junk post visibility is read as public rather than throwing", () => {
  assert.equal(readResult("", "nonsense"), readResult("", "public"));
});

test("the stranger line changes with the choices and never promises a number it does not have", () => {
  assert.match(strangerSees("public", "", 9), /9\/10 with the coach's notes/);
  assert.match(strangerSees("public", "", undefined), /the score and the coach's notes/);
  assert.doesNotMatch(strangerSees("public", "", undefined), /\d\/10/);
  assert.match(strangerSees("public", "members"), /locked coach card with a sign-up button/);
  assert.match(strangerSees("public", "members"), /shows no score/);
  assert.match(strangerSees("public", "private"), /no coach card at all/);
  assert.match(strangerSees("restricted", ""), /can't open this post/);
  assert.match(strangerSees("private", ""), /Nobody but you/);
  // A hidden read never leaks its number into the line.
  assert.doesNotMatch(strangerSees("public", "members", 9), /9\/10/);
  assert.doesNotMatch(strangerSees("public", "private", 9), /9\/10/);
});

test("the member line", () => {
  assert.match(memberSees("public", "members"), /sees the score/);
  assert.match(memberSees("public", "private"), /sees no coach card/);
  assert.match(memberSees("private", ""), /can't open/);
});

test("labels", () => {
  assert.equal(readChoiceLabel(""), "Same as the post");
  assert.equal(readChoiceLabel("members"), "Members only");
  assert.equal(readChoiceLabel("private"), "Only me");
  assert.equal(readChoiceLabel("weird"), "Same as the post");
  assert.ok(NO_READ && REMOVE_RESULT.includes("Nothing is charged"));
});

test("the share token is the tail of /s/<token>", () => {
  assert.equal(shareTokenOf("/s/AbC123_-xyZ"), "AbC123_-xyZ");
  assert.equal(shareTokenOf("https://musicconnectz.net/s/AbC123xyZ/?x=1"), "AbC123xyZ");
  assert.equal(shareTokenOf(""), "");
  assert.equal(shareTokenOf(null), "");
  assert.equal(shareTokenOf("/s/"), "");
});

test("first sentence", () => {
  assert.equal(firstSentence("The hook lands. The last phrase runs out of air."), "The hook lands.");
  assert.equal(firstSentence(""), "");
  const long = firstSentence("word ".repeat(80));
  assert.ok(long.length <= 141 && long.endsWith("…"));
});

test("a dimension with no label is dropped, never shown as a bare number", () => {
  const rows = dimensionRows({ scores: { pitch: 8, ghost: 3, tone: 7 }, labels: { pitch: "Pitch 🎯", tone: "Tone 🌈" } });
  assert.deepEqual(rows.map((r) => [r.key, r.label, r.value]), [["pitch", "Pitch 🎯", 8], ["tone", "Tone 🌈", 7]]);
  assert.deepEqual(dimensionRows({ scores: { a: 1 } }), []);
  assert.deepEqual(dimensionRows(null), []);
});

test("dates", () => {
  assert.equal(givenOn(""), "");
  assert.equal(givenOn("not a date"), "");
  assert.match(givenOn("2026-10-03T12:00:00+00:00"), /2026/);
});

test("a title comes from the take's own name, never a temp blob name", () => {
  assert.equal(defaultTitle({ takeName: "Night_Drive.webm" }), "Night Drive");
  assert.equal(defaultTitle({ takeName: "take.webm", genre: "Trap", label: "SingZ" }), "Trap · SingZ take");
  assert.equal(defaultTitle({ takeName: "audio-20261003.webm", label: "RapZ" }), "RapZ take");
  assert.equal(defaultTitle({}), "My take");
});

test("sizes and clocks", () => {
  assert.equal(sizeLabel(2 * 1024 * 1024), "2.0MB");
  assert.equal(sizeLabel(2048), "2KB");
  assert.equal(sizeLabel(12), "12B");
  assert.equal(mmss(75), "01:15");
  assert.equal(mmss(-3), "00:00");
});

test("storage: what the file uses is said, and what will not fit is refused up front", () => {
  const fits = storageLine({ fileBytes: 5 * 1024 * 1024, storageMb: 100, usedMb: 20, uploadMb: 50 });
  assert.equal(fits.fits, true);
  assert.equal(fits.cost, "5.0MB of your storage");
  assert.equal(fits.left, 80);

  const big = storageLine({ fileBytes: 60 * 1024 * 1024, storageMb: 500, usedMb: 0, uploadMb: 50 });
  assert.equal(big.fits, false);
  assert.match(big.refusal, /your tier allows 50MB per upload/);

  const full = storageLine({ fileBytes: 30 * 1024 * 1024, storageMb: 100, usedMb: 90, uploadMb: 50 });
  assert.equal(full.fits, false);
  assert.match(full.refusal, /10\.0MB left of your 100MB/);

  // Limits not loaded yet: refuse nothing. The server is the real gate.
  const unknown = storageLine({ fileBytes: 900 * 1024 * 1024 });
  assert.equal(unknown.fits, true);
  assert.equal(unknown.left, null);
});
