// The pure half of the four edit controls. Each rule here mirrors a server rule
// the screen would otherwise have to discover by being refused.
import test from "node:test";
import assert from "node:assert/strict";
import {
  canEditComment, editWindowLeft, journalDraftFromEntry, journalEditItems,
  playlistEditPayload, titleKeptNote,
} from "./editing.js";

const T0 = Date.parse("2026-10-15T12:00:00Z");

test("the window is the server's number, counted down, never negative", () => {
  const at = "2026-10-15T12:00:00Z";
  assert.equal(editWindowLeft(at, 240, T0), 240);
  assert.equal(editWindowLeft(at, 240, T0 + 100_000), 140);
  assert.equal(editWindowLeft(at, 240, T0 + 999_000), 0);
});

test("the server's microsecond timestamps still count", () => {
  assert.equal(editWindowLeft("2026-10-15T12:00:00.123456+00:00", 240, T0), 240);
  assert.equal(editWindowLeft("2026-10-15T12:00:00.123456Z", 240, T0 + 40_000), 200);
});

test("no served window means no window, and a bad timestamp is no window", () => {
  assert.equal(editWindowLeft("2026-10-15T12:00:00Z", undefined, T0), null);
  assert.equal(editWindowLeft("2026-10-15T12:00:00Z", null, T0), null);
  assert.equal(editWindowLeft("not a date", 240, T0), null);
});

test("a comment is editable only by the username that wrote it", () => {
  assert.equal(canEditComment({ user: "corey" }, "corey"), true);
  assert.equal(canEditComment({ user: "corey" }, "someone"), false);
  assert.equal(canEditComment({ user: "corey" }, ""), false);
  assert.equal(canEditComment({ user: "corey" }, undefined), false);
  assert.equal(canEditComment(null, "corey"), false);
});

test("a journal entry without coordinates prefills no pin", () => {
  const d = journalDraftFromEntry({
    day: "2026-10-14", title: "t", body: "b", mood: "calm", weather: "",
    tags: ["a"], people: ["x"], visibility: "restricted",
    place: { name: "Lagos", lat: null, lng: null, exact: false },
  });
  assert.equal(d.coords, null);
  assert.equal(d.placeName, "Lagos");
  assert.equal(d.visibility, "restricted");
  assert.deepEqual(d.tags, ["a"]);
});

test("a journal entry with coordinates keeps the pin and the exact flag", () => {
  const d = journalDraftFromEntry({
    day: "2026-10-14", title: "", body: "", tags: [], people: [],
    place: { name: "", lat: 6.5, lng: 3.4, exact: true }, visibility: "public",
  });
  assert.deepEqual(d.coords, { lat: 6.5, lng: 3.4 });
  assert.equal(d.placeExact, true);
});

test("an edit keeps the entry's existing attachments and appends new ones", () => {
  const old = [{ url: "/a.mp3", type: "audio" }];
  const fresh = [{ url: "/b.png", type: "image" }];
  assert.deepEqual(journalEditItems(old, fresh), [...old, ...fresh]);
  assert.deepEqual(journalEditItems(old, []), old);
  assert.deepEqual(journalEditItems(undefined, undefined), []);
});

test("a blank playlist title is refused before the server can ignore it", () => {
  const r = playlistEditPayload({ title: "   ", description: "" }, { title: "Old", description: "" });
  assert.ok(r.error);
  assert.equal(r.body, undefined);
});

test("only the changed playlist fields are sent", () => {
  const orig = { title: "Old", description: "d" };
  assert.deepEqual(playlistEditPayload({ title: "New", description: "d" }, orig).body, { title: "New" });
  assert.deepEqual(playlistEditPayload({ title: "Old", description: "e" }, orig).body, { description: "e" });
  assert.deepEqual(playlistEditPayload({ title: " Old ", description: "d" }, orig).body, {});
});

test("a title the server cut is reported with the length it kept", () => {
  const sent = "x".repeat(200);
  assert.match(titleKeptNote(sent, "x".repeat(160)), /kept the first 160 characters/);
  assert.equal(titleKeptNote("Short", "Short"), "");
  assert.equal(titleKeptNote("Short", ""), "");
});
