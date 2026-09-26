// The icon manifest is a build-time fact about public/icons. These tests keep
// it honest: stale means a file was added without anyone rebuilding, and a
// default that points at a missing file is the silent-logo bug this repo has
// hit before (see icons.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildManifest, renderAudit, renderJs, normalize } from "../tools/build-icon-manifest.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const m = buildManifest();

test("src/iconManifest.js and ICON_AUDIT.md are current", () => {
  // Fails when a file lands in public/icons (or supplied-icons.txt changes)
  // without `node tools/build-icon-manifest.mjs` being re-run.
  assert.equal(readFileSync(join(ROOT, "src/iconManifest.js"), "utf8"), renderJs(m),
    "stale — run: node tools/build-icon-manifest.mjs");
  assert.equal(readFileSync(join(ROOT, "ICON_AUDIT.md"), "utf8"), renderAudit(m),
    "stale — run: node tools/build-icon-manifest.mjs");
});

test("every default is a committed file with a git-safe name", () => {
  const bad = Object.entries(m.defaults).filter(([, url]) =>
    !existsSync(join(ROOT, "public", url.replace(/^\//, ""))) || url !== url.toLowerCase() || /\s/.test(url));
  assert.deepEqual(bad, [], "defaults must be committed, lowercase, no spaces");
});

test("every default belongs to a registry key, or it can never be drawn", () => {
  const orphan = Object.keys(m.defaults).filter((k) => !(k in m.reg));
  assert.deepEqual(orphan, [], `add these keys to CUSTOM_ICONS in App.jsx: ${orphan}`);
});

test("normalizing is what the folder needs: capitals, spaces, doubled dots, copies", () => {
  assert.equal(normalize("Toolz .png").file, "toolz.png");
  assert.equal(normalize("groupz..fanz.jpg").file, "groupz.fanz.jpg");
  assert.equal(normalize("personaz.mix engineer.png").file, "personaz.mixengineer.png");
  assert.equal(normalize("Crewz icon.jpg").file, "crewz.jpg");
  assert.equal(normalize("ImgResizer_lilith.upcoming (1).png").file, "lilith.upcoming.png");
  assert.ok(normalize("statsz - Copy.png").isCopy);
  assert.ok(!normalize("statsz.png").isCopy);
});

test("SkillZ and DirectZ follow the alphabetical parents", () => {
  const order = m.tree.map((p) => p.parent);
  assert.deepEqual(order.slice(-2), ["skillz", "directz"]);
  const rest = order.slice(0, -2);
  assert.deepEqual(rest, [...rest].sort());
});

test("a child is named by the filename after its parent", () => {
  const battlez = m.tree.find((p) => p.parent === "battlez");
  const kids = battlez.children.map((c) => c.child);
  for (const k of ["1v1", "cypher", "freestyle"]) assert.ok(kids.includes(k), `battlez.${k}`);
  for (const p of m.tree) for (const c of p.children) {
    assert.ok(c.file.startsWith(`${p.parent}.`) || p.parent === "bodiez" || p.parent === "intelligence",
      `${c.file} is not a child of ${p.parent}`);
  }
});
