import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, pieceDocument, paragraphsHtml } from "./pieceDocument.js";

test("text and titles are escaped, so a piece cannot put markup into its own document", () => {
  const doc = pieceDocument({ title: "<img src=x onerror=alert(1)>", text: "<script>steal()</script> & more" });
  assert.ok(!doc.includes("<script>steal"), "script from the text must not survive");
  assert.ok(!doc.includes("<img src=x"), "markup from the title must not survive");
  assert.match(doc, /&lt;script&gt;steal\(\)&lt;\/script&gt; &amp; more/);
  assert.equal(escapeHtml(`"'`), "&quot;&#39;");
});

test("blank lines make paragraphs and single line breaks are kept, so a lyric keeps its lines", () => {
  assert.equal(paragraphsHtml("line one\nline two\n\nverse two"), "<p>line one<br>line two</p>\n<p>verse two</p>");
  assert.equal(paragraphsHtml("a\r\nb\r\n\r\nc"), "<p>a<br>b</p>\n<p>c</p>");
  assert.equal(paragraphsHtml("   \n\n  "), "");
});

test("the document has a title, prints cleanly, and names nothing it was not given", () => {
  const doc = pieceDocument({ title: "Cover letter", text: "Dear team," });
  assert.match(doc, /<h1>Cover letter<\/h1>/);
  assert.match(doc, /<meta charset="utf-8">/);
  assert.match(doc, /@page/);
  assert.match(doc, /@media print/);
  assert.ok(!/<script|https?:\/\//i.test(doc), "no scripts or outside links");
});

test("a piece with no title is still titled", () => {
  assert.match(pieceDocument({ title: "   ", text: "x" }), /<h1>Untitled<\/h1>/);
});
