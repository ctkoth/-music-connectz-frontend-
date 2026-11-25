import test from "node:test";
import assert from "node:assert/strict";
import { keyOf, loopById, loopFileName } from "./loopRender.js";
import { loopCatalogue } from "./loops.js";

test("the session's key becomes the library's key and mode; flats and sharps land on the same note; unset is A minor", () => {
  assert.deepEqual(keyOf("A minor"), { key: 9, mode: "minor" });
  assert.deepEqual(keyOf("C major"), { key: 0, mode: "major" });
  assert.deepEqual(keyOf("Bb major"), { key: 10, mode: "major" });
  assert.deepEqual(keyOf("F# minor"), { key: 6, mode: "minor" });
  assert.deepEqual(keyOf("Eb minor"), { key: 3, mode: "minor" });
  assert.deepEqual(keyOf(""), { key: 9, mode: "minor" }); assert.deepEqual(keyOf("nonsense"), { key: 9, mode: "minor" });
});
test("loops are found by id and file names say the key only where a key matters", () => {
  const drums = loopCatalogue().find((l) => l.kind === "drums"); const chords = loopCatalogue().find((l) => l.kind === "chords");
  assert.equal(loopById(drums.id).id, drums.id); assert.equal(loopById("nope"), null);
  assert.ok(!loopFileName(drums, "A minor", 8).includes(" in ")); assert.match(loopFileName(chords, "A minor", 8), / in A minor ×8\.wav$/);
});
