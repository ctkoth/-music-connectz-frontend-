import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addSide, asFile, asPost, asUpload, listenable, matches, samePost, sideLabel, usesPost, withRecording } from "./inspirationSources.js";

class FakeForm { constructor() { this.rows = []; } append(k, v, name) { this.rows.push([k, name ? `${v.name}` : v]); } }
const file = { name: "r.wav" };

test("each side is sent under the server's names — a post by id, never by address", () => {
  const f = new FakeForm();
  addSide(f, "take", asPost({ id: 7, title: "My verse", author: "me", mine: true }));
  addSide(f, "reference", asPost({ id: 9, title: "Famous", author: "famous" }));
  assert.deepEqual(f.rows, [["take_post_id", "7"], ["reference_post_id", "9"]]);
  const g = new FakeForm();
  addSide(g, "take", asUpload({ id: 3, name: "a.wav" }));
  addSide(g, "reference", asFile(file));
  assert.deepEqual(g.rows, [["take_upload_id", "3"], ["reference", "r.wav"]]);
  const h = new FakeForm(); addSide(h, "take", null); assert.deepEqual(h.rows, []);
});

test("a post on either side means ⚡, and a file or FileZ upload does not", () => {
  assert.equal(usesPost(asFile(file), asFile(file)), false);
  assert.equal(usesPost(asUpload({ id: 1, name: "x" }), asFile(file)), false);
  assert.equal(usesPost(asPost({ id: 1, title: "t" }), asFile(file)), true);
  assert.equal(usesPost(null, asPost({ id: 1, title: "t" })), true);
});

test("only posts with a recording that is not known to be gone can be picked", () => {
  const posts = [
    { id: 1, media: { audio: "/a.mp3", video: "" } },
    { id: 2, media: { audio: "", video: "/v.mp4" } },
    { id: 3, media: { audio: "", video: "" } },                       // text/image post
    { id: 4, media: { audio: "/x.mp3" }, take_missing: true },       // the bytes are gone
  ];
  assert.deepEqual(withRecording(posts).map((p) => p.id), [1, 2]);
  assert.deepEqual(withRecording(null), []);
});

test("search matches title, artist or genre, and a blank query matches everything", () => {
  const p = { title: "Midnight Verse", author: "famous", genre: "Drill" };
  assert.ok(matches(p, "midnight") && matches(p, "FAMOUS") && matches(p, "drill") && matches(p, ""));
  assert.ok(!matches(p, "ballad"));
});

test("FileZ offers audio and video only", () => {
  assert.deepEqual(listenable([{ id: 1, content_type: "audio/wav" }, { id: 2, content_type: "image/png" },
                               { id: 3, content_type: "video/mp4" }, { id: 4 }]).map((u) => u.id), [1, 3]);
});

test("the same post on both sides is caught before the press", () => {
  assert.equal(samePost(asPost({ id: 5, title: "a" }), asPost({ id: 5, title: "a" })), true);
  assert.equal(samePost(asPost({ id: 5, title: "a" }), asPost({ id: 6, title: "b" })), false);
  assert.equal(samePost(asFile(file), asFile(file)), false);
});

test("a chosen side reads as what it is", () => {
  assert.equal(sideLabel(asPost({ id: 1, title: "Famous", author: "famous" })), "Famous — @famous");
  assert.equal(sideLabel(asPost({ id: 2, title: "Mine", author: "me", mine: true })), "Mine — your post");
  assert.equal(sideLabel(asUpload({ id: 3, name: "a.wav" })), "a.wav (FileZ)");
  assert.equal(sideLabel(null), "");
});

test("the screen states the ⚡ price beside the button and shows what was compared", () => {
  const src = readFileSync(new URL("./components/Inspiration.jsx", import.meta.url), "utf8");
  for (const needle of ["for using a post", "post_energy_cost", "res.sources", "same post on both sides", "ENERGY"]) {
    assert.ok(src.includes(needle), needle);
  }
});
