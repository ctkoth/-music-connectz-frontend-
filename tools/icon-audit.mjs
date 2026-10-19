#!/usr/bin/env node
// Audit the icon registry against what is actually in public/icons/.
//
// `src/icons.test.mjs` FAILS on the one thing that is always a bug — the
// registry naming a file that isn't committed. This reports the rest, which
// is judgement rather than pass/fail: orphaned art, duplicates under three
// naming conventions, and filenames that will 404 on a case-sensitive host.
//
// Run it on the machine the art lives on — that is where it can tell you
// which files are missing from git rather than missing from the world:
//
//     node tools/icon-audit.mjs
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "public/icons");
const APP = readFileSync(join(ROOT, "src/App.jsx"), "utf8");

const reg = Object.fromEntries(
  [...APP.match(/export const CUSTOM_ICONS = \{([\s\S]*?)\n\};/)[1]
    .matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));

const files = readdirSync(DIR).filter((f) => statSync(join(DIR, f)).isFile());
const referenced = new Set(Object.values(reg).map((u) => u.split("/").pop()));

const say = (title, rows, note) => {
  console.log(`\n${title} — ${rows.length}`);
  if (note && rows.length) console.log(`  ${note}`);
  rows.forEach((r) => console.log("   ", r));
};

console.log(`registry ${Object.keys(reg).length} entries · public/icons ${files.length} files`);

say("ON A GENERATED GLYPH",
  Object.entries(reg).filter(([, u]) => u.endsWith("-neon.svg")).map(([k, u]) => `${k} -> ${u}`),
  "renders a -neon.svg rather than the MCZ logo. For most of these the glyph IS the icon; "
  + "the few where real art is still owed are listed in PLACEHOLDER in src/icons.test.mjs.");

say("REGISTERED, NOT COMMITTED",
  Object.entries(reg)
    .filter(([, u]) => !existsSync(join(ROOT, "public", u.replace(/^\//, ""))))
    .map(([k, u]) => `${k} -> ${u}`),
  "each renders the MCZ logo, silently. src/icons.test.mjs fails on any not in its OWED list.");

say("WILL 404 ON A CASE-SENSITIVE HOST",
  files.filter((f) => f !== f.toLowerCase() || f.includes(" ")),
  "Windows serves these; Vercel and Cloudflare Pages do not. Rename to lowercase, no spaces.");

// The same icon under two or three spellings — dots vs underscores vs
// squashed. Grouped by the name with every separator removed, so
// `lilith.today.png` and `lilith_today.png` read as one row — that pair was
// real, and 57 more like it, because RENAME_ICONS.sh COPIES to the clean name
// instead of moving, and both ends got committed.
const byShape = {};
for (const f of files) {
  const key = f.toLowerCase().replace(/[.\-_ ]/g, "").replace(/(png|jpe?g|webp|svg)$/, "");
  (byShape[key] ||= []).push(f);
}
say("THE SAME ICON UNDER MORE THAN ONE NAME",
  Object.values(byShape).filter((g) => g.length > 1).map((g) => g.join("  ·  ")),
  "one of each is what the registry points at; the rest are dead weight in the deploy.");

say("COMMITTED, NEVER REFERENCED",
  files.filter((f) => !referenced.has(f)),
  "art nothing renders. Some is deliberate (the -neon.svg placeholders); the rest is shipping bytes nobody sees.");
