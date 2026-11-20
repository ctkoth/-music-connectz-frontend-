import test from "node:test";
import assert from "node:assert/strict";
import { designPosts, imageOf, notesFromHandoff } from "./designz.js";

const KEYS = new Set(["photoshop", "figma"]);

test("a picture, in either shape the server sends, is found", () => {
  assert.equal(imageOf({ media: { image: "/m/1/a.png" } }), "/m/1/a.png");
  assert.equal(imageOf({ media_type: "image", media_url: "/m/2/b.png" }), "/m/2/b.png");
  assert.equal(imageOf({ media_type: "audio", media_url: "/m/3/c.wav" }), "");
  assert.equal(imageOf(null), "");
});

test("a design is a post with a picture or one naming a design skill; nothing else is padded in", () => {
  const posts = [
    { id: 1, media: { image: "/a.png" } },
    { id: 2, media_type: "audio", media_url: "/t.wav", skills_used: ["mixing"] },
    { id: 3, skills_used: ["figma"] },
    { id: 4 },
    { media: { image: "/x.png" } },                  // no id: unusable
  ];
  assert.deepEqual(designPosts(posts, KEYS).map((p) => p.id), [1, 3]);
  assert.deepEqual(designPosts(null, KEYS), []);
  assert.deepEqual(designPosts(posts, ["figma"]).map((p) => p.id), [1, 3]);
});

test("coach notes are taken only in the shape the server sends, with every label present", () => {
  const ok = { notes: { overall: 7.2, verdict: "Strong", next: "Crop tighter", scores: { composition: { label: "Composition", score: 8, why: "Thirds", how: "Move the horizon" }, light: { label: "Light", score: null, why: "Flat", how: "" } } }, image: "data:image/png;base64,AAAA" };
  const n = notesFromHandoff(ok);
  assert.equal(n.rows.length, 2);
  assert.equal(n.rows[1].score, null);               // an unscored dimension stays null, never 0
  assert.equal(n.overall, 7.2);
  assert.equal(n.image, "data:image/png;base64,AAAA");
  assert.equal(notesFromHandoff({ ...ok, image: "https://evil.example/x.png" }).image, "");   // only a data image is shown
  assert.equal(notesFromHandoff({ notes: { scores: { a: { score: 5 } } } }), null);          // no label: not drawn
  assert.equal(notesFromHandoff(null), null);
  assert.equal(notesFromHandoff({ notes: {} }), null);
});
