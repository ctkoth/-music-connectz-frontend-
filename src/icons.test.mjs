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
  // Art exists on Corey's machine, never committed. Drop the file in
  // public/icons/ (lowercase, no spaces) and delete the line here.
  "coachz.jpg": "have: CoachZ.jpg — commit it lowercase as coachz.jpg",
  "opportunitiez.png": "have: opportunitiez.png — commit it",
  "personaz_coach.jpg": "have: personaz.coach.jpg — commit it as personaz_coach.jpg",
  "statsz.png": "have: statsz.png — commit it",
  // Art exists AND the registry has the wrong extension, so committing the
  // file alone will not fix these two. The registry line has to change with it.
  "chordz.png": "have: chordz.jpg — the registry says .png; one of the two must move",
  "tunerz.png": "have: tunerz.jpg — the registry says .png; one of the two must move",
  // No artwork anywhere. These were added from a wishlist, not a folder.
  "characterz.png": "never drawn",
  "codez.png": "never drawn",
  "console.png": "never drawn",
  "editor.png": "never drawn",
  "mistakez.png": "never drawn",
  "search.png": "never drawn",
  "taskz.png": "never drawn",
  "welcome.png": "never drawn",
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
