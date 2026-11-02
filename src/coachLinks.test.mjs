import test from "node:test";
import assert from "node:assert/strict";
import { coachLinkVerdict } from "./coachLinks.js";

const links = { note: "watched from the address", apps: [
  { label: "YouTube", ok: true, note: "watched from the address" },
  { label: "Instagram", ok: false, why: "Save your reel from Instagram and attach it." }] };

test("a YouTube Short is ok and says the server's note", () => {
  const v = coachLinkVerdict("https://www.youtube.com/shorts/dQw4w9WgXcQ", links);
  assert.equal(v.state, "ok");
  assert.equal(v.text, "watched from the address");
});

test("a reel app is refused with the server's sentence, before the press", () => {
  const v = coachLinkVerdict("instagram.com/reel/abc", links);
  assert.equal(v.state, "no");
  assert.equal(v.label, "Instagram");
  assert.match(v.text, /attach it/);
  assert.equal(coachLinkVerdict("https://vm.tiktok.com/x", links).label, "TikTok");
});

test("a lookalike host is not YouTube, and blank is empty", () => {
  assert.equal(coachLinkVerdict("https://youtube.com.evil.example/watch?v=x", links).state, "no");
  assert.equal(coachLinkVerdict("  ", links).state, "empty");
});
