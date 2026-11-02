import test from "node:test";
import assert from "node:assert/strict";
import {
  addRegion, addSource, addTrack, armTrack, armedTrack, audible, barsBeats, cleanSession, deletePlaylist, duplicateRegion,
  endOf, findRegion, recordInto, lengthOf, moveRegion, newPlaylist, newSession, nudgeRegion, regionsOf, removeRegion, removeTrack,
  setSession, setTrack, snapTime, splitRegion, switchPlaylist, trimRegion, updateRegion,
} from "./session.js";
import { PLUGINS, cleanInsert, cleanInserts, delaySeconds, makeImpulse, newInsert } from "./plugins.js";

const withSource = (s, id = "s1", duration = 10) => addSource(s, { id, name: "Vox", duration });
const first = (s) => s.tracks[0];
const regions = (s, i = 0) => regionsOf(s.tracks[i]);

test("a new session has one track with one playlist and nothing on it", () => {
  const s = newSession();
  assert.equal(s.tracks.length, 1);
  assert.equal(first(s).playlists.length, 1);
  assert.equal(lengthOf(s), 0);
});

test("a region plays the whole source by default, and the session is as long as its last region", () => {
  let s = withSource(newSession());
  s = addRegion(s, first(s).id, { src: "s1", at: 2 });
  const [r] = regions(s);
  assert.deepEqual([r.at, r.in, r.out], [2, 0, 10]);
  assert.equal(lengthOf(s), 12);
});

test("a region needs a real source", () => {
  const s = addRegion(newSession(), "x", { src: "nope" });
  assert.equal(regions(s).length, 0);
});

test("grid mode lands a region on the nearest grid line; slip leaves it where it was put", () => {
  let s = setSession(withSource(newSession()), { editMode: "grid", grid: "1/4", bpm: 120 });   // beat = 0.5 s
  s = addRegion(s, first(s).id, { src: "s1", at: 1.26 });
  assert.equal(regions(s)[0].at, 1.5);
  s = setSession(s, { editMode: "slip" });
  s = moveRegion(s, regions(s)[0].id, 1.26);
  assert.equal(regions(s)[0].at, 1.26);
  assert.equal(snapTime(s, 1.74), 1.5);
});

test("shuffle mode packs a track end to end, and deleting closes the gap", () => {
  let s = setSession(withSource(withSource(newSession(), "a", 2), "b", 3), { editMode: "shuffle" });
  const t = first(s).id;
  s = addRegion(s, t, { src: "a", at: 0 });
  s = addRegion(s, t, { src: "b", at: 9 });
  assert.deepEqual(regions(s).map((r) => r.at), [0, 2]);
  s = addRegion(s, t, { src: "a", at: 20 });
  s = removeRegion(s, regions(s)[1].id);
  assert.deepEqual(regions(s).map((r) => r.at), [0, 2]);
});

test("a split plays exactly what the one region did", () => {
  let s = withSource(newSession());
  s = addRegion(s, first(s).id, { src: "s1", at: 1 });
  s = splitRegion(s, regions(s)[0].id, 4);
  const [a, b] = regions(s);
  assert.deepEqual([a.at, a.in, a.out], [1, 0, 3]);
  assert.deepEqual([b.at, b.in, b.out], [4, 3, 10]);
  assert.equal(endOf(b), 11);
});

test("splitting at an edge does nothing", () => {
  let s = withSource(newSession());
  s = addRegion(s, first(s).id, { src: "s1", at: 1 });
  assert.equal(regions(splitRegion(s, regions(s)[0].id, 1)).length, 1);
});

test("a trim can never play audio the source does not have", () => {
  let s = withSource(newSession());
  s = addRegion(s, first(s).id, { src: "s1", at: 5 });
  const id = regions(s)[0].id;
  s = trimRegion(s, id, "start", 0);            // earlier than the source starts
  assert.deepEqual([regions(s)[0].at, regions(s)[0].in], [5, 0]);
  s = trimRegion(s, id, "end", 100);
  assert.equal(regions(s)[0].out, 10);
  s = trimRegion(s, id, "start", 7);
  assert.deepEqual([regions(s)[0].at, regions(s)[0].in, regions(s)[0].out], [7, 2, 10]);
});

test("fades never overlap or outlast the region", () => {
  let s = withSource(newSession(), "s1", 4);
  s = addRegion(s, first(s).id, { src: "s1" });
  s = updateRegion(s, regions(s)[0].id, { fadeIn: 3, fadeOut: 3 });
  const r = regions(s)[0];
  assert.equal(r.fadeIn, 3);
  assert.equal(r.fadeOut, 1);
});

test("duplicate lands straight after the original, and nudge moves by grid steps", () => {
  let s = setSession(withSource(newSession(), "s1", 2), { bpm: 120, grid: "1/4" });
  s = addRegion(s, first(s).id, { src: "s1", at: 1 });
  s = duplicateRegion(s, regions(s)[0].id);
  assert.deepEqual(regions(s).map((r) => r.at), [1, 3]);
  s = nudgeRegion(s, regions(s)[0].id, -1);
  assert.equal(regions(s)[0].at, 0.5);
  assert.equal(s.editMode, "slip");
});

test("a region can move to another track", () => {
  let s = addTrack(withSource(newSession()));
  s = addRegion(s, first(s).id, { src: "s1" });
  s = moveRegion(s, regions(s)[0].id, 3, s.tracks[1].id);
  assert.equal(regions(s, 0).length, 0);
  assert.equal(regions(s, 1)[0].at, 3);
});

test("playlists: a new take starts empty, a copy starts from the current one, and switching keeps both", () => {
  let s = withSource(newSession());
  const t = first(s).id;
  s = addRegion(s, t, { src: "s1" });
  s = newPlaylist(s, t);
  assert.equal(regions(s).length, 0);
  assert.equal(first(s).active, 1);
  s = switchPlaylist(s, t, 0);
  assert.equal(regions(s).length, 1);
  s = newPlaylist(s, t, { copy: true });
  assert.equal(regions(s).length, 1);
  assert.notEqual(regions(s)[0].id, first(s).playlists[0].regions[0].id);
});

test("deleting a playlist keeps at least one, and drops audio nothing plays any more", () => {
  let s = withSource(newSession());
  const t = first(s).id;
  s = deletePlaylist(s, t);
  assert.equal(first(s).playlists.length, 1);
  s = newPlaylist(s, t);
  s = addRegion(s, t, { src: "s1" });
  s = deletePlaylist(s, t);
  assert.equal(first(s).playlists.length, 1);
  assert.deepEqual(Object.keys(s.sources), []);
});

test("solo wins over mute, and only one track is armed at a time", () => {
  let s = addTrack(addTrack(newSession()));
  const [a, b, c] = s.tracks.map((t) => t.id);
  s = setTrack(s, a, { mute: true });
  assert.deepEqual(audible(s).map((t) => t.id), [b, c]);
  s = setTrack(s, c, { solo: true });
  assert.deepEqual(audible(s).map((t) => t.id), [c]);
  s = armTrack(armTrack(s, a), b);
  assert.equal(armedTrack(s).id, b);
  assert.equal(s.tracks.filter((t) => t.armed).length, 1);
});

test("the last track cannot be removed", () => {
  const s = newSession();
  assert.equal(removeTrack(s, first(s).id).tracks.length, 1);
});

test("the counter reads bar | beat | tick", () => {
  const s = setSession(newSession(), { bpm: 120, meter: 4 });
  assert.equal(barsBeats(s, 0), "1|1|000");
  assert.equal(barsBeats(s, 2.25), "2|1|480");
});

test("values out of range are clamped, not refused", () => {
  const s = setSession(newSession(), { bpm: 999, editMode: "warp", grid: "1/3" });
  assert.deepEqual([s.bpm, s.editMode, s.grid], [300, "slip", "1/4"]);
  const t = setTrack(s, first(s).id, { gain: 40, pan: -9 });
  assert.deepEqual([first(t).gain, first(t).pan], [12, -1]);
});

test("a stored session is repaired: missing sources drop their regions, armed is never restored", () => {
  const raw = {
    name: "Old", bpm: "90", sources: { a: { name: "A", duration: 3 } },
    tracks: [{ id: "t", armed: true, playlists: [{ id: "p", regions: [{ id: "r1", src: "a", at: 1, in: 0, out: 3 }, { id: "r2", src: "gone", at: 0, in: 0, out: 1 }] }] }],
  };
  const s = cleanSession(raw);
  assert.equal(s.bpm, 90);
  assert.equal(regions(s).length, 1);
  assert.equal(first(s).armed, false);
  assert.ok(findRegion(s, "r1"));
  assert.equal(cleanSession(null).tracks.length, 1);
});

// ---- plugins ----

test("every plugin's defaults sit inside its own ranges", () => {
  for (const [type, spec] of Object.entries(PLUGINS)) {
    const ins = newInsert(type);
    for (const [k, p] of Object.entries(spec.params)) {
      assert.ok(p.min <= ins.params[k] && ins.params[k] <= p.max, `${type}.${k}`);
    }
  }
});

test("an insert is repaired on load: unknown types are dropped, params clamped", () => {
  assert.equal(cleanInsert({ type: "vst3" }), null);
  const c = cleanInsert({ type: "comp", params: { ratio: 99, threshold: "x" } });
  assert.equal(c.params.ratio, 20);
  assert.equal(c.params.threshold, PLUGINS.comp.params.threshold.default);
  assert.equal(cleanInserts([{ type: "eq" }, { type: "nope" }]).length, 1);
});

test("a synced delay follows the tempo", () => {
  assert.equal(delaySeconds({ sync: 1, time: 999 }, 120), 0.5);
  assert.equal(delaySeconds({ sync: 0, time: 250 }, 120), 0.25);
});

test("the reverb room is the same every time it is made", () => {
  const a = makeImpulse(8000, 0.5);
  const b = makeImpulse(8000, 0.5);
  assert.equal(a[0].length, 4000);
  assert.deepEqual(Array.from(a[1].slice(0, 20)), Array.from(b[1].slice(0, 20)));
});


test("recording over a take cuts it on a NEW playlist, so the old take is one switch away", () => {
  let s = withSource(withSource(newSession(), "old", 10), "new", 2);
  const t = first(s).id;
  s = addRegion(s, t, { src: "old", at: 0 });
  const { session, keptPrevious } = recordInto(s, t, { src: "new", at: 4 });
  assert.ok(keptPrevious);
  assert.equal(session.tracks[0].playlists.length, 2);
  const now = regionsOf(session.tracks[0]).map((r) => [r.src, r.at, r.in, r.out]);
  assert.deepEqual(now, [["old", 0, 0, 4], ["new", 4, 0, 2], ["old", 6, 6, 10]]);
  const before = session.tracks[0].playlists[0].regions;
  assert.deepEqual(before.map((r) => [r.src, r.at, r.out]), [["old", 0, 10]]);
});

test("recording into empty space just adds the take", () => {
  let s = withSource(newSession(), "new", 2);
  const { session, keptPrevious } = recordInto(s, first(s).id, { src: "new", at: 3 });
  assert.equal(keptPrevious, false);
  assert.equal(session.tracks[0].playlists.length, 1);
  assert.equal(regionsOf(session.tracks[0])[0].at, 3);
});
