import test from "node:test";
import assert from "node:assert/strict";
import { setUserPatches, userPatch, userKey, isUserSound, userRows } from "./userPatches.js";

test("saved patches become instruments and resolve back to a cleaned patch", () => {
  const rows = setUserPatches([{ id: 7, kind: "synth", name: "Mine", chain: { oscs: [{ shape: "saw", unison: 99 }], filter: { cutoff: 1e9 } } }, { id: 8, kind: "tone", name: "Not synth", chain: [] }]);
  assert.deepEqual(rows, [["synth:u:7", "🎛️ Mine (mine)"]]);
  assert.ok(isUserSound(userKey(7)));
  const p = userPatch("synth:u:7");
  assert.equal(p.oscs[0].unison, 7); assert.equal(p.filter.cutoff, 20000);
  assert.equal(userPatch("synth:u:8"), null);
  assert.equal(userRows().length, 1);
});
test("setting the list again replaces it", () => { setUserPatches([]); assert.equal(userRows().length, 0); });

import { registerTemp } from "./userPatches.js";
test("an unsaved patch can be registered as a temporary instrument, and only the last 8 are kept", () => {
  const first = registerTemp({ oscs: [{ shape: "saw" }], name: "Take patch" });
  assert.equal(userPatch(first).name, "Take patch");
  for (let i = 0; i < 8; i++) registerTemp({ oscs: [{ shape: "sine" }] });
  assert.equal(userPatch(first), null);
  assert.equal(userRows().length, 0);                       // temps are not listed as saved patches
});
