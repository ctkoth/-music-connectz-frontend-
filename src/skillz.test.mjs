// The SkillZ app is a build of this repo, not a screen of it, so most of what can
// drift is a fact about files that have to agree: the shell's list of coaches, the
// tabs the screens' doors may name, the package the host proves ownership of, and the
// icons a listing needs. None of it fails a build — a coach missing from the shell is
// a tab nobody can reach, and a stale `SKILLZ_TABS` is a door that does nothing — so
// it fails here.
//
// Plain node, so nothing here imports a file that reads `import.meta.env`
// (`src/standalone.js`, `Shell.jsx`): those are read as TEXT.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { COACHES, DISCLOSURE, TABS } from "../standalone/skillz/coaches.js";

const ROOT = new URL("..", import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), "utf8");

// The <InstrumentZ …/> elements App.jsx mounts, keyed by appKey.
function appCoaches() {
  const out = {};
  for (const m of read("src/App.jsx").matchAll(/<InstrumentZ\s+appKey="(\w+)"\s+icon="([^"]+)"\s+title="([^"]+)"\s+accent="(#[0-9a-f]{6})"/g)) {
    out[m[1]] = { icon: m[2], title: m[3], accent: m[4] };
  }
  return out;
}

function pngSize(f) {
  const b = readFileSync(join(ROOT, f));
  assert.equal(b.toString("latin1", 1, 4), "PNG", f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test("every coach the shell holds is a coach the main site mounts, with the same name, art and colour", () => {
  const app = appCoaches();
  assert.equal(Object.keys(app).length >= 7, true, "App.jsx's InstrumentZ elements were not found");
  for (const c of COACHES) {
    assert.ok(app[c.key], `${c.key} is not mounted in App.jsx`);
    assert.deepEqual({ icon: c.icon, title: c.label, accent: c.accent }, app[c.key], c.key);
  }
});

test("the shell holds all seven coaches the backend mounts, once each", () => {
  // music_connectz/urls.py INSTRUMENT_APP_KEYS — the backend's own test holds the
  // hub to the same seven.
  assert.deepEqual(COACHES.map((c) => c.key).sort(), ["bassz", "drumz", "guitarz", "keyz", "rapz", "singz", "violinz"]);
});

test("the tabs a screen's door may name are exactly the tabs the shell answers", () => {
  const src = read("src/standalone.js");
  const list = src.match(/export const SKILLZ_TABS = \[([^\]]+)\]/)[1].match(/"(\w+)"/g).map((s) => s.slice(1, -1));
  assert.deepEqual([...list].sort(), TABS.map((t) => t.key).sort());
  assert.equal(TABS[0].key, "skillz");
  assert.equal(TABS[0].path, "", "Home is the empty route");
  assert.equal(new Set(TABS.map((t) => t.path)).size, TABS.length, "two tabs share a route");
});

test("every screen says what it is: a line for every tab, and none claims AI where there is none", () => {
  for (const t of TABS) assert.ok(DISCLOSURE[t.key]?.length > 20, `${t.key} has no disclosure`);
  for (const c of COACHES) assert.match(DISCLOSURE[c.key], /AI/);
});

test("no number, price or dimension is typed into a coach's tagline", () => {
  for (const c of COACHES) {
    assert.doesNotMatch(c.tagline, /\d/, c.key);
    assert.doesNotMatch(c.tagline, /[🌊⏱️🫁🔍🔥🎯🌈📊✨]/u, c.key);
    assert.match(c.tagline, /record or upload a take/);
  }
});

test("the shell has no door to a screen it lacks, and offers nothing to buy", () => {
  const shell = read("standalone/skillz/Shell.jsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const door of ["membershipz", "postz", "distributez", "profilez", "goToSpot", "goToTab", "upgrade", "Premium", "StatZ"]) {
    assert.ok(!shell.includes(door), `Shell.jsx mentions ${door}`);
  }
  assert.ok(shell.includes("DeleteAccount"), "account deletion has to be reachable from inside the app");
  assert.ok(shell.includes("privacy.html"), "the privacy policy has to be one tap away");
});

test("the vite config builds the skillz shell into its own folder", () => {
  const cfg = read("vite.skillz.config.js");
  assert.match(cfg, /JSON\.stringify\("skillz"\)/);
  assert.match(cfg, /outDir: path\.resolve\("dist-skillz"\)/);
  assert.match(cfg, /path\.resolve\("standalone\/skillz"\)/);
  // A port of its own, or two dev servers fight over one.
  const ports = ["bodiez", "sentencez", "intelligencez", "skillz"].map((n) => read(`vite.${n}.config.js`).match(/port: (\d+)/)[1]);
  assert.equal(new Set(ports).size, 4, `two shells share a port: ${ports}`);
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["build:skillz"], /vite\.skillz\.config\.js/);
  assert.match(pkg.scripts["build:skillz"], /finish-skillz\.mjs/);
  assert.match(pkg.scripts["dev:skillz"], /vite\.skillz\.config\.js/);
  assert.match(read(".gitignore"), /^dist-skillz\/$/m);
});

test("the host proves ownership of this app's package, and of no other", () => {
  const links = JSON.parse(read("standalone/skillz/public/.well-known/assetlinks.json"));
  assert.deepEqual(links.map((l) => l.target.package_name), ["net.musicconnectz.skillz"]);
  assert.match(read("tools/finish-skillz.mjs"), /net\.musicconnectz\.skillz/);
  assert.match(read("play/skillz/twa-manifest.json"), /"packageId": "net\.musicconnectz\.skillz"/);
});

test("the web manifest and the icons are the sizes a phone and Play expect", () => {
  const m = JSON.parse(read("standalone/skillz/public/manifest.webmanifest"));
  assert.equal(m.name, "SkillZ");
  assert.equal(m.start_url, "/");
  assert.equal(m.display, "standalone");
  for (const i of m.icons) {
    const [w, h] = pngSize(`standalone/skillz/public${i.src}`);
    assert.deepEqual([w, h], i.sizes.split("x").map(Number), i.src);
  }
  assert.deepEqual(pngSize("standalone/skillz/public/apple-touch-icon.png"), [180, 180]);
  assert.deepEqual(pngSize("play/skillz/graphics/icon-512.png"), [512, 512]);
  assert.deepEqual(pngSize("play/skillz/graphics/feature-graphic-1024x500.png"), [1024, 500]);
});

test("the web icons and the Android art start from the same sign", () => {
  const backend = join(ROOT, "..", "music-connectz-backend", "android", "tools", "skillz-source-1024.png");
  if (!existsSync(backend)) return;   // the frontend alone is a valid checkout
  assert.ok(readFileSync(backend).equals(readFileSync(join(ROOT, "standalone/skillz/icon-source-1024.png"))),
    "standalone/skillz/icon-source-1024.png differs from the backend's android/tools/skillz-source-1024.png");
});

test("Play screenshots are phone portrait, 1080 by 1920, numbered in story order, and there are at least eight", () => {
  const dir = join(ROOT, "play/skillz/screenshots");
  const files = readdirSync(dir).filter((f) => /^\d\d-.*\.png$/.test(f)).sort();
  assert.ok(files.length >= 8, `Play takes eight; ${files.length} found`);
  files.forEach((f, i) => {
    assert.equal(Number(f.slice(0, 2)), i + 1, `${f} breaks the numbering`);
    assert.deepEqual(pngSize(`play/skillz/screenshots/${f}`), [1080, 1920], f);
  });
  for (const f of ["icon-512.png", "feature-graphic-1024x500.png"]) assert.ok(statSync(join(ROOT, "play/skillz/graphics", f)).size > 10_000, f);
});
