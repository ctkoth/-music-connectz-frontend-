// node --test tools/
//
// Every app has to explain itself.
//
// The ⓘ in the header opens the tab's description — the closest thing MCZ has
// to a tutorial, and the first thing somebody presses on an app they have
// never seen. Four apps shipped without one (RoyaltieZ, CallZ, GameZ, SoundZ)
// and answered "A Music ConnectZ app." to the member most in need of an
// answer. Nothing caught it, because a missing key in an object literal is not
// an error in JavaScript — it is a blank.
//
// So this reads the source and holds the two lists to each other. It is a text
// scan rather than an import on purpose: App.jsx pulls in React, thirty lazy
// routes and a stylesheet, none of which a description needs.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

function section(startMarker, endMarker) {
  const a = SRC.indexOf(startMarker);
  assert.ok(a > -1, `couldn't find ${startMarker} — did App.jsx move?`);
  const b = SRC.indexOf(endMarker, a);
  assert.ok(b > a, `couldn't find the end of ${startMarker}`);
  return SRC.slice(a, b);
}

const tabKeys = [...section("const TABS = [", "\n];")
  .matchAll(/\bkey:\s*"([a-z0-9]+)"/g)].map((m) => m[1]);

const aboutBlock = section("const TAB_ABOUT = {", "\n};");
const aboutKeys = [...aboutBlock.matchAll(/^\s{2}([a-z0-9]+):\s*"/gm)].map((m) => m[1]);

test("the tab list is actually found, so a rename can't make this test vacuous", () => {
  assert.ok(tabKeys.length > 20, `only found ${tabKeys.length} tabs`);
  assert.ok(aboutKeys.length > 20, `only found ${aboutKeys.length} descriptions`);
});

test("every tab has a description — no app answers 'A Music ConnectZ app.'", () => {
  const missing = tabKeys.filter((k) => !aboutKeys.includes(k));
  assert.deepEqual(missing, [], `tabs with no TAB_ABOUT entry: ${missing.join(", ")}`);
});

test("no description is left for a tab that no longer exists", () => {
  const orphans = aboutKeys.filter((k) => !tabKeys.includes(k));
  assert.deepEqual(orphans, [], `TAB_ABOUT entries with no tab: ${orphans.join(", ")}`);
});

test("a description says something — it is not a name and an emoji", () => {
  for (const [, key, text] of aboutBlock.matchAll(/^\s{2}([a-z0-9]+):\s*"((?:[^"\\]|\\.)*)"/gm)) {
    assert.ok(text.length > 60, `${key}'s description is too short to teach anybody anything`);
  }
});
