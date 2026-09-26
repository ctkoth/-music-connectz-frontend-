#!/usr/bin/env node
// Rename the icon folder's files to the names git must know them by.
//
//     node tools/normalize-icons.mjs            # dry run: prints what would change
//     node tools/normalize-icons.mjs --apply    # renames in public/icons
//
// Run it on the machine the art lives on (Windows, Termux, anywhere with node).
// It only touches names listed in tools/supplied-icons.txt, and only to what
// tools/build-icon-manifest.mjs calls the normalized name: lowercase, no
// spaces, no doubled dots. Vercel and Cloudflare Pages serve case-sensitively,
// so `Gamez.png` works on Windows and 404s in production — and IconImg hides
// the 404 behind the MCZ logo.
//
// It never deletes and never overwrites. A "- Copy" / "(2)" file is listed for
// you to remove yourself; a rename whose target already exists is skipped.
//
// Afterwards, from the repo root:
//     git add -A public/icons && node tools/build-icon-manifest.mjs && npm test
// (On Windows git may not notice a case-only rename: `git mv -f Gamez.png gamez.png`
// per file, or `git config core.ignorecase false` first.)
import { readFileSync, readdirSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { normalize } from "./build-icon-manifest.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "public/icons");
const apply = process.argv.includes("--apply");

const listed = readFileSync(join(ROOT, "tools/supplied-icons.txt"), "utf8")
  .split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const onDisk = new Set(readdirSync(DIR));

let renamed = 0, skipped = 0, absent = 0;
const copies = [];
for (const raw of listed) {
  const { file, isCopy } = normalize(raw);
  if (isCopy) { if (onDisk.has(raw)) copies.push(raw); continue; }
  if (raw === file) continue;
  if (!onDisk.has(raw)) { absent++; continue; }        // listed, but not in this checkout
  const caseOnly = raw.toLowerCase() === file.toLowerCase();
  if (!caseOnly && existsSync(join(DIR, file))) {
    console.log(`skip    ${raw} -> ${file}   (target exists — resolve by hand)`);
    skipped++;
    continue;
  }
  console.log(`${apply ? "rename" : "would  "} ${raw} -> ${file}`);
  if (apply) {
    if (caseOnly) {                                     // case-insensitive disks need two hops
      renameSync(join(DIR, raw), join(DIR, `${file}.tmp-rename`));
      renameSync(join(DIR, `${file}.tmp-rename`), join(DIR, file));
    } else renameSync(join(DIR, raw), join(DIR, file));
  }
  renamed++;
}
console.log(`\n${apply ? "renamed" : "would rename"} ${renamed}, skipped ${skipped}, not in this checkout ${absent}`);
if (copies.length) console.log(`\nCopies to delete yourself (never touched here):\n  ${copies.join("\n  ")}`);
if (!apply && renamed) console.log("\nRe-run with --apply to do it.");
