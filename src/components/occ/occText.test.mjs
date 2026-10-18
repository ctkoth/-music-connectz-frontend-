import { test } from "node:test";
import assert from "node:assert/strict";
import { linkify, parseReply, safeHref } from "./occText.js";

test("a markdown link becomes a link", () => {
  assert.deepEqual(linkify("see [Sweetwater](https://www.sweetwater.com) for gear"), [
    { text: "see " }, { label: "Sweetwater", href: "https://www.sweetwater.com/" }, { text: " for gear" },
  ]);
});

test("only http(s) is ever linked — a reply cannot carry javascript: onto the page", () => {
  for (const bad of ["javascript:alert(1)", "data:text/html,<script>1</script>", "vbscript:x", "file:///etc/passwd", "//evil.example"]) {
    const parts = linkify(`[click](${bad})`);
    assert.ok(parts.every((p) => !p.href), bad);
    assert.equal(parts.map((p) => p.text ?? "").join(""), `[click](${bad})`, "stays as the text it was written as");
  }
  assert.equal(safeHref("JaVaScRiPt:alert(1)"), "");
  assert.equal(safeHref("not a url"), "");
});

test("html in a reply stays a string — nothing here produces markup", () => {
  const parts = linkify("<img src=x onerror=alert(1)> and <b>bold</b>");
  assert.deepEqual(parts, [{ text: "<img src=x onerror=alert(1)> and <b>bold</b>" }]);
});

test("text with no link is one part; an empty line is one empty part", () => {
  assert.deepEqual(linkify("plain"), [{ text: "plain" }]);
  assert.deepEqual(linkify(""), [{ text: "" }]);
});

test("two links on one line both come through", () => {
  const parts = linkify("[a](https://a.example) and [b](http://b.example)");
  assert.equal(parts.filter((p) => p.href).length, 2);
});

test("the '#1 …' options the voice promises are noticed, one character each", () => {
  const lines = parseReply("Pick one:\n#1 Keep the hook\n#A Cut the bridge\n#10 not an option\nthanks");
  assert.deepEqual(lines.map((l) => l.choice), [null, "1", "A", null, null]);
  assert.equal(lines[1].parts[0].text, "Keep the hook");
});

test("a heading that merely starts with # is not an option", () => {
  assert.equal(parseReply("# A heading")[0].choice, null);
  assert.equal(parseReply("#hashtag")[0].choice, null);
});

test("blank lines survive so paragraphs do", () => {
  assert.equal(parseReply("a\n\nb").length, 3);
});

test("a choice line keeps its links", () => {
  const [l] = parseReply("#2 Read [the docs](https://example.com/docs)");
  assert.equal(l.choice, "2");
  assert.ok(l.parts.some((p) => p.href));
});
