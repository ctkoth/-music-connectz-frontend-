// VideoZ lip-sync: a photo's mouth moves with a voice.
//
// What it is, said plainly because the screen says it too: the mouth OPENS
// with how loud the voice is in the speech band and WIDENS or ROUNDS with its
// tone (bright "ee" sounds pull wide, dark "oo" sounds pull round). It follows
// the SOUND, not the words — there is no speech model here and no server. That
// is why it is free to run and works offline, and why it reads best on a face
// looking at the camera with its lips closed.
//
// `voiceTrack` is pure (samples in, a per-frame mouth out) and tested under
// node; `loadVoice` decodes a file in the browser and caches its track.

export const TRACK_FPS = 60;
export const MAX_VOICE_SECONDS = 8 * 60;   // decoding holds the whole file in memory
export const DEFAULT_BOX = Object.freeze({ x: 0.42, y: 0.62, w: 0.16, h: 0.04 });
export const NOTE = "The mouth opens with the voice's loudness and widens or rounds with its tone — it follows the sound, "
  + "not the words. Box the closed lips on a face looking at the camera. Runs on your device; nothing is sent anywhere.";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// One-pole filters: enough to split speech into the band that carries loudness
// and the two halves that carry the vowel's colour.
function onePole(x, sr, hz, high) {
  const a = Math.exp((-2 * Math.PI * hz) / sr);
  const out = new Float32Array(x.length);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y = (1 - a) * x[i] + a * y;
    out[i] = high ? x[i] - y : y;
  }
  return out;
}
const band = (x, sr, lo, hi) => onePole(onePole(onePole(x, sr, lo, true), sr, hi, false), sr, hi, false);

function percentile(arr, p) {
  const s = Float32Array.from(arr).sort();
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
}

/**
 * A mouth for every 1/fps of `samples` (mono, `sr` Hz):
 *   open[i] 0 (closed) .. 1 (wide open)
 *   wide[i] -1 (round, "oo") .. +1 (wide, "ee"), 0 when closed
 * Loudness is measured against the file's OWN quiet and loud (its 20th and
 * 97th percentiles), so a quiet recording moves the mouth as much as a loud one.
 */
export function voiceTrack(samples, sr, fps = TRACK_FPS) {
  const hop = Math.max(1, Math.round(sr / fps));
  const n = Math.floor(samples.length / hop);
  const speech = band(samples, sr, 250, 3500);
  const low = band(samples, sr, 250, 1000);
  const high = band(samples, sr, 1800, 4500);
  const db = new Float32Array(n), tilt = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let s = 0, l = 0, h = 0;
    for (let i = f * hop; i < (f + 1) * hop; i++) { s += speech[i] ** 2; l += low[i] ** 2; h += high[i] ** 2; }
    db[f] = 10 * Math.log10(s / hop + 1e-10);
    tilt[f] = 10 * Math.log10((h + 1e-10) / (l + 1e-10));
  }
  const floor = percentile(db, 0.2), top = percentile(db, 0.97);
  const span = Math.max(6, top - floor);      // a near-silent file never reads as shouting
  const open = new Float32Array(n), wide = new Float32Array(n);
  let o = 0, w = 0;
  for (let f = 0; f < n; f++) {
    const target = clamp((db[f] - floor - span * 0.12) / (span * 0.88), 0, 1) ** 0.8;
    // A mouth opens fast and closes a little slower, as a real one does.
    o += (target - o) * (target > o ? 0.55 : 0.25);
    const tw = o > 0.05 ? clamp((tilt[f] + 12) / 12, -1, 1) : 0;
    w += (tw - w) * 0.3;
    open[f] = o;
    wide[f] = w;
  }
  return { fps, open, wide, seconds: n / fps };
}

/** The mouth at `sec` into the voice — closed outside it. */
export function mouthAt(track, sec) {
  if (!track || !(sec >= 0)) return { open: 0, wide: 0 };
  const x = sec * track.fps;
  const i = Math.floor(x);
  if (i >= track.open.length - 1) return { open: 0, wide: 0 };
  const k = x - i;
  return {
    open: track.open[i] * (1 - k) + track.open[i + 1] * k,
    wide: track.wide[i] * (1 - k) + track.wide[i + 1] * k,
  };
}

/** A box kept inside the picture and never smaller than a sliver. */
const fin = (v, d) => (v !== null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
export function cleanBox(b) {
  const w = clamp(fin(b?.w, DEFAULT_BOX.w), 0.03, 1);
  const h = clamp(fin(b?.h, DEFAULT_BOX.h), 0.02, 1);
  return { x: clamp(fin(b?.x, DEFAULT_BOX.x), 0, 1 - w), y: clamp(fin(b?.y, DEFAULT_BOX.y), 0, 1 - h), w, h };
}

/** A photo's lip-sync settings, cleaned: off unless switched on, the whole mix unless one clip is named. */
export function cleanLip(l) {
  return { on: !!l?.on, source: typeof l?.source === "string" && l.source ? l.source : "mix", box: cleanBox(l?.box) };
}

/**
 * Which voice drives a photo at timeline time `t`:
 *   source "mix" — whatever is audible (the loudest mouth among the clips playing)
 *   source <clip id> — that one clip, and a closed mouth when it is not playing
 * `audible` is project.activeAt(t).audio; `tracks` maps a clip's src to its voice track.
 */
export function mouthFor(source, audible, tracks) {
  let best = { open: 0, wide: 0 };
  for (const a of audible || []) {
    if (source !== "mix" && a.clip.id !== source) continue;
    const m = mouthAt(tracks.get(a.clip.src)?.track, a.media);
    const open = m.open * Math.min(1, a.gain ?? 1);
    if (open > best.open) best = { open, wide: m.wide };
  }
  return best;
}

// ---- browser: decode once per file ----

export const voices = new Map();   // src -> { state: "loading"|"ready"|"error", track?, error? }
const waiters = new Set();
export const onVoices = (f) => { waiters.add(f); return () => waiters.delete(f); };
const told = () => waiters.forEach((f) => f());

export function loadVoice(src) {
  if (!src || voices.has(src)) return;
  voices.set(src, { state: "loading" });
  told();
  (async () => {
    const buf = await (await fetch(src)).arrayBuffer();
    const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ac = new AC(1, 1, 44100);
    const audio = await ac.decodeAudioData(buf);
    if (audio.duration > MAX_VOICE_SECONDS) throw new Error(`Lip-sync reads up to ${MAX_VOICE_SECONDS / 60} minutes of a voice.`);
    const mono = new Float32Array(audio.length);
    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      const d = audio.getChannelData(ch);
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / audio.numberOfChannels;
    }
    voices.set(src, { state: "ready", track: voiceTrack(mono, audio.sampleRate) });
  })().catch((e) => voices.set(src, { state: "error", error: e?.message || "Couldn't read that file's sound." }))
    .finally(told);
}
