// A <select> with nothing saying what it chooses is a control a member (and a
// screen reader) has to guess at. This counts the ones in src/apps and
// src/components that carry no aria-label / aria-labelledby / title / id, and
// are not inside a <label>.
//
// It is a RATCHET: the count recorded below is today's, the test fails only if
// it goes UP, and whoever labels one lowers the number. A new unlabeled select
// is the only thing that turns it red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL(".", import.meta.url).pathname;
const KNOWN_OFFENDERS = 34; // lower this when you label one

function offenders() {
  const found = [];
  for (const dir of ["apps", "components"]) {
    for (const f of readdirSync(join(SRC, dir)).filter((n) => n.endsWith(".jsx"))) {
      const text = readFileSync(join(SRC, dir, f), "utf8");
      const re = /<select\b/g;
      let m;
      while ((m = re.exec(text))) {
        // The opening tag runs to the first ">" that is not an arrow "=>".
        const rest = text.slice(m.index);
        const end = rest.search(/[^=]>/);
        const tag = rest.slice(0, end < 0 ? 400 : end + 2);
        if (/\b(aria-label|aria-labelledby|title|id)\s*=/.test(tag)) continue;
        // Inside an unclosed <label>?
        const before = text.slice(Math.max(0, m.index - 600), m.index);
        const lastOpen = before.lastIndexOf("<label");
        if (lastOpen >= 0 && before.indexOf("</label>", lastOpen) < 0) continue;
        const line = text.slice(0, m.index).split("\n").length;
        found.push(`${dir}/${f}:${line}`);
      }
    }
  }
  return found;
}

test("no new <select> without a label (ratchet)", () => {
  const list = offenders();
  assert.ok(
    list.length <= KNOWN_OFFENDERS,
    `${list.length} unlabeled <select>s, was ${KNOWN_OFFENDERS}. Add an aria-label or wrap it in a <label>:\n${list.join("\n")}`,
  );
});
