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
