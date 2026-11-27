// Writes src/tabList.js from the TABS array in src/App.jsx.
//
// Run from the frontend repo root whenever a tab is added, renamed or removed:
//   node tools/gen-tablist.cjs src/App.jsx src/tabList.js
//
// tabList.test.mjs fails when the two disagree, and its message names this
// script. The generated file is committed, so nothing needs node to build.
const fs = require("fs");

const [appPath, outPath] = process.argv.slice(2);
if (!appPath || !outPath) {
  console.error("usage: node tools/gen-tablist.cjs src/App.jsx src/tabList.js");
  process.exit(2);
}
const src = fs.readFileSync(appPath, "utf8");
const start = src.indexOf("const TABS = [");
const end = src.indexOf("\n];", start);
if (start < 0 || end < 0) throw new Error("TABS block not found");
const block = src.slice(start, end);

const entries = [...block.matchAll(/\{ key: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
const total = (block.match(/\{ key:/g) || []).length;
if (entries.length !== total) {
  throw new Error(`parsed ${entries.length} of ${total} TABS entries; a non-standard entry needs handling`);
}
const keys = entries.map(([k]) => k);
if (new Set(keys).size !== keys.length) throw new Error("duplicate tab key in TABS");

const rows = entries
  .map(([k, l]) => `  { key: ${JSON.stringify(k)}, label: ${JSON.stringify(l)} },`)
  .join("\n");

const header = `// The tabs a member can open, as { key, label }. The Lilith tag picker reads
// this list, so a tag can only name a tab that exists. A tag pointed at a key
// the shell does not know would be a dead button: App.jsx ignores an unknown
// tab event without a word.
//
// The full entries (icon, screen element) stay in App.jsx's TABS array. That
// array is JSX and cannot be imported here without pulling in every screen, so
// tabList.test.mjs reads App.jsx instead and fails if the two disagree. A new
// tab missing from this list is a red test, not a missing door.
//
// Pure data and no imports, so it runs under plain node.

export const TAB_LIST = [
`;

const footer = `];

const LABEL_BY_KEY = new Map(TAB_LIST.map((t) => [t.key, t.label]));

// The label for a tab key, or null when the shell has no tab by that key.
export function tabLabel(key) {
  return LABEL_BY_KEY.get(String(key)) || null;
}

export function isTabKey(key) {
  return LABEL_BY_KEY.has(String(key));
}
`;

fs.writeFileSync(outPath, header + rows + "\n" + footer);
console.log(`wrote ${entries.length} tabs to ${outPath}`);
