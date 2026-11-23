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

import { PARAMS, cleanAuto, cleanLane } from "./automation.js";
// The engine's own bound on one session, not a tier: how many tracks a member may have is the tier's
// (`addTrack`'s `cap`, Free 3 / Premium 6 / StatZ unlimited), and StatZ's "unlimited" runs up to this.
export const MAX_TRACKS = 128;
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

/** A colour as "#rrggbb", or the fallback: a stored or typed value is never trusted to be a colour. */
export function cleanColor(c, fallback = COLORS[0]) {
  const v = String(c || "").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
}

/** An emoji mark for a track or marker: at most two characters as a person sees them (a flag or a family is one), nothing
 *  that is only letters and digits, so the field stays a mark and the name stays the name. */
export function cleanEmoji(e) {
  const chars = typeof Intl !== "undefined" && Intl.Segmenter
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(String(e || "").trim()), (x) => x.segment)
    : Array.from(String(e || "").trim());
  return chars.slice(0, 2).join("").replace(/[A-Za-z0-9\s]/g, "").slice(0, 16);
}

/** How a recording lands on a track that already has audio under it. Takes keeps what was there on a new playlist (the default, and
 *  the only one that never loses anything); Replace cuts it out of THIS playlist for good; Overdub lays the new audio on top and
 *  leaves what was there playing underneath it. */
export const REC_MODES = {
  takes: { label: "Takes", what: "Keeps what was there: the old take is the previous take in the playlist menu." },
  replace: { label: "Replace", what: "Cuts the old audio out of this take where you record (Undo brings it back)." },
  overdub: { label: "Overdub", what: "Records on top of what is there; both play together." },
};
export const cleanRecMode = (m) => (m in REC_MODES ? m : "takes");

export function newTrack(n = 1, name) {
  return {
    id: uid("t"), name: name || `Audio ${n}`, color: COLORS[(n - 1) % COLORS.length], emoji: "", recMode: "takes",
    gain: 0, pan: 0, mute: false, solo: false, armed: false, inserts: [], auto: {},
    input: { device: "", channel: "both" },
    playlists: [{ id: uid("p"), name: "Take 1", regions: [] }], active: 0,
  };
}

const CHANNELS = ["both", "left", "right"];
/** A track's recording input: a device id ("" = the default mic) and which of its channels. */
export function cleanInput(i) {
  return { device: typeof i?.device === "string" ? i.device.slice(0, 200) : "", channel: CHANNELS.includes(i?.channel) ? i.channel : "both" };
}

export function newSession(name = "Untitled session") {
  const t = newTrack(1);
  return { v: 1, name, bpm: BPM.default, meter: 4, editMode: "slip", grid: "1/4", master: 0, sources: {}, tracks: [t], markers: [], key: "", snap: true, genre: "", skills: [] };
}

// ---- loop region -------------------------------------------------------------------------------
// One region on the session: { start, end, on }. Playback wraps from `end` back to `start` while `on`.
export const MIN_LOOP = 0.1;
export function cleanLoop(raw) {
  const start = Math.max(0, num(raw?.start, NaN)); const end = num(raw?.end, NaN);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < MIN_LOOP) return null;
  return { start, end, on: raw?.on !== false };
}
/** Set the region (start/end in seconds, either order) or clear it with null. Too short to be a loop = cleared. */
export function setLoop(s, a, b, on = true) {
  if (a == null) return { ...s, loop: null };
  return { ...s, loop: cleanLoop({ start: Math.min(a, b), end: Math.max(a, b), on }) };
}
export const toggleLoop = (s) => (s.loop ? { ...s, loop: { ...s.loop, on: !s.loop.on } } : s);
/** Where playback goes next: the loop's start once the position reaches its end, else null (carry on). */
export const loopJump = (s, pos) => (s.loop && s.loop.on && pos >= s.loop.end ? s.loop.start : null);

// ---- markers ----------------------------------------------------------------------------------
// A marker is a named, coloured, optionally emoji'd point on the timeline ("Verse 2", "🔥 Drop"). It belongs to the
// SESSION, not a track, so it is the same in every DAW and survives a session being copied from one DAW to another.
export const MAX_MARKERS = 200;
export const MAX_PROJECT_SKILLS = 12;
export const MARKER_COLORS = COLORS;

export function sortedMarkers(s) { return [...(s.markers || [])].sort((a, b) => a.t - b.t); }

/** Add a marker at `t` seconds. A second one at the same moment is nudged out of the first's way rather than refused. */
export function addMarker(s, t, { name, emoji = "", color } = {}) {
  const list = s.markers || [];
  if (list.length >= MAX_MARKERS) return s;
  const n = list.length + 1;
  let at = Math.max(0, num(t, 0));
  while (list.some((m) => Math.abs(m.t - at) < 0.05)) at += 0.1;
  const m = { id: uid("m"), t: at, name: String(name || `Marker ${n}`).slice(0, 40), emoji: cleanEmoji(emoji),
              color: cleanColor(color, MARKER_COLORS[(n - 1) % MARKER_COLORS.length]) };
  return { ...s, markers: [...list, m] };
}

export function updateMarker(s, id, patch) {
  return { ...s, markers: (s.markers || []).map((m) => (m.id !== id ? m : {
    ...m, ...(patch.name !== undefined ? { name: String(patch.name).slice(0, 40) || m.name } : {}),
    ...(patch.emoji !== undefined ? { emoji: cleanEmoji(patch.emoji) } : {}),
    ...(patch.color !== undefined ? { color: cleanColor(patch.color, m.color) } : {}),
    ...(patch.t !== undefined ? { t: Math.max(0, num(patch.t, m.t)) } : {}),
  })) };
}

export function removeMarker(s, id) { return { ...s, markers: (s.markers || []).filter((m) => m.id !== id) }; }

/** The next marker after `t`, or the previous one before it (null at either end) — for jumping around a song. */
export function markerAfter(s, t) { return sortedMarkers(s).find((m) => m.t > t + 0.01) || null; }
export function markerBefore(s, t) { return [...sortedMarkers(s)].reverse().find((m) => m.t < t - 0.01) || null; }

export function cleanMarkers(raw) {
  return (Array.isArray(raw) ? raw : []).slice(0, MAX_MARKERS).filter((m) => m && Number.isFinite(Number(m.t))).map((m, i) => ({
    id: String(m.id || uid("m")), t: Math.max(0, num(m.t, 0)), name: String(m.name || `Marker ${i + 1}`).slice(0, 40),
    emoji: cleanEmoji(m.emoji), color: cleanColor(m.color, MARKER_COLORS[i % MARKER_COLORS.length]),
  }));
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

/** Clock label for a ruler tick: 0:05, 1:30, 12:00 (sub-second steps get a tenth). */
export const clockLabel = (sec, tenths = false) => {
  const t = Math.max(0, sec);
  const m = Math.floor(t / 60);
  const r = t - m * 60;
  return `${m}:${tenths ? r.toFixed(1).padStart(4, "0") : String(Math.floor(r + 1e-6)).padStart(2, "0")}`;
};

/** The ruler's marks for a view `width` px wide at `zoom` px/s: bars (always), beats (once they are 14px apart),
 *  and clock ticks at the first "nice" step at least 60px apart. Pure, so it is tested. */
export function rulerTicks(s, zoom, width) {
  const beat = beatSeconds(s);
  const bar = beat * s.meter;
  const end = width / zoom;
  const barEvery = Math.max(1, Math.ceil(44 / (bar * zoom)));
  const bars = [];
  for (let i = 0; i * bar <= end && bars.length < 2000; i += barEvery) bars.push({ t: i * bar, label: String(i + 1) });
  const beats = [];
  if (beat * zoom >= 14 && barEvery === 1) {
    for (let i = 0; i * beat <= end && beats.length < 8000; i++) {
      if (i % s.meter) beats.push({ t: i * beat, label: beat * zoom >= 30 ? `${Math.floor(i / s.meter) + 1}.${(i % s.meter) + 1}` : "" });
    }
  }
  const NICE = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 1800, 3600];
  const every = NICE.find((n) => n * zoom >= 60) || 3600;
  const clock = [];
  for (let i = 0; i * every <= end && clock.length < 2000; i++) clock.push({ t: i * every, label: clockLabel(i * every, every < 1) });
  return { bars, beats, clock };
}

export function snapTime(s, sec) {
  const g = gridSeconds(s);
  return Math.max(0, Math.round(sec / g) * g);
}
/** What a project is called when it is saved or exported: "Genre - Key - Name", leaving out what was not set. */
export const projectTitle = (s) => [s.genre, s.key, s.name].map((x) => String(x || "").trim()).filter(Boolean).join(" - ");

/** The time a click or a new marker lands on: the nearest grid line while Snap is on (the default), exactly where it was while it is off. */
export const snapIf = (s, sec) => (s.snap === false ? Math.max(0, sec) : snapTime(s, sec));

// The project's key, same twenty-four names as Instrumental ConnectZ and the key estimator, or "" for not set.
export const SESSION_KEYS = [
  ...["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"].map((k) => `${k} major`),
  ...["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"].map((k) => `${k} minor`),
];

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
  out.name = String(out.name || "Untitled session").slice(0, 60);
  out.key = SESSION_KEYS.includes(out.key) ? out.key : "";
  out.snap = out.snap !== false;
  out.genre = String(out.genre || "").trim().slice(0, 60);
  out.skills = [...new Set((Array.isArray(out.skills) ? out.skills : []).map((k) => String(k).slice(0, 60)).filter(Boolean))].slice(0, MAX_PROJECT_SKILLS);
  return out;
}

/** Add a track — unless the session already holds `cap` (the tier's count; null/undefined = no tier ceiling). */
export function addTrack(s, name, cap) {
  if (s.tracks.length >= Math.min(MAX_TRACKS, cap ?? MAX_TRACKS)) return s;
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

/** Replace one automation lane of a track (see automation.js for how a lane is made and edited). */
export function setAuto(s, id, param, lane) {
  if (!PARAMS[param]) return s;
  return mapTrack(s, id, (t) => ({ ...t, auto: { ...(t.auto || {}), [param]: cleanLane(param, lane) } }));
}

export function setTrack(s, id, patch) {
  return mapTrack(s, id, (t) => {
    const out = { ...t, ...patch };
    out.gain = clamp(num(out.gain, 0), GAIN_DB.min, GAIN_DB.max);
    out.pan = clamp(num(out.pan, 0), -1, 1);
    out.name = String(out.name || t.name).slice(0, 40);
    out.color = cleanColor(out.color, t.color);
    out.emoji = cleanEmoji(out.emoji);
    out.recMode = cleanRecMode(out.recMode);
    out.input = cleanInput(out.input);
    return out;
  });
}

/** Arm or disarm one track. Several may be armed at once — a band, or an interface's channels — as
 *  long as each records its own input (`inputClash` says when two would record the same sound). */
export function armTrack(s, id) {
  return { ...s, tracks: s.tracks.map((t) => (t.id === id ? { ...t, armed: !t.armed } : t)) };
}

export const armedTrack = (s) => s.tracks.find((t) => t.armed) || null;
export const armedTracks = (s) => s.tracks.filter((t) => t.armed);

/** Two armed tracks on the same input (same device, overlapping channel) would be two copies of one
 *  take: the pair, so the screen can say which, or null. Left and right of one device do not clash. */
export function inputClash(tracks) {
  for (let i = 0; i < tracks.length; i++) for (let j = i + 1; j < tracks.length; j++) {
    const a = cleanInput(tracks[i].input), b = cleanInput(tracks[j].input);
    if (a.device !== b.device) continue;
    if (a.channel === "both" || b.channel === "both" || a.channel === b.channel) return [tracks[i], tracks[j]];
  }
  return null;
}

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
  const mode = cleanRecMode(t.recMode);
  const keep = mode === "takes" && hits && t.playlists.length < MAX_PLAYLISTS;
  let out = keep ? newPlaylist(s, trackId, { copy: true }) : s;
  if (hits && mode !== "overdub") {
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
        // A transposed region plays a shifted copy; `orig` is the recording it was made from, so a
        // new key is always made from the original and 0 gives the original back exactly.
        ...(r.orig && base.sources[r.orig] ? { orig: String(r.orig), semis: clamp(num(r.semis, 0) | 0, -12, 12) } : {}),
      })),
    }));
    return {
      ...d, ...t, id: String(t?.id || d.id), name: String(t?.name || d.name).slice(0, 40),
      color: cleanColor(t?.color, d.color), emoji: cleanEmoji(t?.emoji), recMode: cleanRecMode(t?.recMode),
      gain: clamp(num(t?.gain, 0), GAIN_DB.min, GAIN_DB.max), pan: clamp(num(t?.pan, 0), -1, 1),
      mute: !!t?.mute, solo: !!t?.solo, armed: false, inserts: Array.isArray(t?.inserts) ? t.inserts : [],
      input: cleanInput(t?.input), auto: cleanAuto(t?.auto),
      playlists, active: clamp(num(t?.active, 0) | 0, 0, playlists.length - 1),
    };
  });
  return { ...base, tracks: tracks.length ? tracks : [newTrack(1)], markers: cleanMarkers(raw.markers), loop: cleanLoop(raw.loop) };
}
