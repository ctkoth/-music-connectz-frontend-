import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { heardFor, ratingText, ratingTone } from "./rating.js";

test("one set of thresholds", () => {
  assert.equal(ratingTone(8), "text-emerald-300");
  assert.equal(ratingTone(5), "text-mcz-gold");
  assert.equal(ratingTone(4.9), "text-mcz-ember");
  assert.equal(ratingTone(null), "text-white/30");
});

test("a rating is the number the member was shown, never a bare dash for a real score", () => {
  assert.equal(ratingText(6.2, 6), "6.2");
  assert.equal(ratingText(null, 6), "6");
  assert.equal(ratingText(6, 6), "6");
  assert.equal(ratingText(null, null), "—");
});

test("the detail beside a number is the most confident moment filed under it", () => {
  const heard = [{ dim: "timing", what: "maybe late", confidence: 1, t: "0:03" },
                 { dim: "timing", what: "drifts behind the beat", confidence: 3, t: "0:12" },
                 { dim: "flow", what: "locked", confidence: 2 }];
  assert.equal(heardFor(heard, "timing"), "0:12 · drifts behind the beat");
  assert.equal(heardFor(heard, "breath"), "");
});

// Enforcement: ratings are consistent, so no screen may bring its own colour
// thresholds or its own copy of the helpers. They come from rating.js.
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === "mcz2" || name === "node_modules") continue;
    if (statSync(p).isDirectory()) walk(p, out); else if (/\.jsx?$/.test(name)) out.push(p);
  }
  return out;
}

test("no screen defines its own rating colours or helpers", () => {
  const offenders = [];
  for (const f of walk("src")) {
    if (f.endsWith("rating.js") || f.endsWith(".test.mjs")) continue;
    const text = readFileSync(f, "utf8");
    if (/const\s+(scoreColor|tone|heardFor)\s*=/.test(text) || /\s>=\s*8\s*\?\s*"text-emerald-300"/.test(text)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], "Import ratingTone / heardFor from src/rating.js and draw ratings with components/Rating.jsx");
});
