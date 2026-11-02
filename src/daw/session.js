// The DAW session: tracks, playlists, regions and every edit, as pure functions over plain data.
//
// ONE model for every DAW in DawZ. Arsenal, Azrael, Studio Dragon and the rest differ in their
// WORKFLOW — which windows they open, how a drag behaves, how a track is laid out — never in what a
// session is, so a session made in one opens in another. Pure, so it runs and is tested under plain
// node, and undo is keeping the previous object (VideoZ's project.js is the same shape).
//
//   * A track is audio. It has a fader (dB), a pan, mute / solo / record-arm, an insert chain of
//     built-in effects (plugins.js) and one or more PLAYLISTS — alternate versions of the track's
//     regions (take 1, take 2, a comp). One playlist plays at a time; switching never deletes one.
//   * A region is a window onto a source (a recording or an imported file): it starts on the
//     timeline at `at`, plays the source from `in` to `out`, with its own gain and fades.
//   * Time is in seconds. Bars and beats are a VIEW over seconds from the tempo and meter, so a
//     tempo change re-reads the grid without moving a recording that was played free.
//
// Edit modes (how a drag behaves) belong to the session, because they are how the person is
// working rather than a property of a region:
//   slip    — a region goes where it is put.
//   grid    — a region's start lands on the nearest grid line.
//   shuffle — regions on a track butt up against each other: moving one re-packs the track and
//             deleting one closes the gap.
// (Spot — typing an exact start — is the region editor's field, available in every mode.)

export const MAX_TRACKS = 32;
export const MAX_REGIONS = 400;
export const MAX_PLAYLISTS = 8;
export const MIN_LEN = 0.02;            // a region shorter than 20 ms is a click, not audio
export const FADE_MAX = 30;
export const GAIN_DB = { min: -60, max: 12 };       // fader and region gain
export const BPM = { min: 30, max: 300, default: 120 };
export const EDIT_MODES = ["slip", "grid", "shuffle"];
export const GRIDS = { "1": 4, "1/2": 2, "1/4": 1, "1/8": 0.5, "1/16": 0.25 };   // in beats
export const COLORS = ["#22d3ee", "#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#f97316"];

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let seq = 0;
export const uid = (p = "x") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// ---- making things ----------------------------------------------------------------------------

export function newTrack(n = 1, name) {
  return {
    id: uid("t"), name: name || `Audio ${n}`, color: COLORS[(n - 1) % COLORS.length],
    gain: 0, pan: 0, mute: false, solo: false, armed: false, inserts: [],
    playlists: [{ id: uid("p"), name: "Take 1", regions: [] }], active: 0,
  };
}

export function newSession(name = "Untitled session") {
  const t = newTrack(1);
  return { v: 1, name, bpm: BPM.default, meter: 4, editMode: "slip", grid: "1/4", master: 0, sources: {}, tracks: [t] };
}

// ---- reading ----------------------------------------------------------------------------------

export const playlistOf = (t) => t.playlists[clamp(t.active | 0, 0, t.playlists.length - 1)];
export const regionsOf = (t) => [...playlistOf(t).regions].sort((a, b) => a.at - b.at);
export const lenOf = (r) => r.out - r.in;
export const endOf = (r) => r.at + lenOf(r);
export const beatSeconds = (s) => 60 / s.bpm;
export const gridSeconds = (s) => beatSeconds(s) * (GRIDS[s.grid] ?? 1);
export const lengthOf = (s) => s.tracks.reduce((m, t) => regionsOf(t).reduce((mm, r) => Math.max(mm, endOf(r)), m), 0);
export const regionCount = (s) => s.tracks.reduce((n, t) => n + t.playlists.reduce((m, p) => m + p.regions.length, 0), 0);

/** Where a region is: its track, playlist and index. Null when it is gone. */
export function findRegion(s, id) {
  for (const t of s.tracks) {
    const p = playlistOf(t);
    const r = p.regions.find((x) => x.id === id);
    if (r) return { track: t, playlist: p, region: r };
  }
  return null;
}

/** Tracks that are heard: solo wins, otherwise everything not muted. */
export function audible(s) {
  const soloed = s.tracks.some((t) => t.solo);
  return s.tracks.filter((t) => (soloed ? t.solo : !t.mute));
}

/** "5|3|240" — bar | beat | tick (960 to a beat), 1-based like every DAW counter. */
export function barsBeats(s, sec) {
  const beat = beatSeconds(s);
  const total = Math.max(0, sec) / beat;
  const bar = Math.floor(total / s.meter) + 1;
  const b = Math.floor(total % s.meter) + 1;
  const tick = Math.floor((total - Math.floor(total)) * 960);
  return `${bar}|${b}|${String(tick).padStart(3, "0")}`;
}

export const minSec = (sec, tenths = true) => {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${(tenths ? rest.toFixed(2) : Math.floor(rest).toString()).padStart(tenths ? 5 : 2, "0")}`;
};

export function snapTime(s, sec) {
  const g = gridSeconds(s);
  return Math.max(0, Math.round(sec / g) * g);
}

// ---- writing ----------------------------------------------------------------------------------

const mapTrack = (s, id, fn) => ({ ...s, tracks: s.tracks.map((t) => (t.id === id ? fn(t) : t)) });
const mapPlaylist = (t, fn) => ({ ...t, playlists: t.playlists.map((p, i) => (i === t.active ? fn(p) : p)) });

/** Pack a track's regions end to end from the first one's start — what shuffle mode keeps true. */
function packed(regions) {
  const sorted = [...regions].sort((a, b) => a.at - b.at);
  let at = sorted.length ? sorted[0].at : 0;
  return sorted.map((r) => { const out = { ...r, at }; at += lenOf(r); return out; });
}
const settle = (s, regions) => (s.editMode === "shuffle" ? packed(regions) : regions);

export function setSession(s, patch) {
  const out = { ...s, ...patch };
  out.bpm = clamp(Math.round(num(out.bpm, BPM.default)), BPM.min, BPM.max);
  out.meter = clamp(Math.round(num(out.meter, 4)), 1, 12);
  if (!EDIT_MODES.includes(out.editMode)) out.editMode = "slip";
  if (!(out.grid in GRIDS)) out.grid = "1/4";
  out.master = clamp(num(out.master, 0), GAIN_DB.min, GAIN_DB.max);
  return out;
}

export function addTrack(s, name) {
  if (s.tracks.length >= MAX_TRACKS) return s;
  return { ...s, tracks: [...s.tracks, newTrack(s.tracks.length + 1, name)] };
}

export function removeTrack(s, id) {
  if (s.tracks.length <= 1) return s;
  return pruneSources({ ...s, tracks: s.tracks.filter((t) => t.id !== id) });
}

export function moveTrack(s, id, dir) {
  const i = s.tracks.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= s.tracks.length) return s;
  const tracks = [...s.tracks];
  [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  return { ...s, tracks };
}

export function setTrack(s, id, patch) {
  return mapTrack(s, id, (t) => {
    const out = { ...t, ...patch };
    out.gain = clamp(num(out.gain, 0), GAIN_DB.min, GAIN_DB.max);
    out.pan = clamp(num(out.pan, 0), -1, 1);
    out.name = String(out.name || t.name).slice(0, 40);
    return out;
  });
}

/** Arm ONE track at a time: recording into two at once from one mic is two copies of one take. */
export function armTrack(s, id) {
  return { ...s, tracks: s.tracks.map((t) => ({ ...t, armed: t.id === id ? !t.armed : false })) };
}

export const armedTrack = (s) => s.tracks.find((t) => t.armed) || null;

/** Register a source (a decoded file or a recording) so regions can point at it. */
export function addSource(s, { id, name, duration, channels = 2, rate = 48000 }) {
  return { ...s, sources: { ...s.sources, [id]: { name: String(name || "Audio").slice(0, 80), duration: num(duration, 0), channels, rate } } };
}

/** Drop sources no region on any playlist points at — a deleted take should not haunt the session. */
export function pruneSources(s) {
  const used = new Set();
  s.tracks.forEach((t) => t.playlists.forEach((p) => p.regions.forEach((r) => used.add(r.src))));
  const sources = Object.fromEntries(Object.entries(s.sources).filter(([k]) => used.has(k)));
  return { ...s, sources };
}

/** A whole source as a region on a track's active playlist. */
export function addRegion(s, trackId, { src, at = 0, name }) {
  const source = s.sources[src];
  if (!source || regionCount(s) >= MAX_REGIONS) return s;
  const start = s.editMode === "grid" ? snapTime(s, at) : Math.max(0, at);
  const r = { id: uid("r"), src, name: String(name || source.name).slice(0, 80), at: start, in: 0, out: source.duration, gain: 0, fadeIn: 0, fadeOut: 0 };
  return mapTrack(s, trackId, (t) => mapPlaylist(t, (p) => ({ ...p, regions: settle(s, [...p.regions, r]) })));
}

/** Move a region in time (and optionally to another track's active playlist). */
export function moveRegion(s, id, at, toTrack) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  const start = s.editMode === "grid" ? snapTime(s, at) : Math.max(0, num(at, hit.region.at));
  const moved = { ...hit.region, at: start };
  const dest = toTrack && toTrack !== hit.track.id && s.tracks.some((t) => t.id === toTrack) ? toTrack : hit.track.id;
  let out = mapTrack(s, hit.track.id, (t) => mapPlaylist(t, (p) => ({ ...p, regions: p.regions.filter((r) => r.id !== id) })));
  out = mapTrack(out, dest, (t) => mapPlaylist(t, (p) => ({ ...p, regions: settle(s, [...p.regions, moved]) })));
  if (dest !== hit.track.id && s.editMode === "shuffle") {
    out = mapTrack(out, hit.track.id, (t) => mapPlaylist(t, (p) => ({ ...p, regions: packed(p.regions) })));
  }
  return out;
}

/** Trim an edge to timeline time `t`. The source's own length is the limit — a region cannot play audio that isn't there. */
export function trimRegion(s, id, edge, t) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  const r = hit.region;
  const dur = s.sources[r.src]?.duration ?? r.out;
  const time = s.editMode === "grid" ? snapTime(s, t) : t;
  let next;
  if (edge === "start") {
    const shift = clamp(time - r.at, -r.in, lenOf(r) - MIN_LEN);
    next = { ...r, at: r.at + shift, in: r.in + shift };
  } else {
    next = { ...r, out: clamp(r.in + (time - r.at), r.in + MIN_LEN, dur) };
  }
  next.fadeIn = Math.min(next.fadeIn, lenOf(next));
  next.fadeOut = Math.min(next.fadeOut, lenOf(next) - next.fadeIn);
  return mapTrack(s, hit.track.id, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: settle(s, p.regions.map((x) => (x.id === id ? next : x))) })));
}

/** Split at timeline time `t` into two regions that play exactly what the one did. */
export function splitRegion(s, id, t) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  const r = hit.region;
  if (t <= r.at + MIN_LEN || t >= endOf(r) - MIN_LEN || regionCount(s) >= MAX_REGIONS) return s;
  const cut = r.in + (t - r.at);
  const a = { ...r, out: cut, fadeOut: 0 };
  const b = { ...r, id: uid("r"), at: t, in: cut, fadeIn: 0 };
  return mapTrack(s, hit.track.id, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: p.regions.flatMap((x) => (x.id === id ? [a, b] : [x])) })));
}

export function updateRegion(s, id, patch) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  const r = { ...hit.region, ...patch };
  r.name = String(r.name || "").slice(0, 80);
  r.gain = clamp(num(r.gain, 0), GAIN_DB.min, GAIN_DB.max);
  r.at = Math.max(0, num(r.at, hit.region.at));
  const len = lenOf(r);
  r.fadeIn = clamp(num(r.fadeIn, 0), 0, Math.min(FADE_MAX, len));
  r.fadeOut = clamp(num(r.fadeOut, 0), 0, Math.min(FADE_MAX, len - r.fadeIn));
  return mapTrack(s, hit.track.id, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: settle(s, p.regions.map((x) => (x.id === id ? r : x))) })));
}

export function removeRegion(s, id) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  return pruneSources(mapTrack(s, hit.track.id, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: settle(s, p.regions.filter((x) => x.id !== id)) }))));
}

/** A copy placed straight after the original — the Pro Tools "duplicate" move. */
export function duplicateRegion(s, id) {
  const hit = findRegion(s, id);
  if (!hit || regionCount(s) >= MAX_REGIONS) return s;
  const copy = { ...hit.region, id: uid("r"), at: endOf(hit.region) };
  return mapTrack(s, hit.track.id, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: settle(s, [...p.regions, copy]) })));
}

/** Nudge by grid steps (negative is earlier), whatever the edit mode. */
export function nudgeRegion(s, id, steps) {
  const hit = findRegion(s, id);
  if (!hit) return s;
  return { ...moveRegion({ ...s, editMode: "slip" }, id, hit.region.at + steps * gridSeconds(s)), editMode: s.editMode };
}

/**
 * Lay a new recording onto a track the way a tape machine would: anything already on the track
 * inside the recorded span is cut out so the new take is the only thing heard there. When something
 * WAS there, the cut happens on a new playlist (a copy of the current one), so the previous take is
 * still one switch away rather than gone. Returns { session, keptPrevious }.
 */
export function recordInto(s, trackId, { src, at, name }) {
  const source = s.sources[src];
  const t = s.tracks.find((x) => x.id === trackId);
  if (!source || !t) return { session: s, keptPrevious: false };
  const from = Math.max(0, at);
  const to = from + source.duration;
  const hits = playlistOf(t).regions.some((r) => r.at < to && endOf(r) > from);
  const keep = hits && t.playlists.length < MAX_PLAYLISTS;
  let out = keep ? newPlaylist(s, trackId, { copy: true }) : s;
  if (hits) {
    out = mapTrack(out, trackId, (tr) => mapPlaylist(tr, (p) => ({
      ...p,
      regions: p.regions.flatMap((r) => {
        if (endOf(r) <= from || r.at >= to) return [r];
        const parts = [];
        if (r.at < from) parts.push({ ...r, out: r.in + (from - r.at), fadeOut: 0 });
        if (endOf(r) > to) parts.push({ ...r, id: uid("r"), at: to, in: r.in + (to - r.at), fadeIn: 0 });
        return parts.filter((x) => lenOf(x) >= MIN_LEN);
      }),
    })));
  }
  const r = { id: uid("r"), src, name: String(name || source.name).slice(0, 80), at: from, in: 0, out: source.duration, gain: 0, fadeIn: 0, fadeOut: 0 };
  out = mapTrack(out, trackId, (tr) => mapPlaylist(tr, (p) => ({ ...p, regions: [...p.regions, r] })));
  return { session: out, keptPrevious: keep };
}

// ---- playlists --------------------------------------------------------------------------------

/** A new playlist on a track. `copy` starts it from the current one (to comp from); otherwise it is empty (to record a new take). */
export function newPlaylist(s, trackId, { copy = false } = {}) {
  return mapTrack(s, trackId, (t) => {
    if (t.playlists.length >= MAX_PLAYLISTS) return t;
    const from = playlistOf(t);
    const p = { id: uid("p"), name: `Take ${t.playlists.length + 1}`, regions: copy ? from.regions.map((r) => ({ ...r, id: uid("r") })) : [] };
    return { ...t, playlists: [...t.playlists, p], active: t.playlists.length };
  });
}

export const switchPlaylist = (s, trackId, index) =>
  mapTrack(s, trackId, (t) => ({ ...t, active: clamp(index | 0, 0, t.playlists.length - 1) }));

export const renamePlaylist = (s, trackId, name) =>
  mapTrack(s, trackId, (t) => mapPlaylist(t, (p) => ({ ...p, name: String(name || p.name).slice(0, 40) })));

/** Delete the active playlist. A track always keeps one; deleting is the only way a take goes. */
export function deletePlaylist(s, trackId) {
  return pruneSources(mapTrack(s, trackId, (t) => {
    if (t.playlists.length <= 1) return t;
    const playlists = t.playlists.filter((_, i) => i !== t.active);
    return { ...t, playlists, active: Math.min(t.active, playlists.length - 1) };
  }));
}

// ---- loading ----------------------------------------------------------------------------------

/** Repair a stored session: anything missing gets its default, anything out of range is clamped, regions pointing at a missing source are dropped. */
export function cleanSession(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.tracks)) return newSession();
  const base = setSession({ ...newSession(raw.name), ...raw, sources: raw.sources && typeof raw.sources === "object" ? raw.sources : {} }, {});
  const tracks = raw.tracks.slice(0, MAX_TRACKS).map((t, i) => {
    const d = newTrack(i + 1);
    const playlists = (Array.isArray(t?.playlists) && t.playlists.length ? t.playlists : d.playlists).slice(0, MAX_PLAYLISTS).map((p) => ({
      id: String(p?.id || uid("p")), name: String(p?.name || "Take").slice(0, 40),
      regions: (Array.isArray(p?.regions) ? p.regions : []).filter((r) => r && base.sources[r.src]).map((r) => ({
        id: String(r.id || uid("r")), src: r.src, name: String(r.name || "").slice(0, 80),
        at: Math.max(0, num(r.at, 0)), in: Math.max(0, num(r.in, 0)), out: Math.max(num(r.in, 0) + MIN_LEN, num(r.out, MIN_LEN)),
        gain: clamp(num(r.gain, 0), GAIN_DB.min, GAIN_DB.max), fadeIn: clamp(num(r.fadeIn, 0), 0, FADE_MAX), fadeOut: clamp(num(r.fadeOut, 0), 0, FADE_MAX),
      })),
    }));
    return {
      ...d, ...t, id: String(t?.id || d.id), name: String(t?.name || d.name).slice(0, 40),
      gain: clamp(num(t?.gain, 0), GAIN_DB.min, GAIN_DB.max), pan: clamp(num(t?.pan, 0), -1, 1),
      mute: !!t?.mute, solo: !!t?.solo, armed: false, inserts: Array.isArray(t?.inserts) ? t.inserts : [],
      playlists, active: clamp(num(t?.active, 0) | 0, 0, playlists.length - 1),
    };
  });
  return { ...base, tracks: tracks.length ? tracks : [newTrack(1)] };
}
