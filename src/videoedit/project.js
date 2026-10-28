// VideoZ's project: tracks, clips and every edit, as pure functions over plain
// data — so they run under plain node, are tested there, and undo is just
// keeping the previous object.
//
// The model is a multitrack timeline in the Sony Vegas sense:
//
//   * Tracks are listed TOP to BOTTOM. Video tracks come first, and an UPPER
//     video track plays OVER the ones below it — a smaller picture on track 1 is
//     picture-in-picture over a full-frame clip on track 2; a title on track 1
//     sits over everything.
//   * A clip sits on a track at a time (`at`) and can be anywhere: gaps are
//     black (or silence), and two clips on one track that OVERLAP crossfade,
//     the later one rising over the earlier — Vegas's own behaviour, so
//     dragging one clip onto the tail of another is how a dissolve is made.
//   * A clip is a video, a photo, a title (text on nothing) or an audio file.
//     Videos, photos and titles go on video tracks; audio on audio tracks. A
//     video carries its own sound, on its own track's clip.
//
// The engine (render.js) asks `activeAt(project, t)` what is on screen and in
// the speakers at time t, and draws exactly that — preview and export are the
// same schedule.
import { FILTERS, MOTIONS, TEXT_MAX, TEXT_SPOTS } from "./look.js";
import { cleanLip } from "./lipsync.js";

export const ASPECTS = {
  "16:9": { w: 1280, h: 720, label: "16:9 · YouTube" },
  "9:16": { w: 720, h: 1280, label: "9:16 · Reels / TikTok" },
  "1:1": { w: 1080, h: 1080, label: "1:1 · Square" },
};
export const FPS = 30;
export const MAX_CLIPS = 80;
export const MAX_TRACKS = 8;
// Export runs at playback speed, so the ceiling is how long somebody will keep
// a tab on screen — said beside the button, not discovered.
export const MAX_SECONDS = 15 * 60;
export const STILL_SECONDS = { min: 0.2, max: 60, default: 3 };
export const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];
export const FADE_MAX = 10;
export const MIN_LEN = 0.1;

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let seq = 0;
export const uid = (p = "c") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export const isVisual = (kind) => kind === "video" || kind === "image" || kind === "text";
export const trackKindFor = (clipKind) => (clipKind === "audio" ? "audio" : "video");
const isMedia = (kind) => kind === "video" || kind === "audio";

export function newProject() {
  return {
    aspect: "16:9", fit: "cover", fadeIn: 0, fadeOut: 0,
    tracks: [
      { id: "v1", kind: "video", mute: false, solo: false, level: 100 },
      { id: "v2", kind: "video", mute: false, solo: false, level: 100 },
      { id: "a1", kind: "audio", mute: false, solo: false, level: 100 },
    ],
    clips: [],
  };
}

/** "Video 1" is the top video track; names follow position so they never disagree with it. */
export function trackName(p, id) {
  const t = p.tracks.find((x) => x.id === id);
  if (!t) return "";
  const same = p.tracks.filter((x) => x.kind === t.kind);
  return `${t.kind === "video" ? "Video" : "Audio"} ${same.indexOf(t) + 1}`;
}

/** A clip with every field present and in range. */
export function cleanClip(c) {
  const kind = ["video", "image", "audio", "text"].includes(c?.kind) ? c.kind : "video";
  const out = {
    id: c?.id || uid(), track: c?.track, kind, name: String(c?.name || "").slice(0, 120), src: c?.src || "",
    taken: num(c?.taken, 0),
    at: Math.max(0, num(c?.at, 0)),
    speed: isMedia(kind) && SPEEDS.includes(Number(c?.speed)) ? Number(c.speed) : 1,
    volume: clamp(num(c?.volume, 100), 0, 200),
    fadeIn: clamp(num(c?.fadeIn, 0), 0, FADE_MAX),
    fadeOut: clamp(num(c?.fadeOut, 0), 0, FADE_MAX),
    filter: FILTERS[c?.filter] ? c.filter : "none",
    adj: { ...(c?.adj || {}) },
    motion: kind === "image" && MOTIONS[c?.motion] ? c.motion : "none",
    text: String(c?.text || "").slice(0, TEXT_MAX),
    textAt: TEXT_SPOTS.includes(c?.textAt) ? c.textAt : (kind === "text" ? "middle" : "bottom"),
    color: /^#[0-9a-f]{6}$/i.test(c?.color || "") ? c.color : "#ffffff",
    scale: clamp(num(c?.scale, 100), 5, 300),
    x: clamp(num(c?.x, 0), -100, 100),
    y: clamp(num(c?.y, 0), -100, 100),
    opacity: clamp(num(c?.opacity, 100), 0, 100),
    width: num(c?.width, 0), height: num(c?.height, 0),
    // Only a photo can be lip-synced: a video's mouth already moves.
    lip: kind === "image" ? cleanLip(c?.lip) : cleanLip(null),
  };
  if (isMedia(kind)) {
    const dur = Math.max(0, num(c?.duration, 0));
    out.duration = dur;
    out.in = clamp(num(c?.in, 0), 0, Math.max(0, dur - MIN_LEN));
    out.out = clamp(num(c?.out, dur), out.in + MIN_LEN, Math.max(out.in + MIN_LEN, dur));
    out.seconds = (out.out - out.in) / out.speed;
  } else {
    out.duration = 0;
    out.seconds = clamp(num(c?.seconds, STILL_SECONDS.default), STILL_SECONDS.min, STILL_SECONDS.max);
    out.in = 0;
    out.out = out.seconds;
  }
  return out;
}

export const lenOf = (c) => (isMedia(c.kind) ? (c.out - c.in) / c.speed : c.seconds);
export const endOf = (c) => c.at + lenOf(c);
export const lengthOf = (p) => (p.clips || []).reduce((m, c) => Math.max(m, endOf(c)), 0);
export const clipsOn = (p, trackId) => (p.clips || []).filter((c) => c.track === trackId).sort((a, b) => a.at - b.at);
const trackOf = (p, id) => p.tracks.find((t) => t.id === id);

/** How far a clip's start overlaps the clip before it on its track (the crossfade into it). */
function overlapIn(p, c) {
  let o = 0;
  for (const q of p.clips) {
    if (q.id === c.id || q.track !== c.track || q.at > c.at || (q.at === c.at && q.id > c.id)) continue;
    o = Math.max(o, Math.min(endOf(q), endOf(c)) - c.at);
  }
  return clamp(o, 0, lenOf(c));
}
/** How far the next clip on the track overlaps this one's end. */
function overlapOut(p, c) {
  let o = 0;
  for (const q of p.clips) {
    if (q.id === c.id || q.track !== c.track || q.at < c.at || (q.at === c.at && q.id < c.id)) continue;
    o = Math.max(o, endOf(c) - q.at);
  }
  return clamp(o, 0, lenOf(c));
}

const ramp = (x, len) => (len > 0 ? clamp(x / len, 0, 1) : 1);

/** Which tracks of a kind are heard/seen: solo wins within its kind, mute always. */
function liveTracks(p, kind) {
  const ts = p.tracks.filter((t) => t.kind === kind);
  const solo = ts.some((t) => t.solo);
  return new Set(ts.filter((t) => !t.mute && (!solo || t.solo)).map((t) => t.id));
}

/**
 * What is on screen and in the speakers at `t`.
 *   video: layers to draw BOTTOM first — { clip, into, media, alpha }
 *   audio: { clip, media, gain } for every clip that sounds
 *   master: the whole video's fade from/to black (multiplies both)
 */
export function activeAt(p, t) {
  const seen = liveTracks(p, "video");
  const heard = liveTracks(p, "audio");
  const vt = p.tracks.filter((x) => x.kind === "video");
  const video = [];
  const audio = [];
  // Bottom video track first, so upper tracks are drawn over it.
  for (const track of [...vt].reverse()) {
    if (!seen.has(track.id)) continue;
    for (const c of clipsOn(p, track.id)) {
      if (t < c.at || t >= endOf(c)) continue;
      const into = t - c.at, left = endOf(c) - t;
      // A crossfade raises the incoming clip over the outgoing one, which stays
      // solid beneath it: fading both would dip the frame toward black.
      const fi = Math.max(c.fadeIn, overlapIn(p, c));
      const a = Math.min(ramp(into, fi), ramp(left, c.fadeOut)) * (c.opacity / 100) * (track.level / 100);
      const media = c.in + into * c.speed;
      video.push({ clip: c, into, media, alpha: clamp(a, 0, 1) });
      if (c.kind === "video") {
        const g = Math.min(ramp(into, fi), ramp(left, Math.max(c.fadeOut, overlapOut(p, c)))) * (c.volume / 100);
        audio.push({ clip: c, media, gain: clamp(g, 0, 2) });
      }
    }
  }
  for (const track of p.tracks.filter((x) => x.kind === "audio")) {
    if (!heard.has(track.id)) continue;
    for (const c of clipsOn(p, track.id)) {
      if (t < c.at || t >= endOf(c)) continue;
      const into = t - c.at, left = endOf(c) - t;
      // Sound crossfades both ways: the outgoing falls as the incoming rises.
      const g = Math.min(ramp(into, Math.max(c.fadeIn, overlapIn(p, c))), ramp(left, Math.max(c.fadeOut, overlapOut(p, c))))
        * (c.volume / 100) * (track.level / 100);
      audio.push({ clip: c, media: c.in + into * c.speed, gain: clamp(g, 0, 4) });
    }
  }
  const total = lengthOf(p);
  const master = Math.min(ramp(t, p.fadeIn), ramp(total - t, p.fadeOut));
  return { video, audio, master: clamp(master, 0, 1) };
}

// ---- edits: each returns a NEW project ----

const withClips = (p, clips) => ({ ...p, clips });

export function addTrack(p, kind) {
  if (p.tracks.length >= MAX_TRACKS) return p;
  const t = { id: uid(kind === "audio" ? "a" : "v"), kind, mute: false, solo: false, level: 100 };
  // A new video track goes on top (it is usually an overlay); a new audio track at the bottom.
  return { ...p, tracks: kind === "video" ? [t, ...p.tracks] : [...p.tracks, t] };
}

export function removeTrack(p, id) {
  const t = trackOf(p, id);
  if (!t) return p;
  if (t.kind === "video" && p.tracks.filter((x) => x.kind === "video").length <= 1) return p;
  return { ...p, tracks: p.tracks.filter((x) => x.id !== id), clips: p.clips.filter((c) => c.track !== id) };
}

export function moveTrack(p, id, dir) {
  const t = trackOf(p, id);
  if (!t) return p;
  const same = p.tracks.filter((x) => x.kind === t.kind);
  const i = same.indexOf(t), j = i + dir;
  if (j < 0 || j >= same.length) return p;
  [same[i], same[j]] = [same[j], same[i]];
  const video = t.kind === "video" ? same : p.tracks.filter((x) => x.kind === "video");
  const aud = t.kind === "audio" ? same : p.tracks.filter((x) => x.kind === "audio");
  return { ...p, tracks: [...video, ...aud] };
}

export const setTrack = (p, id, patch) => ({ ...p, tracks: p.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });

/** The track a new clip of this kind lands on: titles on the top video track, other pictures on the bottom one. */
export function defaultTrack(p, clipKind) {
  const ts = p.tracks.filter((t) => t.kind === trackKindFor(clipKind));
  if (!ts.length) return null;
  return clipKind === "text" ? ts[0].id : ts[ts.length - 1].id;
}

/** Add clips end to end, in the order given, after whatever is already on the track (or from `at`). */
export function addClips(p, list, { track, at } = {}) {
  let next = p;
  const added = [];
  for (const raw of list || []) {
    if (next.clips.length >= MAX_CLIPS) break;
    let q = next;
    let tid = track && trackOf(q, track)?.kind === trackKindFor(raw.kind) ? track : defaultTrack(q, raw.kind);
    if (!tid) { q = addTrack(q, trackKindFor(raw.kind)); tid = defaultTrack(q, raw.kind); }
    const on = clipsOn(q, tid);
    const start = at != null && added.length === 0 ? at : (at != null ? endOf(added[added.length - 1]) : (on.length ? endOf(on[on.length - 1]) : 0));
    const c = cleanClip({ ...raw, id: raw.id || uid(), track: tid, at: start });
    added.push(c);
    next = withClips(q, [...q.clips, c]);
  }
  return next;
}

export function updateClip(p, id, patch) {
  return withClips(p, p.clips.map((c) => (c.id === id ? cleanClip({ ...c, ...patch }) : c)));
}

export const removeClip = (p, id) => withClips(p, p.clips.filter((c) => c.id !== id));

/** Move a clip in time and, if asked, to another track of the right kind. */
export function moveClip(p, id, at, trackId) {
  const c = p.clips.find((x) => x.id === id);
  if (!c) return p;
  const t = trackId && trackOf(p, trackId)?.kind === trackKindFor(c.kind) ? trackId : c.track;
  return updateClip(p, id, { at: Math.max(0, at), track: t });
}

/**
 * Drag an edge to time `t`. The START edge moves the clip's start and eats into
 * (or gives back) its beginning; the END edge does the same at the far end. A
 * video or audio file can never be stretched past what it holds; a photo or a
 * title is as long as you make it.
 */
export function trimClip(p, id, edge, t) {
  const c = p.clips.find((x) => x.id === id);
  if (!c) return p;
  const end = endOf(c);
  if (edge === "start") {
    if (isMedia(c.kind)) {
      const lo = c.at - c.in / c.speed;                 // where the file's first frame would sit
      const at = clamp(t, Math.max(0, lo), end - MIN_LEN);
      return updateClip(p, id, { at, in: c.in + (at - c.at) * c.speed });
    }
    const at = clamp(t, Math.max(0, end - STILL_SECONDS.max), end - STILL_SECONDS.min);
    return updateClip(p, id, { at, seconds: end - at });
  }
  if (isMedia(c.kind)) {
    const hi = c.at + (c.duration - c.in) / c.speed;
    const e = clamp(t, c.at + MIN_LEN, hi);
    return updateClip(p, id, { out: c.in + (e - c.at) * c.speed });
  }
  return updateClip(p, id, { seconds: clamp(t - c.at, STILL_SECONDS.min, STILL_SECONDS.max) });
}

/** Cut a clip in two at `t` (Vegas's S). Nothing happens unless `t` is inside it. */
export function splitClip(p, id, t) {
  const c = p.clips.find((x) => x.id === id);
  if (!c || t <= c.at + MIN_LEN / 2 || t >= endOf(c) - MIN_LEN / 2) return p;
  const into = t - c.at;
  let a, b;
  if (isMedia(c.kind)) {
    const cut = c.in + into * c.speed;
    a = cleanClip({ ...c, out: cut, fadeOut: 0 });
    b = cleanClip({ ...c, id: uid(), at: t, in: cut, fadeIn: 0 });
  } else {
    a = cleanClip({ ...c, seconds: into, fadeOut: 0 });
    b = cleanClip({ ...c, id: uid(), at: t, seconds: lenOf(c) - into, fadeIn: 0 });
  }
  return withClips(p, p.clips.flatMap((x) => (x.id === id ? [a, b] : [x])));
}

/** A copy straight after the clip, on the same track. */
export function duplicateClip(p, id) {
  const c = p.clips.find((x) => x.id === id);
  if (!c || p.clips.length >= MAX_CLIPS) return p;
  return withClips(p, [...p.clips, cleanClip({ ...c, id: uid(), at: endOf(c) })]);
}

/** Lay a track's clips end to end from 0:00 in their current order — gaps and overlaps gone. */
export function closeGaps(p, trackId) {
  return relay(p, trackId, clipsOn(p, trackId));
}

/** Put a track's clips in the order they were TAKEN (the file's own date), end to end. */
export function orderByTaken(p, trackId) {
  return relay(p, trackId, [...clipsOn(p, trackId)].sort((a, b) => a.taken - b.taken || a.at - b.at));
}

function relay(p, trackId, ordered) {
  let t = 0;
  const at = new Map();
  for (const c of ordered) { at.set(c.id, t); t += lenOf(c); }
  return withClips(p, p.clips.map((c) => (at.has(c.id) ? cleanClip({ ...c, at: at.get(c.id) }) : c)));
}

/** The nearest edge to snap to — 0:00, the playhead, or any other clip's start or end — within `tol` seconds. */
export function snap(p, t, { except, tol = 0.15, playhead } = {}) {
  let best = t, d = tol;
  const consider = (x) => { if (Math.abs(x - t) < d) { d = Math.abs(x - t); best = x; } };
  consider(0);
  if (playhead != null) consider(playhead);
  for (const c of p.clips) {
    if (c.id === except) continue;
    consider(c.at); consider(endOf(c));
  }
  return best;
}

/** Why a project cannot be exported yet, as one sentence, or "" when it can. Said beside Export. */
export function blockedReason(p, { recorder = true } = {}) {
  if (!recorder) return "This browser can't record a canvas, so it can't make the file. Chrome, Edge, Firefox or a recent Safari can.";
  if (!p.clips.some((c) => isVisual(c.kind))) return "Add at least one video, photo or title.";
  if (p.clips.some((c) => isMedia(c.kind) && !(c.duration > 0))) return "A file is still loading.";
  const total = lengthOf(p);
  if (total > MAX_SECONDS) return `That runs ${clock(total)} — the most is ${clock(MAX_SECONDS)}, because export runs at playback speed.`;
  return "";
}

export const clock = (s, tenths = false) => {
  const v = Math.max(0, num(s, 0));
  const whole = tenths ? Math.floor(v) : Math.round(v);
  const base = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  return tenths ? `${base}.${Math.floor((v - whole) * 10)}` : base;
};

/** The file type to record, best first; the first the browser takes wins. */
export const RECORD_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
export function pickRecordType(isSupported) {
  for (const t of RECORD_TYPES) {
    try { if (isSupported(t)) return t; } catch { /* a browser that throws on the question has not got it */ }
  }
  return "";
}
export const extFor = (type) => (String(type).startsWith("video/mp4") ? "mp4" : "webm");

/** What kind of clip a file makes, from its type. Null for anything VideoZ cannot use. */
export function kindOfFile(type) {
  const t = String(type || "");
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  return null;
}
