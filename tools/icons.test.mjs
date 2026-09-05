// node --test tools/
//
// An icon that isn't there is a blank, not an error.
//
// `IconImg` falls back to the MCZ logo when a file 404s. That is the right
// behaviour for a missing file and it is exactly why nobody noticed that
// EIGHT OCC tiles — editor, taskz, codez, mistakez, characterz, console,
// search, welcome — were named by the server, registered in CUSTOM_ICONS, and
// had no file in the repository. They rendered the generic logo for months.
//
// Two failure modes, both invisible in a browser and both caught here:
//
//   A REGISTERED NAME WITH NO FILE. The registry is hand-maintained and the
//   art arrives separately; the entry lands, the PNG doesn't get committed,
//   and the fallback hides it.
//
//   A CASE-ONLY MISMATCH. Development is on Windows, where `LogZ.png` and
//   `logz.png` are the same file. Production is Linux behind a CDN, where they
//   are not. That bug works perfectly on the machine it was written on and
//   404s for every member.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SRC = readFileSync(root + "src/App.jsx", "utf8");

const block = (() => {
  const a = SRC.indexOf("export const CUSTOM_ICONS = {");
  assert.ok(a > -1, "CUSTOM_ICONS moved — this test is checking nothing");
  const b = SRC.indexOf("\n};", a);
  return SRC.slice(a, b);
})();

const entries = [...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => ({
  name: m[1], path: m[2],
}));

const onDisk = readdirSync(root + "public/icons");

test("the registry is actually found and populated", () => {
  assert.ok(entries.length > 100, `only found ${entries.length} icon entries`);
});

test("every registered icon resolves to a file that exists", () => {
  const missing = entries.filter((e) => !existsSync(root + "public" + e.path));
  assert.deepEqual(
    missing.map((e) => `${e.name} -> ${e.path}`), [],
    "registered, rendered, and silently falling back to the logo",
  );
});

test("every path matches the file's case exactly", () => {
  const byLower = new Map(onDisk.map((f) => [f.toLowerCase(), f]));
  const wrong = [];
  for (const e of entries) {
    if (!e.path.startsWith("/icons/")) continue;
    const file = e.path.split("/").pop();
    const real = byLower.get(file.toLowerCase());
    if (real && real !== file) wrong.push(`${e.path} — the file is ${real}`);
  }
  assert.deepEqual(wrong, [], "works on Windows, 404s in production");
});

test("art lives under /icons/, apart from the two site assets", () => {
  // The logo and the favicon sit at the public root because they are the
  // site's own identity, not an app's tile. Everything else being under one
  // directory is what makes the case check above complete.
  const ROOT_ASSETS = new Set(["/mcz-logo-v5.jpg", "/favicon.webp"]);
  const stray = entries
    .filter((e) => !e.path.startsWith("/icons/") && !ROOT_ASSETS.has(e.path))
    .map((e) => e.path);
  assert.deepEqual(stray, []);
});

test("no two names point at the same art by accident", () => {
  // Aliases are legitimate (personaz.png is the ProfileZ tile), so this only
  // reports, it does not fail — the count is the thing worth watching.
  const seen = new Map();
  for (const e of entries) seen.set(e.path, (seen.get(e.path) || 0) + 1);
  const shared = [...seen.entries()].filter(([, n]) => n > 1);
  assert.ok(shared.length < 12, `${shared.length} icons are aliased — check that each is deliberate`);
});
