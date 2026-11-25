// The Windows file bridge's decisions (desktop/files-core.cjs), run on whatever platform the tests run on.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const core = createRequire(import.meta.url)("../desktop/files-core.cjs");

const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), "mcz-files-"));

test("resolveInside refuses anything that leaves the chosen folder", () => {
  const root = mk();
  assert.ok(core.resolveInside(root, "a/b.wav"));
  for (const bad of ["../x", "a/../../x", "/etc/passwd", "", ".", "a\0b", "..", 5, null]) assert.equal(core.resolveInside(root, bad), null, String(bad));
  assert.equal(core.resolveInside(root, path.basename(root) === "x" ? "y" : "../" + path.basename(root) + "-evil/f"), null);
});

test("scan reads size and a used time that is never earlier than the modified time, and skips symlinks", async () => {
  const root = mk();
  fs.mkdirSync(path.join(root, "sub"));
  fs.writeFileSync(path.join(root, "a.bin"), "hello");
  fs.writeFileSync(path.join(root, "sub", "b.bin"), "xy");
  try { fs.symlinkSync(os.tmpdir(), path.join(root, "link")); } catch { /* no symlinks here */ }
  const out = await core.scan(root);
  assert.deepEqual(out.map((f) => f.path).sort(), ["a.bin", "sub/b.bin"]);
  assert.equal(out.find((f) => f.path === "a.bin").size, 5);
  for (const f of out) assert.ok(f.used >= f.modified);
});

test("scan stops at its cap and when told to", async () => {
  const root = mk();
  for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(root, `f${i}`), "x");
  assert.equal((await core.scan(root, { cap: 5 })).length, 5);
  assert.equal((await core.scan(root, { stopped: () => true })).length, 0);
});

test("duplicates are byte-identical files only — same size and same start is not enough", async () => {
  const root = mk();
  const big = Buffer.alloc(200 * 1024, 7);
  const tweak = Buffer.from(big); tweak[tweak.length - 1] = 9;   // same size, same first 64KB, different tail
  fs.writeFileSync(path.join(root, "one.wav"), big);
  fs.writeFileSync(path.join(root, "copy.wav"), big);
  fs.writeFileSync(path.join(root, "almost.wav"), tweak);
  fs.writeFileSync(path.join(root, "empty1"), "");
  fs.writeFileSync(path.join(root, "empty2"), "");
  const groups = await core.findDuplicates(root, await core.scan(root));
  assert.equal(groups.length, 1);                                 // empty files are not "duplicates"
  assert.deepEqual([...groups[0].files].sort(), ["copy.wav", "one.wav"]);
  assert.equal(groups[0].size, big.length);
});

test("last-access tracking is read from fsutil's own words, and unknown stays unknown", () => {
  assert.equal(core.lastAccessTracked("NtfsDisableLastAccessUpdate = 1  (User Managed, Disabled)"), false);
  assert.equal(core.lastAccessTracked("NtfsDisableLastAccessUpdate = 0"), true);
  assert.equal(core.lastAccessTracked("DisableLastAccess = 2"), true);
  assert.equal(core.lastAccessTracked("DisableLastAccess = 3"), false);
  assert.equal(core.lastAccessTracked("NtfsDisableLastAccessUpdate = 2147483649"), false);
  assert.equal(core.lastAccessTracked("garbled"), null);
  assert.equal(core.lastAccessTracked(undefined), null);
});

test("the packaged app lists every file main.cjs requires", () => {
  const pkg = JSON.parse(fs.readFileSync("desktop/package.json", "utf8"));
  for (const f of ["main.cjs", "preload.cjs", "vst.cjs", "files.cjs", "files-core.cjs"]) assert.ok(pkg.build.files.includes(f), f);
});
