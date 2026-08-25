// node --test src/anchors.test.mjs
//
// Anchors are a contract between files that never import each other.
//
// `goToSpot(tab, target)` finds `[data-tour="<target>"]` in the destination and
// flashes it. Nothing checks that the anchor is there: a jump to one that
// isn't scrolls nowhere for three seconds and leaves the member at the top of
// the tab, silently. That is how OCC's tab list shipped pointing every one of
// its Open → buttons at an `occ:<key>` anchor that has never existed in this
// repo, and how "Share another member's post" pointed at `social-feed` before
// that anchor was written.
//
// So the anchors other surfaces are sent to are listed here and checked to
// exist. The backend names some of these (apps/economy/occ_spec.py's `target`
// per OCC tab); it deploys separately and cannot be read from here, so this is
// the half of the contract this repo can hold — rename or delete one of these
// anchors and the test says which jump you just broke.
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = dirname(fileURLToPath(import.meta.url));

/** Every data-tour value rendered anywhere under src/, mcz2 excluded — that is
 *  the unmounted 2.2 reference app, so an anchor living only there is not one. */
function anchors() {
  const found = new Set();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== "mcz2" && name !== "node_modules") walk(path);
        continue;
      }
      if (!/\.jsx?$/.test(name)) continue;
      const src = readFileSync(path, "utf8");
      // Literal anchors, and the template ones that render a fixed prefix and
      // a key from the server: data-tour={`habitz-kind-${k.key}`}.
      for (const m of src.matchAll(/data-tour=(?:"([^"]+)"|\{`([^`$]*)\$\{[^}]+\}`\})/g)) {
        found.add(m[1] ?? `${m[2]}*`);
      }
    }
  };
  walk(SRC);
  return found;
}

/** `habitz-kind-code` is satisfied by a `habitz-kind-*` template anchor. */
const has = (set, want) =>
  set.has(want) || [...set].some((a) => a.endsWith("*") && want.startsWith(a.slice(0, -1)));

// The targets apps/economy/occ_spec.py sends OCC's tab list to, tab by tab.
const OCC_TAB_TARGETS = {
  editor: "occ-run",
  taskz: "occ-taskz",
  workz: "occ-workz",
  codez: "habitz-kind-code",
  pathz: "habitz-kind-path",
  mistakez: "habitz-kind-mistake",
  habitz: "habitz-kind-habit",
  settings: "occ-settings",
  console: "occ-console",
  search: "social-search",
  logz: "logz-entries",
  filez: "occ-filez",
  spinaz: "logz-resource-spinaz",
  energy: "logz-resource-energy",
  facez: "profilez-facez",
  welcome: "occ-welcome",
  pickconnectz: "occ-pickconnectz",
};

test("every control OCC's tab list opens on is actually anchored", () => {
  const found = anchors();
  for (const [tab, target] of Object.entries(OCC_TAB_TARGETS)) {
    assert.ok(has(found, target), `OCC's ${tab} tab opens on "${target}", which nothing renders`);
  }
});

test("no OCC tab is sent to an occ:<key> anchor, which is what broke before", () => {
  const src = readFileSync(join(SRC, "apps", "OCC.jsx"), "utf8");
  assert.ok(!/`occ:\$\{/.test(src), "the client is building its own anchor again");
});

test("the anchors other surfaces link to exist too", () => {
  const found = anchors();
  // EarnZ and QuestZ both point at the social feed; OnboardZ steps land on
  // ProfileZ's own fields. Each of these has been a dead jump at some point.
  for (const target of ["social-feed", "referral-code", "personas", "skills", "bio",
                        "nationalities", "save", "birthday", "refer", "feed",
                        "composer", "post-submit"]) {
    assert.ok(has(found, target), `nothing renders data-tour="${target}"`);
  }
});
