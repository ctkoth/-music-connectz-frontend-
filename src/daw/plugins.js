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

export const MAX_INSERTS = 8;

const P = (label, min, max, def, unit = "", step) => ({ label, min, max, default: def, unit, step: step ?? (max - min > 50 ? 1 : 0.1) });

export const PLUGINS = {
  eq: {
    label: "EQ", emoji: "🎚️", what: "Three bands: shelve the lows and highs, push or cut one middle frequency.",
    params: {
      lowGain: P("Low", -18, 18, 0, "dB"), lowFreq: P("Low freq", 30, 400, 100, "Hz"),
      midGain: P("Mid", -18, 18, 0, "dB"), midFreq: P("Mid freq", 200, 8000, 1000, "Hz"), midQ: P("Mid width (Q)", 0.3, 8, 1, ""),
      highGain: P("High", -18, 18, 0, "dB"), highFreq: P("High freq", 2000, 16000, 8000, "Hz"),
    },
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

export function newInsert(type) {
  const spec = PLUGINS[type];
  if (!spec) return null;
  return { id: `i${Date.now().toString(36)}${(seq++).toString(36)}`, type, on: true, params: Object.fromEntries(Object.entries(spec.params).map(([k, p]) => [k, p.default])) };
}

/** An insert with every param present and in range; an unknown type is dropped (null). */
export function cleanInsert(raw) {
  const spec = PLUGINS[raw?.type];
  if (!spec) return null;
  const params = Object.fromEntries(Object.entries(spec.params).map(([k, p]) => [k, clamp(num(raw.params?.[k], p.default), p.min, p.max)]));
  return { id: String(raw.id || newInsert(raw.type).id), type: raw.type, on: raw.on !== false, params };
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
      const lo = ctx.createBiquadFilter(); lo.type = "lowshelf";
      const mid = ctx.createBiquadFilter(); mid.type = "peaking";
      const hi = ctx.createBiquadFilter(); hi.type = "highshelf";
      input.connect(lo).connect(mid).connect(hi).connect(output);
      const update = (q) => {
        lo.frequency.value = q.lowFreq; lo.gain.value = q.lowGain;
        mid.frequency.value = q.midFreq; mid.gain.value = q.midGain; mid.Q.value = q.midQ;
        hi.frequency.value = q.highFreq; hi.gain.value = q.highGain;
      };
      update(p);
      return { input, output, update };
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
