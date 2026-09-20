// The icon registry must not name a file that isn't committed.
//
// `IconImg` falls back to the MCZ logo when an icon 404s. That is the right
// behaviour — a broken-image glyph in a tab strip is worse than a logo — and
// it is exactly why this rots silently: a tile that looks like the logo looks
// deliberate, so nobody reports it. CLAUDE.md already records one instance
// (`soundcloudengagementz.png` pointing at an SVG that was never drawn). An
// audit found fourteen.
//
// Nine of those name artwork that EXISTS on Corey's machine and has never been
// committed, which is its own lesson: the registry is in git and the art is
// not, so a name can be added from a folder listing and be wrong the moment it
// leaves that laptop.
//
// So the missing ones are listed here, once, with why. Adding to `OWED` is a
// deliberate act with a reason attached; forgetting to is a failing test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const APP = readFileSync(join(ROOT, "src/App.jsx"), "utf8");

/** The registry, read out of App.jsx rather than imported — this file runs in
 *  plain node, and App.jsx is JSX. */
function registry() {
  const block = APP.match(/export const CUSTOM_ICONS = \{([\s\S]*?)\n\};/);
  assert.ok(block, "CUSTOM_ICONS not found in src/App.jsx");
  return Object.fromEntries([...block[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)]
    .map((m) => [m[1], m[2]]));
}

// Registry keys whose file is knowingly not in the repo, and why. Each renders
// the MCZ logo until the art lands. Keep the reason specific enough to act on.
const OWED = {
  // EMPTY, and the five that were here are the reason to read this note.
  //
  // coachz, personaz_coach, statsz, opportunitiez and partnerz all sat here as
  // "Corey has the art, commit it". Each rendered the MCZ logo in the meantime
  // — which is the failure this file exists for, because a tile that looks
  // like the logo looks deliberate and nobody reports it.
  //
  // They now point at generated neon icons (`<key>-neon.svg`) built from
  // glyphs in tools/make-neon-icons.mjs, in the same chassis as every other
  // icon in the set. So the debt changed shape: nothing falls back to the logo
  // any more, and what is still owed is bespoke art REPLACING a stand-in,
  // which is a preference rather than a defect.
  //
  // To swap one back: drop the file in public/icons/ (lowercase, no spaces)
  // and point its CUSTOM_ICONS line at it instead of the -neon.svg.
  //
  // Eight keys before that were deleted rather than drawn — characterz, codez,
  // console, editor, mistakez, search, taskz, welcome. No tab, component or
  // screen ever asked for one, so they were registry entries for icons nothing
  // could render. `git show 2217037` has the glyphs if a screen ever arrives.
};


// Keys deliberately pointing at a generated `-neon.svg` because the real
// artwork is not committed yet. Distinct from OWED: these render something
// meaningful rather than the MCZ logo, so they are not broken — but the art
// is still owed, and without a list saying so a placeholder quietly becomes
// the permanent answer.
//
// NOT exhaustive, deliberately: other keys sit on a `-neon.svg` because that
// glyph IS the icon (postz, funnelz, soundcloudengagementz), and calling
// those a debt would invent one. `node tools/icon-audit.mjs` prints every key
// on an SVG; this lists the ones somebody is waiting on art for.
const PLACEHOLDER = {
  "chordz.jpg": "have: chordz.jpg on Corey's machine — commit it and point the path back",
  "journalz.jpg": "have: journalz.jpg on Corey's machine — commit it and point the path back",
  "metz.jpg": "metz.jpg is committed but measured illegible at 28-36px (busy neon-sign frame + text banner) — a simplified illustration is owed",
  "tunerz.jpg": "tunerz.jpg is committed but measured illegible at 28-36px (busy neon-sign frame + text banner) — a simplified illustration is owed",
};

const fileFor = (url) => join(ROOT, "public", url.replace(/^\//, ""));

test("every registered icon is a file that is actually committed", () => {
  const missing = Object.entries(registry())
    .filter(([key, url]) => !OWED[key] && !existsSync(fileFor(url)))
    .map(([key, url]) => `${key} -> ${url}`);
  assert.deepEqual(missing, [],
    `\nThese render the MCZ logo and nothing says so:\n  ${missing.join("\n  ")}\n`
    + "Commit the art, or add the key to OWED in this file with a reason.\n");
});

test("a placeholder is a real committed file, and says it is a placeholder", () => {
  // Both halves matter. A PLACEHOLDER entry pointing at nothing is an OWED
  // entry wearing a better name and still renders the logo; and one pointing
  // at ordinary artwork is no longer a placeholder, so it should be neither
  // listed here nor treated as a debt.
  const reg = registry();
  const wrong = Object.keys(PLACEHOLDER).map((key) => {
    const url = reg[key];
    if (!url) return `${key}: not in the registry at all`;
    if (!existsSync(fileFor(url))) return `${key} -> ${url}: the placeholder itself is missing`;
    if (!url.endsWith("-neon.svg")) return `${key} -> ${url}: real art, so drop it from PLACEHOLDER`;
    return null;
  }).filter(Boolean);
  assert.deepEqual(wrong, [], `\n  ${wrong.join("\n  ")}\n`);
});

test("nothing is both owed and placeheld", () => {
  const both = Object.keys(OWED).filter((k) => k in PLACEHOLDER);
  assert.deepEqual(both, [], `a key cannot be in both lists: ${both}`);
});

test("the owed list cannot outlive the fix", () => {
  // A "known missing" list nobody re-checks sends the next reader to fix
  // something twice — the backend's CLAUDE.md says this about a violation
  // note that outlived its fix by weeks. So a key here whose art HAS landed
  // fails, rather than quietly staying on the list.
  const reg = registry();
  const fixed = Object.keys(OWED)
    .filter((key) => reg[key] && existsSync(fileFor(reg[key])));
  assert.deepEqual(fixed, [],
    `\nThe art landed for these — delete them from OWED:\n  ${fixed.join("\n  ")}\n`);
});

test("every owed key is still in the registry", () => {
  // The other way the list rots: a key gets renamed or dropped and its OWED
  // entry stays, describing a debt that no longer exists.
  const reg = registry();
  const stale = Object.keys(OWED).filter((key) => !(key in reg));
  assert.deepEqual(stale, [], `OWED names keys the registry no longer has: ${stale}`);
});

test("no registered path has a capital or a space", () => {
  // Vercel and Cloudflare Pages serve case-sensitively; Windows does not. A
  // path that works on the machine the art was drawn on and 404s in
  // production is the worst version of this bug, because the fallback hides
  // it there too. Spaces are the same story via encoding.
  const bad = Object.entries(registry())
    .filter(([, url]) => url !== url.toLowerCase() || url.includes(" "))
    .map(([key, url]) => `${key} -> ${url}`);
  assert.deepEqual(bad, [], `\nLowercase, no spaces:\n  ${bad.join("\n  ")}\n`);
});

test("every icon name a component asks for is in the registry", () => {
  // `IconImg` takes a registry KEY. A name that isn't one falls back to the
  // logo just like a missing file does, and looks just as deliberate.
  const reg = registry();
  const asked = new Set([...APP.matchAll(/icon:\s*"([^"]+)"/g)].map((m) => m[1]));
  const unknown = [...asked].filter((name) => !(name in reg));
  assert.deepEqual(unknown, [], `Tab icons with no registry entry: ${unknown}`);
});
