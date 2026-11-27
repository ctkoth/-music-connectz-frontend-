// A written piece as a document a member can print or save as PDF: the title, then the text as they wrote it, with line
// breaks kept (a lyric is its lines). Nothing is added: no branding, no footer, no account name.

export function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Paragraphs: blank lines separate them, and a single line break inside one is kept as a break. */
export function paragraphsHtml(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)
    .map((b) => b.replace(/^\n+|\n+$/g, ""))
    .filter((b) => b.trim())
    .map((b) => `<p>${b.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("\n");
}

export function pieceDocument({ title = "", text = "" } = {}) {
  const heading = String(title || "").trim() || "Untitled";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(heading)}</title>
<style>
@page { margin: 2.2cm; }
body { font-family: Georgia, "Times New Roman", serif; color: #111; background: #fff; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; font-size: 12pt; }
h1 { font-size: 20pt; margin: 0 0 1.2rem; font-weight: 700; }
p { margin: 0 0 1rem; }
@media print { body { margin: 0; padding: 0; max-width: none; } }
</style></head>
<body><h1>${escapeHtml(heading)}</h1>
${paragraphsHtml(text)}
</body></html>`;
}

/** Opens the piece in a new window and asks for the print dialog, where "Save as PDF" is one of the printers. Returns false
 *  when the browser blocked the window, so the caller can say so rather than do nothing. */
export function savePiecePdf({ title, text }) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(pieceDocument({ title, text }));
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* the window stays open: the member can print it from there */ } }, 250);
  return true;
}
