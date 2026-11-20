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

test("solo wins over mute, and arming is per track", () => {
  let s = addTrack(addTrack(newSession()));
  const [a, b, c] = s.tracks.map((t) => t.id);
  s = setTrack(s, a, { mute: true });
  assert.deepEqual(audible(s).map((t) => t.id), [b, c]);
  s = setTrack(s, c, { solo: true });
  assert.deepEqual(audible(s).map((t) => t.id), [c]);
  s = armTrack(armTrack(s, a), b);
  assert.equal(armedTrack(s).id, a);
  assert.equal(s.tracks.filter((t) => t.armed).length, 2);
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

import { armTrack as armT, armedTracks as armedTs, inputClash as clash, newSession as newS, addTrack as addT, setTrack as setT } from "./session.js";

test("several tracks can be armed, and two on the same input are named as a clash", () => {
  let s = addT(addT(newS()));
  const [a, b, c] = s.tracks.map((t) => t.id);
  s = armT(armT(s, a), b);
  assert.deepEqual(armedTs(s).map((t) => t.id), [a, b]);
  assert.ok(clash(armedTs(s)), "both on the default mic");
  s = setT(setT(s, a, { input: { device: "", channel: "left" } }), b, { input: { device: "", channel: "right" } });
  assert.equal(clash(armedTs(s)), null, "left and right of one device are two inputs");
  s = setT(s, b, { input: { device: "usb", channel: "both" } });
  assert.equal(clash(armedTs(s)), null);
  s = armT(s, a);
  assert.deepEqual(armedTs(s).map((t) => t.id), [b]);
  void c;
});

test("tracks stop at the tier's count (3 / 6 / unlimited), and a session over it keeps every track", async () => {
  const { addTrack, newSession, cleanSession, MAX_TRACKS } = await import("./session.js");
  let s = newSession();
  for (let i = 0; i < 5; i++) s = addTrack(s, undefined, 3);
  assert.equal(s.tracks.length, 3);
  for (let i = 0; i < 5; i++) s = addTrack(s, undefined, 6);
  assert.equal(s.tracks.length, 6);
  for (let i = 0; i < 20; i++) s = addTrack(s, undefined, null);
  assert.equal(s.tracks.length, 26);
  assert.equal(cleanSession(JSON.parse(JSON.stringify(s))).tracks.length, 26);   // over a lower cap: nothing is dropped
  assert.equal(addTrack(s, undefined, 3), s);
  assert.ok(MAX_TRACKS >= 100);
});

import { addMarker, updateMarker, removeMarker, sortedMarkers, markerAfter, markerBefore, cleanSession as _clean, cleanColor, cleanEmoji, setTrack as _setTrack, newSession as _new, MAX_MARKERS } from "./session.js";

test("markers: add at the playhead with a default name and colour, edit name, emoji, colour and time, remove", () => {
  let s = _new();
  s = addMarker(s, 12.5);
  assert.equal(s.markers.length, 1);
  assert.equal(s.markers[0].name, "Marker 1");
  assert.match(s.markers[0].color, /^#[0-9a-f]{6}$/);
  const id = s.markers[0].id;
  s = updateMarker(s, id, { name: "Verse 2", emoji: "🎤", color: "#FF0000", t: 20 });
  assert.deepEqual([s.markers[0].name, s.markers[0].emoji, s.markers[0].color, s.markers[0].t], ["Verse 2", "🎤", "#ff0000", 20]);
  assert.equal(removeMarker(s, id).markers.length, 0);
});

test("markers: two at one moment are nudged apart, order is by time, and next/previous find the neighbours", () => {
  let s = _new();
  s = addMarker(s, 30, { name: "Chorus" }); s = addMarker(s, 10, { name: "Intro" }); s = addMarker(s, 10, { name: "Intro 2" });
  const ts = sortedMarkers(s).map((m) => m.t);
  assert.ok(ts[0] < ts[1] && ts[1] < ts[2]);
  assert.equal(markerAfter(s, 5).name, "Intro");
  assert.equal(markerAfter(s, 31), null);
  assert.equal(markerBefore(s, 29).name, "Intro 2");
  assert.equal(markerBefore(s, 1), null);
});

test("markers: junk is repaired on load, a bad colour or letters-as-emoji are not kept, and the count is bounded", () => {
  const raw = { ...(_new()), markers: [{ id: "a", t: "7", name: "x".repeat(100), emoji: "abc", color: "red" }, { t: "nope" }, null] };
  const s = _clean(raw);
  assert.equal(s.markers.length, 1);
  assert.equal(s.markers[0].name.length, 40);
  assert.equal(s.markers[0].emoji, "");
  assert.match(s.markers[0].color, /^#[0-9a-f]{6}$/);
  let big = _new(); for (let i = 0; i < MAX_MARKERS + 20; i++) big = addMarker(big, i * 2);
  assert.equal(big.markers.length, MAX_MARKERS);
});

test("tracks: a name with an emoji, a colour and an emoji mark can be set, and a bad colour is refused", () => {
  let s = _new();
  const id = s.tracks[0].id;
  s = _setTrack(s, id, { name: "🔥 Lead vox", emoji: "🎤", color: "#a78bfa" });
  assert.deepEqual([s.tracks[0].name, s.tracks[0].emoji, s.tracks[0].color], ["🔥 Lead vox", "🎤", "#a78bfa"]);
  const before = s.tracks[0].color;
  assert.equal(_setTrack(s, id, { color: "javascript:alert(1)" }).tracks[0].color, before);
  assert.equal(cleanEmoji("🎤🥁🎸"), "🎤🥁");
  assert.equal(cleanEmoji("🇺🇸"), "🇺🇸");
  assert.equal(cleanColor("#ABCDEF"), "#abcdef");
});

import { snapIf as _snapIf, setSession as _setSession, SESSION_KEYS } from "./session.js";

test("snap: a click lands on the grid while Snap is on and exactly where it was while it is off", () => {
  let s = _setSession(_new(), { bpm: 120, grid: "1/4" });       // a quarter note is 0.5 s
  assert.equal(_snapIf(s, 1.3), 1.5);
  assert.equal(_snapIf(s, 1.2), 1);
  s = _setSession(s, { snap: false });
  assert.equal(_snapIf(s, 1.3), 1.3);
  assert.equal(_setSession(_new(), {}).snap, true);
});

test("project: the key is one of the twenty-four names or empty, and the name is kept short", () => {
  assert.equal(SESSION_KEYS.length, 24);
  assert.equal(_setSession(_new(), { key: "A minor" }).key, "A minor");
  assert.equal(_setSession(_new(), { key: "H sharp" }).key, "");
  assert.equal(_setSession(_new(), { name: "x".repeat(200) }).name.length, 60);
  assert.equal(_clean({ ..._new(), key: "Eb major", snap: false }).key, "Eb major");
  assert.equal(_clean({ ..._new(), key: "Eb major", snap: false }).snap, false);
});

import { projectTitle } from "./session.js";

test("a project is titled Genre - Key - Name, leaving out what is not set, and keeps its genre and skills used", () => {
  const s = _setSession(_new("Late night"), { genre: "Trap", key: "F minor", skills: ["rapping", "mixing", "rapping"] });
  assert.equal(projectTitle(s), "Trap - F minor - Late night");
  assert.equal(projectTitle(_new("Late night")), "Late night");
  assert.deepEqual(s.skills, ["rapping", "mixing"]);
  assert.equal(_setSession(s, { skills: Array.from({ length: 30 }, (_, i) => `s${i}`) }).skills.length, 12);
  const back = _clean(JSON.parse(JSON.stringify(s)));
  assert.deepEqual([back.genre, back.key, back.skills], ["Trap", "F minor", ["rapping", "mixing"]]);
});

import { recordInto as _rec, addSource as _addSource, addRegion as _addRegion, setTrack as _st, playlistOf as _pl, REC_MODES } from "./session.js";

function withTake(mode) {
  let s = _addSource(_new(), { id: "old", name: "Old", duration: 10, channels: 1, rate: 48000 });
  const id = s.tracks[0].id;
  s = _addRegion(s, id, { src: "old", at: 0, name: "Old" });
  s = _st(s, id, { recMode: mode });
  s = _addSource(s, { id: "new", name: "New", duration: 2, channels: 1, rate: 48000 });
  return { ..._rec(s, id, { src: "new", at: 4, name: "New" }), id };
}

test("record modes: Takes keeps the old take on a new playlist, Replace cuts it out for good, Overdub layers over it", () => {
  const takes = withTake("takes"), replace = withTake("replace"), over = withTake("overdub");
  const t = (r) => r.session.tracks[0];
  assert.equal(takes.keptPrevious, true);
  assert.equal(t(takes).playlists.length, 2);
  assert.equal(replace.keptPrevious, false);
  assert.equal(t(replace).playlists.length, 1);
  assert.ok(_pl(t(replace)).regions.filter((r) => r.src === "old").every((r) => r.out - r.in + r.at <= 4 || r.at >= 6), "the old audio is gone from 4 to 6 s");
  assert.equal(over.keptPrevious, false);
  const regs = _pl(t(over)).regions;
  assert.equal(regs.length, 2);
  assert.equal(regs.find((r) => r.src === "old").out, 10, "overdub leaves the old region whole");
  assert.deepEqual(Object.keys(REC_MODES), ["takes", "replace", "overdub"]);
  assert.equal(_st(_new(), _new().tracks[0].id, {}).tracks[0].recMode, "takes");
});
