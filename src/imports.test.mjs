// Every helper a file CALLS, that file has to IMPORT.
//
// This test exists because of one missing line. `src/apps/BossTake.jsx` called
// `track(...)` in four places and never imported it, so pressing Record threw
// `ReferenceError: track is not defined` before `getUserMedia` was reached —
// no mic prompt, no error on screen, nothing. Send did the same thing one line
// after `setBusy(true)`, which is a spinner that never ends. The recorder was
// dead for four days on the one screen a stranger ever sees, and the commit
// that broke it was the commit added to measure why that screen wasn't
// converting.
//
// Nothing caught it: there is no ESLint here, and esbuild (what Vite builds
// with) does not resolve free identifiers — an undefined global is a runtime
// error by design in JavaScript, so the bundle is valid and the button is not.
//
// It is deliberately narrow. Not a linter, not a parser: it takes the names
// each shared helper module EXPORTS, and for every source file that calls one
// of those names, checks the file either imports it or defines it. That is the
// exact shape of the bug, and a heuristic that flags nothing else is one
// nobody will be tempted to switch off.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

// The helper modules whose exports move between files. Anything a component
// reaches for by bare name and gets from somewhere else.
const HELPERS = [
  "src/track.js", "src/api.js", "src/goto.js", "src/sound.js",
  "src/limits.js", "src/rulez.js", "src/handoff.js", "src/openable.js",
  "src/voice.js", "src/listen.js", "src/uploadWork.js", "src/widgetz.js",
  "src/useScreenShape.js", "src/resources.js", "src/pageTitle.js",
  "src/recorder.js", "src/oauthProviders.jsx", "src/connectOAuth.js",
  // Register.jsx reaches into both of these by bare name: the trial-claim
  // pair from TrialTake.jsx, and the trial-split pair from BodieZTrial.jsx —
  // the same "build a week for free, keep it on register" helpers this
  // file's own docstring is warning about.
  "src/apps/TrialTake.jsx", "src/apps/BodieZTrial.jsx", "src/bodiezPick.js",
  // BodieZ.jsx and BodieZTrial.jsx both reach into EquipmentPicker.jsx by
  // bare name now (EQUIPMENT_LABEL, toggleEquipment, the default export) —
  // the multi-select equipment fix that replaced four separate single-selects
  // with one shared component.
  "src/apps/EquipmentPicker.jsx",
];

// `src/mcz2/` is the 2.2 reference app and is not mounted — see CLAUDE.md.
const SKIP = /(^|\/)(mcz2)\//;

// Comments are prose about code, not code. Half this codebase's comments name
// the helper they are explaining ("`onHandoff(\"messagez\")` already fills…"),
// and counting those as calls would make this test cry wolf immediately —
// which is how a test gets deleted.
//
// Crude on purpose: `//` is only a comment when it isn't part of a `://` URL.
// The worst a mistake here can do is miss a call, and the bug it is looking
// for is four identical ones in a row, so one slipping through is survivable
// in a way a wall of false alarms is not.
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

function exportedNames(file) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const names = new Set();
  for (const m of text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  for (const m of text.matchAll(/^export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return names;
}

test("a helper a file calls is a helper that file imports", () => {
  // name → the module it comes from. A name exported by two helpers is
  // ambiguous, so it is dropped rather than guessed at.
  const owner = new Map();
  const ambiguous = new Set();
  for (const helper of HELPERS) {
    for (const name of exportedNames(helper)) {
      if (owner.has(name)) ambiguous.add(name);
      owner.set(name, helper);
    }
  }
  for (const name of ambiguous) owner.delete(name);
  assert.ok(owner.has("track"), "track must be one of the names watched here");

  const problems = [];
  for (const full of walk(SRC)) {
    const rel = relative(ROOT, full);
    if (SKIP.test(rel) || HELPERS.includes(rel) || rel.endsWith(".test.mjs")) continue;
    const raw = readFileSync(full, "utf8");
    const text = stripComments(raw);

    for (const [name, helper] of owner) {
      // Called as a bare function, not as `x.name(` or `.name(` on anything.
      // `...name(` IS a bare call — a spread of its result — and missing that
      // hid `primaryMedia` in the same file that was missing `uploadWork`.
      const called = new RegExp(`(^|\\.\\.\\.|[^.\\w$])${name}\\s*\\(`).test(text);
      if (!called) continue;
      const imported = new RegExp(`import[^;]*\\b${name}\\b[^;]*from`).test(raw);
      // Or shadowed by something the file declares itself, which is legal and
      // common — a local `const api = ...` is not this bug.
      const declared = new RegExp(
        `(^|[^.\\w$])(function\\s+${name}\\b|(?:const|let|var)\\s+${name}\\b|${name}\\s*[,}]?\\s*(?:=>|=\\s*(?:async\\s*)?\\())`,
        "m",
      ).test(text);
      if (!imported && !declared) problems.push(`${rel} calls ${name}() but never imports it (${helper})`);
    }
  }
  assert.deepEqual(problems, [], `\n${problems.join("\n")}\n`);
});

