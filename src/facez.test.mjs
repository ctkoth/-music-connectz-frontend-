import test from "node:test";
import assert from "node:assert/strict";
import { FACE_FEED_NOTE, tagOutcome, unknownTagLine } from "./facez.js";

test("no tag asked for is no outcome to report", () => {
  assert.deepEqual(tagOutcome("", { face: { tagged: "" } }), { state: "none" });
  assert.deepEqual(tagOutcome("   ", { face: { tagged: "" } }), { state: "none" });
  assert.deepEqual(tagOutcome(undefined, {}), { state: "none" });
});

test("a tag the server kept is tagged — whatever the case it was typed in", () => {
  assert.deepEqual(tagOutcome("Steve515", { face: { tagged: "Steve515" } }), { state: "tagged", handle: "Steve515" });
  assert.equal(tagOutcome("steve515", { face: { tagged: "Steve515" } }).state, "tagged");
  assert.equal(tagOutcome("@steve515", { face: { tagged: "steve515" } }).state, "tagged");
});

test("a tag the server dropped is reported by the handle that was typed", () => {
  const o = tagOutcome("@nobody_here", { face: { tagged: "" } });
  assert.deepEqual(o, { state: "unknown", handle: "nobody_here" });
  assert.equal(tagOutcome("ghost", {}).state, "unknown");           // no face in the answer at all
  assert.equal(tagOutcome("ghost", null).state, "unknown");
});

test("the unknown-handle line says the photo was added and nobody was told", () => {
  const t = unknownTagLine("ghost");
  assert.match(t, /^No member called @ghost/);
  assert.match(t, /photo was added/);
  assert.match(t, /nobody was tagged or told/);
});

test("the feed note says every face enters the feed, who scores it, and the only way out", () => {
  assert.match(FACE_FEED_NOTE, /Every face you add/);
  assert.match(FACE_FEED_NOTE, /18\+ Rate faces feed/);
  assert.match(FACE_FEED_NOTE, /score it 1–10 on looks/);
  assert.match(FACE_FEED_NOTE, /no setting to keep a face out/);
  assert.match(FACE_FEED_NOTE, /deleting it from FaceZ/);
});
