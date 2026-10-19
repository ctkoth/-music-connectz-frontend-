// A chat reply, made safe to render.
//
// The reply is text from a model, and the model is told (occ.COREY_VOICE) to put
// real Markdown links in it and to format multiple-choice options as "#1 …". So
// the screen needs to do two things with it and must do NOTHING else:
//
//   * turn `[label](https://…)` into a link — http(s) only, so a reply cannot
//     carry a `javascript:` URL onto the page;
//   * notice `#1 …` option lines, so the member can answer with the one
//     character the voice promised they could.
//
// Everything else stays a string that React renders as text. There is no HTML
// here and no dangerouslySetInnerHTML anywhere near it.
const LINK = /\[([^\]\n]{1,120})\]\((\S{1,500}?)\)/g;
const CHOICE = /^\s*#([0-9A-Za-z])\s+(.+)$/;

/** The URL if it is a plain http(s) one, else "". */
export function safeHref(raw) {
  try {
    const u = new URL(String(raw));
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

/** One line -> [{ text } | { label, href }]. */
export function linkify(line) {
  const parts = [];
  let last = 0;
  for (const m of String(line).matchAll(LINK)) {
    const href = safeHref(m[2]);
    if (!href) continue;                       // left as the text it was written as
    if (m.index > last) parts.push({ text: line.slice(last, m.index) });
    parts.push({ label: m[1], href });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts.length ? parts : [{ text: "" }];
}

/** A reply -> [{ choice: "1" | null, parts }] one per line, blank lines kept. */
export function parseReply(text) {
  return String(text ?? "").split("\n").map((raw) => {
    const m = raw.match(CHOICE);
    if (m) return { choice: m[1], parts: linkify(`${m[2]}`), raw };
    return { choice: null, parts: linkify(raw), raw };
  });
}
