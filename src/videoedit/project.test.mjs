// VideoZ: the multitrack model, the edits, and the look maths.
import test from "node:test";
import assert from "node:assert/strict";
import {
  activeAt, addClips, addTrack, blockedReason, cleanClip, closeGaps, clipsOn, duplicateClip, endOf,
  lengthOf, moveClip, moveTrack, newProject, orderByTaken, pickRecordType, removeTrack, setTrack, snap,
  splitClip, trackName, trimClip, kindOfFile, MAX_SECONDS,
} from "./project.js";
import { adjustPixels, cssFilter, fitRect, lookOf, placeRect, warmthTint, zoomAt } from "./look.js";

const vid = (name, duration, extra = {}) => ({ kind: "video", name, src: `blob:${name}`, duration, ...extra });
const pic = (name, extra = {}) => ({ kind: "image", name, src: `blob:${name}`, ...extra });
const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;

test("clips added together land end to end, in order, on the bottom video track", () => {
  const p = addClips(newProject(), [vid("a", 4), pic("b", { seconds: 2 }), vid("c", 3)]);
  const bottom = p.tracks.filter((t) => t.kind === "video").at(-1).id;
  const on = clipsOn(p, bottom);
  assert.deepEqual(on.map((c) => c.name), ["a", "b", "c"]);
  assert.deepEqual(on.map((c) => c.at), [0, 4, 6]);
  assert.equal(lengthOf(p), 9);
});

test("a title goes on the TOP video track, audio on an audio track", () => {
  const p = addClips(addClips(newProject(), [{ kind: "text", text: "Hi" }]), [{ kind: "audio", name: "beat", src: "x", duration: 10 }]);
  const v = p.tracks.filter((t) => t.kind === "video");
  assert.equal(p.clips[0].track, v[0].id);
  assert.equal(p.tracks.find((t) => t.id === p.clips[1].track).kind, "audio");
});

test("an upper track plays OVER a lower one: layers come bottom first", () => {
  let p = addClips(newProject(), [vid("main", 10)]);
  const top = p.tracks[0].id;
  p = addClips(p, [pic("pip", { seconds: 5, scale: 30 })], { track: top, at: 2 });
  const { video } = activeAt(p, 3);
  assert.deepEqual(video.map((L) => L.clip.name), ["main", "pip"]);
  assert.deepEqual(activeAt(p, 8).video.map((L) => L.clip.name), ["main"]);
});

test("overlapping clips on one track crossfade: the incoming rises, the outgoing stays solid", () => {
  let p = addClips(newProject(), [vid("a", 4), vid("b", 4)]);
  const b = p.clips.find((c) => c.name === "b");
  p = moveClip(p, b.id, 3);                   // 1s overlap
  const mid = activeAt(p, 3.5).video;
  assert.equal(mid.find((L) => L.clip.name === "a").alpha, 1);
  assert.ok(close(mid.find((L) => L.clip.name === "b").alpha, 0.5));
  // The sound crossfades both ways.
  const au = activeAt(p, 3.5).audio;
  assert.ok(close(au.find((x) => x.clip.name === "a").gain, 0.5));
  assert.ok(close(au.find((x) => x.clip.name === "b").gain, 0.5));
});

test("a clip's speed changes how long it holds the screen and where in the file it is", () => {
  const p = addClips(newProject(), [vid("a", 10, { speed: 2 })]);
  assert.equal(lengthOf(p), 5);
  assert.ok(close(activeAt(p, 1).video[0].media, 2));
});

test("mute hides a track, solo plays only the soloed track of its kind", () => {
  let p = addClips(newProject(), [vid("main", 5)]);
  p = addClips(p, [pic("over", { seconds: 5 })], { track: p.tracks[0].id, at: 0 });
  assert.equal(activeAt(setTrack(p, p.tracks[0].id, { mute: true }), 1).video.length, 1);
  assert.deepEqual(activeAt(setTrack(p, p.tracks[0].id, { solo: true }), 1).video.map((L) => L.clip.name), ["over"]);
});

test("a whole-video fade from and to black", () => {
  const p = { ...addClips(newProject(), [vid("a", 10)]), fadeIn: 2, fadeOut: 2 };
  assert.ok(close(activeAt(p, 1).master, 0.5));
  assert.ok(close(activeAt(p, 9).master, 0.5));
  assert.equal(activeAt(p, 5).master, 1);
});

test("split cuts a clip in two at the playhead, each holding its half of the file", () => {
  let p = addClips(newProject(), [vid("a", 10, { in: 1, out: 9 })]);
  p = splitClip(p, p.clips[0].id, 3);
  const [a, b] = [...p.clips].sort((x, y) => x.at - y.at);
  assert.equal(p.clips.length, 2);
  assert.ok(close(a.out, 4) && close(b.in, 4) && close(b.at, 3) && close(endOf(b), 8));
  assert.equal(splitClip(p, a.id, 99), p);   // outside the clip: nothing
});

test("trimming can never stretch a video past what the file holds; a photo is as long as you make it", () => {
  let p = addClips(newProject(), [vid("a", 5)]);
  const id = p.clips[0].id;
  p = trimClip(p, id, "end", 20);
  assert.equal(endOf(p.clips[0]), 5);
  p = trimClip(p, id, "start", 2);
  assert.ok(close(p.clips[0].in, 2) && close(p.clips[0].at, 2));
  p = trimClip(p, id, "start", 0);           // give the start back
  assert.equal(p.clips[0].in, 0);
  let q = addClips(newProject(), [pic("p", { seconds: 3 })]);
  q = trimClip(q, q.clips[0].id, "end", 8);
  assert.equal(q.clips[0].seconds, 8);
});

test("close gaps and order-by-taken lay a track end to end from 0:00", () => {
  let p = addClips(newProject(), [pic("late", { taken: 300 }), pic("early", { taken: 100 }), pic("mid", { taken: 200 })]);
  const track = p.clips[0].track;
  p = moveClip(p, p.clips[1].id, 20);
  p = closeGaps(p, track);
  assert.equal(lengthOf(p), 9);
  p = orderByTaken(p, track);
  assert.deepEqual(clipsOn(p, track).map((c) => c.name), ["early", "mid", "late"]);
});

test("a clip only moves to a track of its own kind", () => {
  const p = addClips(newProject(), [vid("a", 3)]);
  const audio = p.tracks.find((t) => t.kind === "audio").id;
  assert.equal(moveClip(p, p.clips[0].id, 1, audio).clips[0].track, p.clips[0].track);
});

test("tracks: new video goes on top, names follow position, the last video track stays", () => {
  let p = addTrack(newProject(), "video");
  assert.equal(trackName(p, p.tracks[0].id), "Video 1");
  p = moveTrack(p, p.tracks[0].id, 1);
  assert.equal(p.tracks[0].kind, "video");
  let q = newProject();
  q = removeTrack(q, "v1");
  assert.equal(removeTrack(q, "v2"), q);
});

test("duplicate places the copy straight after the clip", () => {
  const p = duplicateClip(addClips(newProject(), [vid("a", 3)]), undefined);
  const q = addClips(newProject(), [vid("a", 3)]);
  const d = duplicateClip(q, q.clips[0].id);
  assert.equal(p.clips.length, 1);
  assert.equal(d.clips[1].at, 3);
});

test("snap finds the nearest edge within the tolerance, and nothing outside it", () => {
  const p = addClips(newProject(), [vid("a", 3)]);
  assert.equal(snap(p, 3.1), 3);
  assert.equal(snap(p, 3.5), 3.5);
  assert.equal(snap(p, 7.05, { playhead: 7 }), 7);
});

test("export says why it cannot run, before it is pressed", () => {
  assert.match(blockedReason(newProject()), /at least one/);
  assert.match(blockedReason(addClips(newProject(), [vid("a", 0)])), /loading/);
  assert.equal(blockedReason(addClips(newProject(), [vid("a", 3)])), "");
  const long = addClips(newProject(), [vid("a", MAX_SECONDS + 5)]);
  assert.match(blockedReason(long), /playback speed/);
  assert.match(blockedReason(long, { recorder: false }), /can't record/);
});

test("values are clamped, never trusted", () => {
  const c = cleanClip({ kind: "image", seconds: 999, opacity: 500, scale: -3, speed: 9, filter: "nope" });
  assert.equal(c.seconds, 60);
  assert.equal(c.opacity, 100);
  assert.equal(c.scale, 5);
  assert.equal(c.speed, 1);
  assert.equal(c.filter, "none");
  assert.equal(kindOfFile("application/pdf"), null);
});

test("MP4 is recorded when the browser can, WebM otherwise", () => {
  assert.match(pickRecordType((t) => t.startsWith("video/mp4")), /^video\/mp4/);
  assert.match(pickRecordType((t) => t === "video/webm"), /^video\/webm/);
  assert.equal(pickRecordType(() => false), "");
});

// ---- the look ----

test("a filter is a starting point and the member's sliders go on top", () => {
  assert.equal(lookOf({ filter: "bw" }).saturation, -100);
  assert.equal(lookOf({ filter: "bw", adj: { saturation: -40 } }).saturation, -40);
  assert.equal(cssFilter(lookOf({})), "none");
  assert.match(cssFilter(lookOf({ filter: "vintage" })), /sepia/);
});

test("the pixel fallback matches the CSS maths: B&W makes grey, brightness brightens", () => {
  const px = Uint8ClampedArray.from([200, 50, 50, 255]);
  adjustPixels(px, { saturation: -100 });
  assert.ok(Math.abs(px[0] - px[1]) <= 1 && Math.abs(px[1] - px[2]) <= 1);
  const b = Uint8ClampedArray.from([100, 100, 100, 255]);
  adjustPixels(b, { brightness: 20 });
  assert.equal(b[0], 120);
  assert.equal(b[3], 255);
});

test("framing: cover fills and crops, contain letterboxes, a picture-in-picture shrinks and moves", () => {
  const cover = fitRect(1920, 1080, 720, 1280, "cover");
  assert.ok(cover.h === 1280 && cover.w > 720);
  const contain = fitRect(1920, 1080, 720, 1280, "contain");
  assert.ok(contain.w === 720 && contain.h < 1280);
  const pip = placeRect({ x: 0, y: 0, w: 1280, h: 720 }, { scale: 25, x: 30, y: -30 }, 1280, 720);
  assert.equal(pip.w, 320);
  assert.ok(pip.x > 640 && pip.y < 360);
  assert.equal(zoomAt("in", 5, 10), 1.06);
  assert.equal(warmthTint(0), null);
});

// ---- lip-sync ----
import { cleanBox, cleanLip, mouthAt, mouthFor, voiceTrack } from "./lipsync.js";

const SR = 16000;
// Half a second of silence, then half a second of a voiced "ah", then silence again.
function speechLike() {
  const x = new Float32Array(SR * 1.5);
  for (let i = SR * 0.5; i < SR; i++) x[i] = 0.3 * Math.sin((2 * Math.PI * 700 * i) / SR) * Math.sin((2 * Math.PI * 4 * i) / SR) ** 2;
  return x;
}

test("the mouth opens while the voice sounds and closes in the silence around it", () => {
  const tr = voiceTrack(speechLike(), SR);
  assert.ok(mouthAt(tr, 0.25).open < 0.05, "closed before the voice");
  assert.ok(Math.max(...tr.open.slice(35, 58)) > 0.5, "open during it");
  assert.ok(mouthAt(tr, 1.4).open < 0.1, "closed again after");
  assert.equal(mouthAt(tr, 99).open, 0);
});

test("a dark vowel rounds the mouth and a bright one widens it", () => {
  // Sound with silence either side, so the mouth has a closed to open from.
  const tone = (hz) => Float32Array.from({ length: SR * 1.5 }, (_, i) => (i > SR * 0.5 && i < SR ? 0.3 * Math.sin((2 * Math.PI * hz * i) / SR) : 0));
  const dark = voiceTrack(tone(400), SR), bright = voiceTrack(tone(3000), SR);
  assert.ok(mouthAt(dark, 0.85).open > 0.3 && mouthAt(dark, 0.85).wide < 0, "oo is round");
  assert.ok(mouthAt(bright, 0.85).open > 0.3 && mouthAt(bright, 0.85).wide > 0, "ee is wide");
});

test("a quiet recording moves the mouth as much as a loud one", () => {
  const loud = voiceTrack(speechLike(), SR);
  const quiet = voiceTrack(speechLike().map((v) => v * 0.05), SR);
  assert.ok(Math.abs(Math.max(...loud.open) - Math.max(...quiet.open)) < 0.1);
});

test("the voice that drives a photo: the whole mix, or one named clip and closed when it is not playing", () => {
  const tr = { track: voiceTrack(speechLike(), SR) };
  const tracks = new Map([["a", tr], ["b", tr]]);
  const audible = [{ clip: { id: "A", src: "a" }, media: 0.75, gain: 1 }, { clip: { id: "B", src: "b" }, media: 0.1, gain: 1 }];
  assert.ok(mouthFor("mix", audible, tracks).open > 0.4);
  assert.ok(mouthFor("B", audible, tracks).open < 0.05);
  assert.equal(mouthFor("C", audible, tracks).open, 0);
});

test("the mouth box stays inside the photo, and lip-sync is off until switched on", () => {
  const b = cleanBox({ x: 0.95, y: -1, w: 0.2, h: 0.1 });
  assert.ok(b.x + b.w <= 1 && b.y === 0);
  assert.deepEqual(cleanLip(undefined).on, false);
  assert.equal(cleanLip({ on: true }).source, "mix");
  assert.equal(cleanClip({ kind: "video", lip: { on: true } }).lip.on, false);
});
