// Every focus app has to be a real tab. A key that isn't one renders a tile on
// the member home screen that goes nowhere — the dead-button class of bug this
// repo has shipped before (see imports.test.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOCUS_COACHES, FOCUS_SUPPORT, inFocus } from "./focus.js";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const start = app.indexOf("const TABS = [");
const tabs = new Set([...app.slice(start, app.indexOf("\n];", start)).matchAll(/key: "([a-z_]+)"/g)].map((m) => m[1]));

test("every focus app is a real tab", () => {
  for (const k of [...FOCUS_COACHES, ...FOCUS_SUPPORT]) assert.ok(tabs.has(k), `${k} is not a tab`);
});

test("focus keeps the coaches and BodieZ, and hides the empty rooms", () => {
  for (const k of FOCUS_COACHES) assert.ok(inFocus(k));
  assert.ok(inFocus("bodiez"));
  for (const k of ["collabz", "venuez", "merchz", "labelz", "distributez"]) assert.ok(!inFocus(k), k);
});

// A focus tile is drawn by ToolZMenu from three maps of its own. A key missing from them does not
// fail anything — it renders a music note and the raw lowercase key ("filez"), which is exactly how
// FileZ shipped. So every focus key has to be in all three.
import { FOCUS_COACHES as COACHES, FOCUS_COACH_PARENTS as COACH_PARENTS, FOCUS_PARENTS as PARENTS, FOCUS_SUPPORT as SUPPORT } from "./focus.js";

const menu = readFileSync(new URL("./components/ToolZMenu.jsx", import.meta.url), "utf8");
const block = (name) => {
  const start = menu.indexOf(`const ${name} = {`);
  return menu.slice(start, menu.indexOf("\n};", start));
};

test("every focus tile has an icon, an emoji fallback and a real label", () => {
  const icon = block("ICON_KEY"), emoji = block("EMOJI"), label = block("FOCUS_LABEL");
  for (const k of [...COACHES, ...SUPPORT]) {
    assert.match(icon, new RegExp(`\\b${k}:`), `${k} has no ICON_KEY entry`);
    assert.match(emoji, new RegExp(`\\b${k}:`), `${k} has no EMOJI entry`);
    assert.match(label, new RegExp(`\\b${k}:\\s*['"][A-Z]`), `${k} has no capitalised FOCUS_LABEL`);
  }
});

test("SkillZ is a coach app: it ends the coach grid, as the category it is (there is no skillz tab)", () => {
  assert.deepEqual(COACH_PARENTS, ["SkillZ"]);
  assert.ok(!tabs.has("skillz"), "if skillz becomes a tab, this tile should open it instead");
  assert.match(menu, /\n  'SkillZ': \[/);
  assert.match(block("CATEGORY_ICON_KEY"), /\bSkillZ:/);
});

test("the home screen's parents are each a real category with art, offered up front", () => {
  assert.deepEqual(PARENTS, ["ToolZ", "IntelligenceZ", "StudioZ", "SocialiZeZ", "CollabZ", "BattleZ", "VenueZ"]);
  const art = block("CATEGORY_ICON_KEY");
  for (const k of PARENTS) {
    assert.match(menu, new RegExp(`\\n  '${k}': \\[`), `${k} is not a category in TOOLZ_MENU`);
    assert.match(menu, new RegExp(`key: '${k}', label:`), `${k} is not in CATEGORIES`);
    assert.match(art, new RegExp(`\\b${k}:`), `${k} has no category art`);
  }
  // the hub inside IntelligenceZ stays offered in the drawer
  assert.ok(inFocus("intelligencez"));
});

test("one home grid: ToolZ, DawZ and IntelligenceZ lead, the coaches are not tiles (they live in SkillZ), then the parents and support apps", () => {
  const toolz = menu.indexOf('categoryKey="ToolZ"');
  const daw = menu.indexOf('appKey="dawz"');
  const intel = menu.indexOf('categoryKey="IntelligenceZ"');
  const parents = menu.indexOf('FOCUS_PARENTS.filter');
  const support = menu.indexOf("FOCUS_SUPPORT.filter");
  assert.ok(toolz > 0 && toolz < daw && daw < intel && intel < parents && parents < support);
  assert.ok(!menu.includes("FOCUS_COACHES.map"), "the home grid must not list the coaches");
});

test("Corey's home screen set is always shown: real categories and real tabs", async () => {
  const { HOME_PARENTS, HOME_APPS } = await import("./focus.js");
  for (const k of HOME_PARENTS) assert.match(menu, new RegExp(`key: '${k}', label:`), `${k} is not a category`);
  for (const k of HOME_APPS) assert.ok(tabs.has(k), `${k} is not a tab`);
  for (const k of ["ToolZ"]) assert.ok(HOME_PARENTS.includes(k));
  for (const k of ["bodiez"]) assert.ok(HOME_APPS.includes(k));
  // The coaches live in SkillZ, which is the featured tile — not repeated beside it.
  const { HOME_FEATURED } = await import("./focus.js");
  assert.equal(HOME_FEATURED, "SkillZ");
  assert.match(menu, new RegExp(`key: '${HOME_FEATURED}', label:`));
  for (const k of ["singz", "rapz", "guitarz", "drumz"]) assert.ok(!HOME_APPS.includes(k), `${k} belongs in SkillZ`);
});
