// The built-in effects every DAW in DawZ shares: what each one is, its controls, and how it is wired.
//
// A track's insert chain is a list of `{ id, type, on, params }`. The SPEC half of this file (PLUGINS,
// cleanInsert, makeImpulse) is pure and tested under node; `buildInsert` makes the Web Audio nodes and
// works on an AudioContext (playback) and an OfflineAudioContext (bounce) alike — one builder, so what
// was heard is what is written.
//
// Why built-in and not VST: a VST is a native desktop program and no web page can load one. Plugins
// written FOR the web exist (Web Audio Modules), but a third-party plugin is somebody else's code
// running inside this page with the member's sign-in — so outside plugins wait for the Windows app,
// where they can run apart from it. The server says this to the member (`plugin_note` on /dawz/).

import { bandOn, cleanBands, defaultBands } from "../eqbands.js";

export const MAX_INSERTS = 8;

const P = (label, min, max, def, unit = "", step) => ({ label, min, max, default: def, unit, step: step ?? (max - min > 50 ? 1 : 0.1) });

export const PLUGINS = {
  // The EQ holds a list of bands (src/eqbands.js), not fixed params: how many is the tier's (`eq_bands`,
  // Free 3 / Premium 6 / StatZ unlimited), the same model as TrackZ's channel strip. An EQ saved before
  // bands existed (lowGain / midFreq / …) opens as the three bands it always was.
  eq: {
    label: "EQ", emoji: "🎚️", what: "Shelve the lows and highs and push or cut any frequency in between — as many bands as your plan holds.",
    params: {},
  },
  comp: {
    label: "Compressor", emoji: "🗜️", what: "Turns loud moments down so the track sits evenly; make-up gain brings the level back.",
    params: {
      threshold: P("Threshold", -60, 0, -18, "dB"), ratio: P("Ratio", 1, 20, 4, ":1"),
      attack: P("Attack", 0.1, 200, 10, "ms"), release: P("Release", 10, 1000, 150, "ms"),
      knee: P("Knee", 0, 40, 6, "dB"), makeup: P("Make-up", 0, 24, 0, "dB"),
    },
  },
  delay: {
    label: "Delay", emoji: "🔁", what: "Repeats the sound. Sync puts the repeat on the session's beat.",
    params: {
      time: P("Time", 10, 2000, 375, "ms"), sync: P("Sync to tempo (beats, 0 = off)", 0, 4, 0, "beats", 0.25),
      feedback: P("Feedback", 0, 90, 35, "%"), mix: P("Mix", 0, 100, 25, "%"),
    },
  },
  reverb: {
    label: "Reverb", emoji: "🏛️", what: "Puts the track in a room. Longer decay is a bigger space.",
    params: { decay: P("Decay", 0.2, 8, 1.8, "s"), predelay: P("Pre-delay", 0, 200, 15, "ms"), mix: P("Mix", 0, 100, 20, "%") },
  },
  filter: {
    label: "Filter", emoji: "🌗", what: "High-pass cuts rumble below the frequency; low-pass cuts fizz above it.",
    params: { mode: P("Low-pass ← 0 · 1 → High-pass", 0, 1, 1, "", 1), freq: P("Frequency", 20, 20000, 80, "Hz"), q: P("Resonance (Q)", 0.1, 12, 0.7, "") },
  },
  gain: {
    label: "Gain", emoji: "🔊", what: "Turns the signal up or down before the next effect.",
    params: { db: P("Gain", -24, 24, 0, "dB") },
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
let seq = 0;

export const EQ_GAIN = 18;
// An EQ from before bands: low shelf, one bell, high shelf, at the frequencies it was saved with.
const legacyEqBands = (p = {}) => [
  { type: "lowshelf", f: num(p.lowFreq, 100), gain: num(p.lowGain, 0), q: 1 },
  { type: "peaking", f: num(p.midFreq, 1000), gain: num(p.midGain, 0), q: num(p.midQ, 1) },
  { type: "highshelf", f: num(p.highFreq, 8000), gain: num(p.highGain, 0), q: 1 },
];

export function newInsert(type) {
  const spec = PLUGINS[type];
  if (!spec) return null;
  const ins = { id: `i${Date.now().toString(36)}${(seq++).toString(36)}`, type, on: true, params: Object.fromEntries(Object.entries(spec.params).map(([k, p]) => [k, p.default])) };
  if (type === "eq") ins.bands = defaultBands();
  return ins;
}

/** An insert with every param present and in range; an unknown type is dropped (null). */
export function cleanInsert(raw) {
  const spec = PLUGINS[raw?.type];
  if (!spec) return null;
  const params = Object.fromEntries(Object.entries(spec.params).map(([k, p]) => [k, clamp(num(raw.params?.[k], p.default), p.min, p.max)]));
  const out = { id: String(raw.id || newInsert(raw.type).id), type: raw.type, on: raw.on !== false, params };
  if (raw.type === "eq") out.bands = cleanBands(Array.isArray(raw.bands) ? raw.bands : legacyEqBands(raw.params), { gain: EQ_GAIN });
  return out;
}

export const cleanInserts = (list) => (Array.isArray(list) ? list : []).map(cleanInsert).filter(Boolean).slice(0, MAX_INSERTS);

export const dbToGain = (db) => (db <= -60 ? 0 : 10 ** (db / 20));

/** A reverb impulse, made from a seeded noise so the preview and the bounce use the identical room. */
export function makeImpulse(rate, decay, seed = 7) {
  const len = Math.max(1, Math.round(rate * decay));
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296 * 2 - 1; };
  const chans = [new Float32Array(len), new Float32Array(len)];
  for (let i = 0; i < len; i++) {
    const env = (1 - i / len) ** 3;
    chans[0][i] = rnd() * env;
    chans[1][i] = rnd() * env;
  }
  return chans;
}

/** The delay time in seconds: synced to the beat when `sync` is set, otherwise the ms value. */
export const delaySeconds = (params, bpm) => (params.sync > 0 ? (60 / bpm) * params.sync : params.time / 1000);

// ---- Web Audio -------------------------------------------------------------------------------

function wetDry(ctx, input, output, wetPath, mix) {
  const dry = ctx.createGain(); const wet = ctx.createGain();
  input.connect(dry).connect(output);
  wetPath.out.connect(wet).connect(output);
  input.connect(wetPath.in);
  const set = (m) => { dry.gain.value = 1 - m / 100; wet.gain.value = m / 100; };
  set(mix);
  return set;
}

/** Nodes for one insert: `{ input, output, update(params) }`. A bypassed insert is a straight wire. */
export function buildInsert(ctx, insert, { bpm = 120 } = {}) {
  const input = ctx.createGain();
  const output = ctx.createGain();
  if (!insert.on) { input.connect(output); return { input, output, update() {} }; }
  const p = insert.params;
  switch (insert.type) {
    case "eq": {
      // One BiquadFilterNode per band that moves anything, in order. A change to the bands rebuilds
      // the graph (Workspace restarts playback on every insert change), so `update` has nothing to do.
      const nyq = ctx.sampleRate * 0.45;
      let at = input;
      for (const b of cleanBands(insert.bands ?? legacyEqBands(p), { gain: EQ_GAIN }).filter(bandOn)) {
        const f = ctx.createBiquadFilter();
        f.type = b.type; f.frequency.value = Math.min(b.f, nyq); f.gain.value = b.gain;
        if (b.type === "peaking") f.Q.value = b.q;
        at.connect(f); at = f;
      }
      at.connect(output);
      return { input, output, update() {} };
    }
    case "comp": {
      const c = ctx.createDynamicsCompressor(); const mk = ctx.createGain();
      input.connect(c).connect(mk).connect(output);
      const update = (q) => {
        c.threshold.value = q.threshold; c.ratio.value = q.ratio; c.knee.value = q.knee;
        c.attack.value = q.attack / 1000; c.release.value = q.release / 1000; mk.gain.value = dbToGain(q.makeup);
      };
      update(p);
      return { input, output, update };
    }
    case "delay": {
      const d = ctx.createDelay(4); const fb = ctx.createGain();
      d.connect(fb).connect(d);
      const setMix = wetDry(ctx, input, output, { in: d, out: d }, p.mix);
      const update = (q) => { d.delayTime.value = Math.min(4, delaySeconds(q, bpm)); fb.gain.value = q.feedback / 100; setMix(q.mix); };
      update(p);
      return { input, output, update };
    }
    case "reverb": {
      const pre = ctx.createDelay(1); const conv = ctx.createConvolver();
      pre.connect(conv);
      const room = (decay) => {
        const chans = makeImpulse(ctx.sampleRate, decay);
        const buf = ctx.createBuffer(2, chans[0].length, ctx.sampleRate);
        buf.copyToChannel(chans[0], 0); buf.copyToChannel(chans[1], 1);
        conv.buffer = buf;
      };
      room(p.decay);
      let lastDecay = p.decay;
      const setMix = wetDry(ctx, input, output, { in: pre, out: conv }, p.mix);
      const update = (q) => { pre.delayTime.value = q.predelay / 1000; setMix(q.mix); if (q.decay !== lastDecay) { lastDecay = q.decay; room(q.decay); } };
      update(p);
      return { input, output, update };
    }
    case "filter": {
      const f = ctx.createBiquadFilter();
      input.connect(f).connect(output);
      const update = (q) => { f.type = q.mode >= 0.5 ? "highpass" : "lowpass"; f.frequency.value = q.freq; f.Q.value = q.q; };
      update(p);
      return { input, output, update };
    }
    case "gain": {
      const g = ctx.createGain();
      input.connect(g).connect(output);
      const update = (q) => { g.gain.value = dbToGain(q.db); };
      update(p);
      return { input, output, update };
    }
    default:
      input.connect(output);
      return { input, output, update() {} };
  }
}
