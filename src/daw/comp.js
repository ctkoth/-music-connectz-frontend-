// Comping: one finished take built from the best parts of several. A track's take lanes are its playlists; the COMP is one more lane
// (flagged `comp`) that plays, and swiping a stretch of any take puts that take's audio into the comp for exactly that stretch.
// The take lanes are never touched, so any swipe can be redone from the originals. Every piece in the comp remembers which lane it
// came from (`from`), which is how the screen shows what was taken from where. Joins get a 10 ms fade each side so a cut between
// two takes does not click. Pure and tested.
//
// A join is a true CROSSFADE, not a dip: the incoming piece starts half a fade early and the outgoing one keeps playing half a fade
// late, so for XFADE seconds both sound, one rising as the other falls. The engine plays every region on its own with its own fades,
// so overlapping regions in the comp lane are exactly what makes the crossfade; nothing else is needed.
import { MIN_LEN, MAX_PLAYLISTS, endOf, uid } from "./session.js";

export const XFADE = 0.02;                       // the length of the overlap at a join, in seconds (half each side of the cut)
const EPS = 1e-6;
const round = (x) => Math.round(x * 1e6) / 1e6;

export const compIndex = (t) => t.playlists.findIndex((p) => p.comp);

/** The part of each region inside [a, b), as new regions (new ids, no fades, remembering the lane they came from). */
function clipTo(regions, a, b, fromId) {
  const out = [];
  for (const r of regions) {
    const ia = Math.max(r.at, a), ib = Math.min(endOf(r), b);
    if (ib - ia < MIN_LEN) continue;
    out.push({ ...r, id: uid("r"), at: round(ia), in: r.in + (ia - r.at), out: r.in + (ib - r.at), fadeIn: 0, fadeOut: 0, ...(fromId ? { from: fromId } : {}) });
  }
  return out;
}
/** `regions` with [a, b) cut out: a region crossing an edge is split, the outside parts kept, and each new cut edge gets a short fade. */
function carve(regions, a, b, xfade) {
  const out = [];
  for (const r of regions) {
    const rEnd = endOf(r);
    if (rEnd <= a + EPS || r.at >= b - EPS) { out.push(r); continue; }          // untouched
    const h = xfade / 2;
    if (r.at < a - EPS) {                                                       // the part before the cut keeps sounding half a fade into the new piece
      const keep = Math.min(a + h, rEnd);
      if (keep - r.at >= MIN_LEN) out.push({ ...r, out: r.in + (keep - r.at), fadeOut: Math.min(xfade, keep - r.at) });
    }
    if (rEnd > b + EPS) {                                                       // the part after it starts half a fade early, under the end of the new piece
      const start = Math.max(b - h, r.at);
      if (rEnd - start >= MIN_LEN) out.push({ ...r, id: r.at < a - EPS ? uid("r") : r.id, at: round(start), in: r.in + (start - r.at), fadeIn: Math.min(xfade, rEnd - start) });
    }
  }
  return out;
}
const sortRegions = (rs) => [...rs].sort((x, y) => x.at - y.at);
const withTrack = (s, id, fn) => ({ ...s, tracks: s.tracks.map((t) => (t.id === id ? fn(t) : t)) });

/** Make (or remake) the comp lane as a copy of take lane `srcIndex`, and make it the one that plays. */
export function startComp(s, trackId, srcIndex) {
  return withTrack(s, trackId, (t) => {
    const src = t.playlists[srcIndex];
    if (!src || src.comp) return t;
    const regions = src.regions.map((r) => ({ ...r, id: uid("r"), from: src.id }));
    const at = compIndex(t);
    if (at >= 0) return { ...t, playlists: t.playlists.map((p, i) => (i === at ? { ...p, regions } : p)), active: at };
    if (t.playlists.length >= MAX_PLAYLISTS) return t;
    return { ...t, playlists: [...t.playlists, { id: uid("p"), name: "Comp", comp: true, regions }], active: t.playlists.length };
  });
}

/** Swipe: take [a, b) from take lane `srcIndex` into the comp. The comp is started from the playing lane if there is none yet. */
export function swipeComp(s, trackId, srcIndex, a, b, { xfade = XFADE } = {}) {
  const lo = Math.max(0, Math.min(a, b)), hi = Math.max(a, b);
  if (hi - lo < MIN_LEN) return s;
  const t0 = s.tracks.find((t) => t.id === trackId);
  if (!t0 || !t0.playlists[srcIndex] || t0.playlists[srcIndex].comp) return s;
  let cur = s;
  if (compIndex(t0) < 0) {
    const from = t0.playlists[t0.active] && !t0.playlists[t0.active].comp ? t0.active : srcIndex;
    cur = startComp(s, trackId, from);
    if (compIndex(cur.tracks.find((t) => t.id === trackId)) < 0) return s;      // no room for another lane: nothing changes
  }
  return withTrack(cur, trackId, (t) => {
    const ci = compIndex(t); const src = t.playlists[srcIndex];
    // The taken piece reaches half a fade past each cut (as far as its own take has audio) and fades in and out across that overlap.
    const h = xfade / 2;
    const taken = clipTo(src.regions, lo - h, hi + h, src.id).map((r) => ({
      ...r, fadeIn: r.at < lo - EPS ? Math.min(xfade, endOf(r) - r.at) : 0, fadeOut: endOf(r) > hi + EPS ? Math.min(xfade, endOf(r) - r.at) : 0,
    }));
    const regions = sortRegions([...carve(t.playlists[ci].regions, lo, hi, xfade), ...taken]);
    return { ...t, playlists: t.playlists.map((p, i) => (i === ci ? { ...p, regions } : p)), active: ci };
  });
}

/** Take the comp away (the take lanes stay). The lane before it plays again. */
export function clearComp(s, trackId) {
  return withTrack(s, trackId, (t) => {
    const ci = compIndex(t);
    if (ci < 0 || t.playlists.length <= 1) return t;
    const playlists = t.playlists.filter((_, i) => i !== ci);
    return { ...t, playlists, active: Math.min(ci === t.active ? Math.max(0, ci - 1) : t.active > ci ? t.active - 1 : t.active, playlists.length - 1) };
  });
}

/** For drawing: the stretches of the comp that came from each lane id, as [{ lane, a, b }] in time order. */
export function compSpans(t) {
  const c = t.playlists[compIndex(t)];
  if (!c) return [];
  const out = [];
  for (const r of sortRegions(c.regions)) {
    const last = out.at(-1);
    if (last && last.lane === r.from && r.at <= last.b + 1e-3) last.b = Math.max(last.b, endOf(r)); else out.push({ lane: r.from || null, a: r.at, b: endOf(r) });
  }
  return out;
}
