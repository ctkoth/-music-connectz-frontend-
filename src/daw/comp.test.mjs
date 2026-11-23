import test from "node:test";
import assert from "node:assert/strict";
import { newSession, addSource, cleanSession, endOf } from "./session.js";
import { swipeComp, startComp, clearComp, compIndex, compSpans, XFADE } from "./comp.js";

// A track with three takes of the same 8 s verse, each its own source, so we can tell whose audio is where.
function takes(n = 3) {
  let s = newSession("t");
  const id = s.tracks[0].id;
  for (let k = 1; k <= n; k++) s = addSource(s, { id: `s${k}`, name: `take ${k}`, duration: 8, channels: 2, rate: 48000 });
  const mk = (k) => ({ id: `p${k}`, name: `Take ${k}`, regions: [{ id: `r${k}`, src: `s${k}`, name: `take ${k}`, at: 0, in: 0, out: 8, gain: 0, fadeIn: 0, fadeOut: 0 }] });
  s = { ...s, tracks: s.tracks.map((t) => ({ ...t, playlists: Array.from({ length: n }, (_, i) => mk(i + 1)), active: 0 })) };
  return { s, id };
}
const comp = (s, id) => { const t = s.tracks.find((x) => x.id === id); return t.playlists[compIndex(t)].regions; };
const who = (s, id) => comp(s, id).map((r) => [r.src, +r.at.toFixed(3), +r.in.toFixed(3), +r.out.toFixed(3)]);

test("the first swipe starts the comp from the playing take, then drops the other take's audio into the stretch", () => {
  const { s, id } = takes();
  const c = swipeComp(s, id, 1, 2, 4);
  assert.deepEqual(who(c, id), [["s1", 0, 0, 2], ["s2", 2, 2, 4], ["s1", 4, 4, 8]]);                    // take 1, then take 2 for 2-4 s, then take 1 again
  const t = c.tracks[0];
  assert.equal(t.playlists.length, 4); assert.equal(t.playlists[t.active].comp, true);                  // a new lane that plays; the three takes are untouched
  assert.deepEqual(t.playlists.slice(0, 3).map((p) => p.regions.length), [1, 1, 1]);
});
test("swiping again re-cuts the comp: it always covers the whole take with no overlap and no gap", () => {
  const { s, id } = takes();
  let c = swipeComp(s, id, 1, 2, 4); c = swipeComp(c, id, 2, 3, 6); c = swipeComp(c, id, 0, 3.5, 4.5);
  const rs = comp(c, id).sort((a, b) => a.at - b.at);
  for (let i = 1; i < rs.length; i++) assert.ok(Math.abs(endOf(rs[i - 1]) - rs[i].at) < 1e-6, `gap or overlap at ${rs[i].at}`);
  assert.equal(rs[0].at, 0); assert.ok(Math.abs(endOf(rs.at(-1)) - 8) < 1e-6);
});
test("each piece plays the right part of its source: the offset into the file moves with the cut", () => {
  const { s, id } = takes();
  const c = swipeComp(s, id, 2, 5, 7);
  const piece = comp(c, id).find((r) => r.src === "s3");
  assert.deepEqual([piece.at, piece.in, piece.out], [5, 5, 7]);                                           // 5 s into the timeline is 5 s into take 3's file
  const after = comp(c, id).find((r) => r.src === "s1" && r.at >= 7);
  assert.deepEqual([after.at, after.in, after.out], [7, 7, 8]);
});
test("the joins are faded a little so a cut between takes does not click, and the take's own fades are not disturbed", () => {
  const { s, id } = takes();
  const c = swipeComp(s, id, 1, 2, 4);
  const [before, taken, after] = comp(c, id);
  assert.equal(before.fadeOut, XFADE); assert.equal(taken.fadeIn, XFADE); assert.equal(taken.fadeOut, XFADE); assert.equal(after.fadeIn, XFADE);
  assert.equal(before.fadeIn, 0); assert.equal(after.fadeOut, 0);
});
test("the pieces know which take they came from, and compSpans reports it for drawing", () => {
  const { s, id } = takes();
  const c = swipeComp(swipeComp(s, id, 1, 2, 4), id, 1, 4, 5);                                            // two adjacent swipes of take 2 read as one stretch
  const spans = compSpans(c.tracks[0]);
  assert.deepEqual(spans.map((x) => [x.lane, x.a, x.b]), [["p1", 0, 2], ["p2", 2, 5], ["p1", 5, 8]]);
});
test("swiping from the comp itself, a bad range, or an unknown take changes nothing", () => {
  const { s, id } = takes();
  const c = swipeComp(s, id, 1, 2, 4);
  assert.equal(swipeComp(c, id, compIndex(c.tracks[0]), 1, 2), c);
  assert.equal(swipeComp(s, id, 1, 3, 3.005), s); assert.equal(swipeComp(s, id, 9, 1, 2), s); assert.equal(swipeComp(s, "nope", 1, 1, 2), s);
});
test("a track already holding the most lanes has no room for a comp, and is left alone rather than overwritten", () => {
  const { s, id } = takes(8);
  assert.equal(swipeComp(s, id, 1, 2, 4), s);
});
test("start from a take replaces an existing comp; clear removes it and the take lanes remain", () => {
  const { s, id } = takes();
  let c = swipeComp(s, id, 1, 2, 4);
  c = startComp(c, id, 2);
  assert.deepEqual(who(c, id), [["s3", 0, 0, 8]]);
  const gone = clearComp(c, id).tracks[0];
  assert.equal(gone.playlists.length, 3); assert.ok(gone.playlists.every((p) => !p.comp)); assert.ok(gone.active >= 0 && gone.active < 3);
});
test("a saved session keeps its comp lane and where each piece came from", () => {
  const { s, id } = takes();
  const r = cleanSession(JSON.parse(JSON.stringify(swipeComp(s, id, 1, 2, 4))));
  const t = r.tracks[0];
  assert.equal(t.playlists[compIndex(t)].comp, true);
  assert.deepEqual(compSpans(t).map((x) => x.lane), ["p1", "p2", "p1"]);
});
