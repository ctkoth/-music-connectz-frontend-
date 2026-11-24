import test from "node:test";
import assert from "node:assert/strict";
import { decode, encode, isOurs, hasFiles, mediaFiles, DRAG_MIME } from "./dragPayload.js";
import { loopCatalogue } from "./loops.js";

test("our own payloads round-trip; anything else is not a drop", () => {
  assert.deepEqual(decode(encode({ kind: "effect", type: "reverb" })), { kind: "effect", type: "reverb" });
  const loop = loopCatalogue()[0];
  assert.deepEqual(decode(encode({ kind: "loop", id: loop.id })), { kind: "loop", id: loop.id });
  assert.equal(decode(encode({ kind: "effect", type: "rm -rf" })), null);
  assert.equal(decode(encode({ kind: "loop", id: "drums:nope" })), null);
  assert.equal(decode("not json"), null); assert.equal(decode("null"), null); assert.equal(decode("42"), null);
});
test("a saved tone is only accepted if the member really has it", () => {
  assert.deepEqual(decode(encode({ kind: "tone", source: "mine", id: 7 }), { savedToneIds: [7, 8] }), { kind: "tone", source: "mine", id: 7 });
  assert.equal(decode(encode({ kind: "tone", source: "mine", id: 99 }), { savedToneIds: [7] }), null);
  assert.deepEqual(decode(encode({ kind: "tone", source: "starter", key: "clean_vocal" })), { kind: "tone", source: "starter", key: "clean_vocal" });
});
test("a drag is recognised by its types, and files by theirs", () => {
  assert.equal(isOurs({ types: [DRAG_MIME] }), true); assert.equal(isOurs({ types: ["text/plain"] }), false); assert.equal(isOurs(null), false);
  assert.equal(hasFiles({ types: ["Files"] }), true); assert.equal(hasFiles({ types: [DRAG_MIME] }), false);
});
test("only audio and video files are taken from a drop, and the rest are counted", () => {
  const r = mediaFiles([{ name: "beat.WAV", type: "" }, { name: "x.txt", type: "text/plain" }, { name: "clip", type: "video/mp4" }, { name: "a.png", type: "image/png" }]);
  assert.deepEqual(r.ok.map((f) => f.name), ["beat.WAV", "clip"]); assert.equal(r.skipped, 2);
});
