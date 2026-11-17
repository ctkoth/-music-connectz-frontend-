import test from "node:test";
import assert from "node:assert/strict";
import { allowedLoops, loopCatalogue } from "./loops.js";

test("the library has every family and the tier opens the first N of each", () => {
  const all = loopCatalogue();
  const fams = new Set(all.map((l) => l.family));
  assert.deepEqual([...fams], ["Drums", "Chords", "Keys", "Bass", "Arps"]);
  const free = allowedLoops(3);
  for (const f of fams) assert.equal(all.filter((l) => l.family === f && free.has(l.id)).length, Math.min(3, all.filter((l) => l.family === f).length));
  assert.equal(allowedLoops(null).size, all.length);
  assert.equal(new Set(all.map((l) => l.id)).size, all.length, "ids are unique");
});
