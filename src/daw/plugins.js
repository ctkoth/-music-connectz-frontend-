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
  // StatZ's (or the daily sample) — the effects people otherwise buy as plugins. Built from the browser's own
  // nodes, so what is heard while editing is what the bounce holds. One already on a track keeps playing after a
  // lapse; only adding a new one locks. `statz: true` is what the Mix window reads.
  saturate: {
    label: "Saturation", emoji: "🔥", statz: true, what: "Tape-style warmth: drives the signal into soft clipping, so it sounds thicker and louder without harsh peaks.",
    params: { drive: P("Drive", 0, 24, 6, "dB"), tone: P("Tone", 1000, 20000, 9000, "Hz"), mix: P("Mix", 0, 100, 100, "%") },
  },
  chorus: {
    label: "Chorus", emoji: "🌊", statz: true, what: "A doubler: slightly delayed, gently wobbling copies make one voice or guitar sound like several.",
    params: { rate: P("Rate", 0.05, 5, 0.8, "Hz"), depth: P("Depth", 0, 10, 3, "ms"), mix: P("Mix", 0, 100, 40, "%") },
  },
  deess: {
    label: "De-esser", emoji: "🐍", statz: true, what: "Tames harsh \"s\" and \"t\" sounds: only the top end above the frequency is compressed, the rest of the voice is left alone.",
    params: { freq: P("Frequency", 3000, 12000, 6000, "Hz"), threshold: P("Threshold", -60, 0, -30, "dB"), ratio: P("Amount", 1, 20, 6, ":1") },
  },
  limiter: {
    label: "Limiter", emoji: "🧱", statz: true, what: "Makes a track louder while stopping its peaks at the ceiling, so it never clips. It looks 2 ms ahead, so the gain is already down when a peak arrives — it turns peaks down smoothly instead of chopping them off. Both channels move together, so the stereo image holds. It delays the track by 2 ms.",
    params: { drive: P("Drive", 0, 18, 3, "dB"), ceiling: P("Ceiling", -12, 0, -1, "dB"), release: P("Release", 10, 1000, 100, "ms") },
  },
  duck: {
    label: "Sidechain ducker", emoji: "🦆", statz: true, what: "Turns THIS track down while another track is loud — the sidechain, such as a kick or a voice: a pad that ducks under the kick, a beat that ducks under the vocal. Pick the track that triggers it.",
    params: {
      threshold: P("Threshold", -60, 0, -30, "dB"), ratio: P("Amount", 1, 20, 6, ":1"),
      attack: P("Attack", 0.1, 100, 5, "ms"), release: P("Release", 10, 1000, 150, "ms"), depth: P("Most it turns down", 0, 40, 18, "dB"),
    },
  },
  glue: {
    label: "Glue compressor", emoji: "🧲", statz: true, what: "Bus-style compression with a parallel blend: the compressed copy is mixed under the dry one, so it holds together and keeps its punch.",
    params: {
      threshold: P("Threshold", -60, 0, -20, "dB"), ratio: P("Ratio", 1, 10, 4, ":1"),
      attack: P("Attack", 0.1, 100, 30, "ms"), release: P("Release", 10, 1200, 200, "ms"),
      makeup: P("Make-up", 0, 18, 1, "dB"), mix: P("Parallel mix", 0, 100, 50, "%"),
    },
  },
  proverb: {
    label: "Pro reverb", emoji: "🎭", statz: true, what: "A reverb with character: room, plate or hall, how dark the tail gets, and how wide it spreads.",
    params: {
      type: P("Room · 0  Plate · 1  Hall · 2", 0, 2, 1, "", 1), decay: P("Decay", 0.2, 10, 2.4, "s"), predelay: P("Pre-delay", 0, 250, 20, "ms"),
      damp: P("Damping (tail tone)", 1000, 18000, 7000, "Hz"), width: P("Width", 0, 200, 120, "%"), mix: P("Mix", 0, 100, 22, "%"),
    },
  },
  prodelay: {
    label: "Pro delay", emoji: "🏓", statz: true, what: "Ping-pong echoes that bounce left and right, with each repeat filtered darker or thinner.",
    params: {
      time: P("Time", 10, 2000, 375, "ms"), sync: P("Sync to tempo (beats, 0 = off)", 0, 4, 0.5, "beats", 0.25),
      feedback: P("Feedback", 0, 90, 40, "%"), lowcut: P("Repeats low cut", 20, 2000, 200, "Hz"),
      highcut: P("Repeats high cut", 1000, 20000, 6000, "Hz"), mix: P("Mix", 0, 100, 25, "%"),
    },
  },
  widen: {
    label: "Stereo widener", emoji: "↔️", statz: true, what: "Spreads a stereo track wider (or narrows it) by turning its sides up against its centre.",
    params: { width: P("Width", 0, 200, 140, "%") },
  },
};
/** The effects that are StatZ's. */
export const STATZ_PLUGINS = Object.keys(PLUGINS).filter((k) => PLUGINS[k].statz);

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
  if (raw.type === "duck" && raw.source) out.source = String(raw.source).slice(0, 40);      // the track whose level triggers it
  if (raw.type === "eq") out.bands = cleanBands(Array.isArray(raw.bands) ? raw.bands : legacyEqBands(raw.params), { gain: EQ_GAIN });
  // StatZ's blend for every effect that has no mix of its own: how much of it is heard against the untouched sound.
  const amt = clamp(num(raw.amount, 100), 0, 100);
  if (amt < 100) out.amount = amt;
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
/** `amount` (0-100, StatZ) blends an effect with the untouched sound, for the effects that have no mix of their own.
 *  50 is half as present. Effects with a mix control are blended by that control instead, so nothing is applied twice. */
export function buildInsert(ctx, insert, opts = {}) {      // opts: { bpm, sidechain: the node carrying the sidechain track's signal }
  const core = buildCore(ctx, insert, opts);
  const a = Number.isFinite(Number(insert.amount)) ? clamp(Number(insert.amount) / 100, 0, 1) : 1;
  if (a >= 1 || !insert.on || PLUGINS[insert.type]?.params?.mix) return core;
  const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
  dry.gain.value = 1 - a; wet.gain.value = a;
  input.connect(dry); dry.connect(output);
  input.connect(core.input); core.output.connect(wet); wet.connect(output);
  return { ...core, input, output };
}

function buildCore(ctx, insert, { bpm = 120, sidechain = null } = {}) {
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
    case "saturate": {
      const pre = ctx.createGain(); const shaper = ctx.createWaveShaper(); const toneLp = ctx.createBiquadFilter(); const comp = ctx.createGain();
      toneLp.type = "lowpass";
      const curve = new Float32Array(2048);
      for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5); }
      shaper.curve = curve; shaper.oversample = "4x";
      pre.connect(shaper).connect(toneLp).connect(comp);
      const setMix = wetDry(ctx, input, output, { in: pre, out: comp }, p.mix);
      // Drive goes in, the same amount comes back off, so turning it up adds colour rather than just level.
      const update = (q) => { pre.gain.value = dbToGain(q.drive); comp.gain.value = dbToGain(-q.drive * 0.7); toneLp.frequency.value = Math.min(q.tone, ctx.sampleRate * 0.45); setMix(q.mix); };
      update(p);
      return { input, output, update };
    }
    case "chorus": {
      const dl = ctx.createDelay(0.1), dr = ctx.createDelay(0.1);
      const lfo = ctx.createOscillator(), depth = ctx.createGain(), depthR = ctx.createGain(), wet = ctx.createGain();
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
      lfo.type = "sine"; lfo.connect(depth).connect(dl.delayTime); lfo.connect(depthR); depthR.connect(dr.delayTime);
      split.connect(dl, 0); split.connect(dr, 1); dl.connect(merge, 0, 0); dr.connect(merge, 0, 1); merge.connect(wet);
      const tap = ctx.createGain(); tap.connect(split);
      const setMix = wetDry(ctx, input, output, { in: tap, out: wet }, p.mix);
      // The two sides wobble in opposite directions, which is what makes it sound wide rather than seasick.
      const update = (q) => { lfo.frequency.value = q.rate; const d = q.depth / 1000; dl.delayTime.value = 0.012 + d; dr.delayTime.value = 0.012 + d; depth.gain.value = d; depthR.gain.value = -d; setMix(q.mix); };
      update(p); lfo.start();
      return { input, output, update };
    }
    case "deess": {
      // A split-band de-esser: the top band (above `freq`) goes through its own fast compressor, the rest passes
      // untouched, and the two are summed. Linkwitz-Riley-style pairs keep the sum flat when nothing is compressed.
      const lo1 = ctx.createBiquadFilter(), lo2 = ctx.createBiquadFilter(), hi1 = ctx.createBiquadFilter(), hi2 = ctx.createBiquadFilter();
      [lo1, lo2].forEach((f) => { f.type = "lowpass"; f.Q.value = Math.SQRT1_2; });
      [hi1, hi2].forEach((f) => { f.type = "highpass"; f.Q.value = Math.SQRT1_2; });
      const c = ctx.createDynamicsCompressor(); c.knee.value = 3; c.attack.value = 0.001; c.release.value = 0.05;
      input.connect(lo1).connect(lo2).connect(output);
      input.connect(hi1).connect(hi2).connect(c).connect(output);
      const update = (q) => { const f = Math.min(q.freq, ctx.sampleRate * 0.45); [lo1, lo2, hi1, hi2].forEach((x) => { x.frequency.value = f; }); c.threshold.value = q.threshold; c.ratio.value = q.ratio; };
      update(p);
      return { input, output, update };
    }
    case "limiter": {
      // The real one: a lookahead limiter in an AudioWorklet (limiterDsp.js), which turns the gain down BEFORE a
      // peak arrives instead of clipping it. It needs the module added to this context first (`loadDsp` in
      // engine.js does, before the graph is built); where that is not possible — an old browser — the chain
      // below is the fallback, so a session never goes silent for lack of it.
      if (ctx.__mczLimiter && typeof AudioWorkletNode !== "undefined") {
        const node = new AudioWorkletNode(ctx, "mcz-limiter", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: "explicit" });
        input.connect(node).connect(output);
        const update = (q) => {
          node.parameters.get("drive").value = dbToGain(q.drive);
          node.parameters.get("ceiling").value = dbToGain(q.ceiling);
          node.parameters.get("release").value = q.release;
        };
        update(p);
        // `dispose` ends the processor. Without it every Play left one more limiter running in the audio thread, and after a few presses
        // the audio engine was out of time and NOTHING played, not even tracks with no effects.
        return { input, output, update, meter: node.port, dispose: () => { try { node.port.postMessage("stop"); node.disconnect(); } catch { /* already gone */ } } };
      }
      const drive = ctx.createGain(), c = ctx.createDynamicsCompressor(), ceil = ctx.createGain();
      c.ratio.value = 20; c.knee.value = 0; c.attack.value = 0.001;
      // The compressor alone lets the first millisecond of a hit through (measured: 0.98 at a −1 dB ceiling), so a
      // hard stop at the ceiling follows it. A limiter that can pass its ceiling is not one.
      const stop = ctx.createWaveShaper(), pre4 = ctx.createGain(), post4 = ctx.createGain();
      input.connect(drive).connect(c).connect(ceil).connect(pre4).connect(stop).connect(post4).connect(output);
      let lastCeil = null;
      const update = (q) => {
        drive.gain.value = dbToGain(q.drive); c.threshold.value = q.ceiling; c.release.value = q.release / 1000; ceil.gain.value = 1;
        if (q.ceiling !== lastCeil) {
          lastCeil = q.ceiling;
          const lim = dbToGain(q.ceiling), n = 8193, curve = new Float32Array(n);
          for (let i = 0; i < n; i++) { const x = ((i / (n - 1)) * 2 - 1) * 4; curve[i] = Math.max(-lim, Math.min(lim, x)); }
          stop.curve = curve;
          pre4.gain.value = 0.25; post4.gain.value = 1;   // the curve spans ±4, so a quarter in maps straight to the clamp
        }
      };
      update(p);
      return { input, output, update };
    }
    case "duck": {
      // Needs the worklet module on this context (`loadDsp`) and a sidechain track; without either it passes the sound
      // through untouched rather than going silent.
      if (!ctx.__mczDuck || typeof AudioWorkletNode === "undefined" || !sidechain) { input.connect(output); return { input, output, update() {} }; }
      const node = new AudioWorkletNode(ctx, "mcz-duck", { numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [2], channelCountMode: "max" });
      input.connect(node, 0, 0); sidechain.connect(node, 0, 1); node.connect(output);
      const update = (q) => {
        for (const k of ["threshold", "ratio", "attack", "release", "depth"]) node.parameters.get(k).value = q[k];
      };
      update(p);
      return { input, output, update, dispose: () => { try { node.port.postMessage("stop"); node.disconnect(); } catch { /* already gone */ } } };
    }
    case "glue": {
      const c = ctx.createDynamicsCompressor(); const mk = ctx.createGain(); c.knee.value = 6;
      const tap = ctx.createGain(); tap.connect(c).connect(mk);
      const setMix = wetDry(ctx, input, output, { in: tap, out: mk }, p.mix);
      const update = (q) => { c.threshold.value = q.threshold; c.ratio.value = q.ratio; c.attack.value = q.attack / 1000; c.release.value = q.release / 1000; mk.gain.value = dbToGain(q.makeup); setMix(q.mix); };
      update(p);
      return { input, output, update };
    }
    case "proverb": {
      // The same seeded room as the free reverb (so preview = bounce), shaped by type: a plate is dense and bright
      // with no early gap, a hall slower to build. Damping darkens the tail; width is mid/side on the wet signal.
      const pre = ctx.createDelay(1), conv = ctx.createConvolver(), damp = ctx.createBiquadFilter();
      damp.type = "lowpass";
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
      const mid = ctx.createGain(), side = ctx.createGain(), sideAmt = ctx.createGain(), neg = ctx.createGain();
      const lM = ctx.createGain(), rM = ctx.createGain(), lS = ctx.createGain(), rS = ctx.createGain();
      lM.gain.value = rM.gain.value = lS.gain.value = 0.5; rS.gain.value = -0.5; neg.gain.value = -1;
      pre.connect(conv).connect(damp).connect(split);
      split.connect(lM, 0); split.connect(rM, 1); lM.connect(mid); rM.connect(mid);
      split.connect(lS, 0); split.connect(rS, 1); lS.connect(side); rS.connect(side); side.connect(sideAmt);
      mid.connect(merge, 0, 0); mid.connect(merge, 0, 1); sideAmt.connect(merge, 0, 0); sideAmt.connect(neg).connect(merge, 0, 1);
      const shape = (type, decay) => {
        const chans = makeImpulse(ctx.sampleRate, decay * (type === 2 ? 1.25 : type === 0 ? 0.7 : 1));
        if (type === 2) { const ramp = Math.round(ctx.sampleRate * 0.03); chans.forEach((c) => { for (let i = 0; i < ramp && i < c.length; i++) c[i] *= i / ramp; }); }
        const buf = ctx.createBuffer(2, chans[0].length, ctx.sampleRate);
        buf.copyToChannel(chans[0], 0); buf.copyToChannel(chans[1], 1); conv.buffer = buf;
      };
      let last = "";
      const setMix = wetDry(ctx, input, output, { in: pre, out: merge }, p.mix);
      const update = (q) => {
        const key = `${Math.round(q.type)}|${q.decay}`; if (key !== last) { last = key; shape(Math.round(q.type), q.decay); }
        pre.delayTime.value = q.predelay / 1000; damp.frequency.value = Math.min(q.damp, ctx.sampleRate * 0.45); sideAmt.gain.value = q.width / 100; setMix(q.mix);
      };
      update(p);
      return { input, output, update };
    }
    case "prodelay": {
      // Ping-pong: the left delay feeds the right and the right feeds the left, each repeat through a band filter.
      const dl = ctx.createDelay(4), dr = ctx.createDelay(4), fbL = ctx.createGain(), fbR = ctx.createGain();
      const lo = ctx.createBiquadFilter(), hi = ctx.createBiquadFilter(); lo.type = "highpass"; hi.type = "lowpass";
      const mono = ctx.createGain(), merge = ctx.createChannelMerger(2);
      mono.connect(lo).connect(hi).connect(dl);
      dl.connect(merge, 0, 0); dl.connect(fbL).connect(dr); dr.connect(merge, 0, 1); dr.connect(fbR).connect(dl);
      const setMix = wetDry(ctx, input, output, { in: mono, out: merge }, p.mix);
      const update = (q) => {
        const t = Math.min(4, delaySeconds(q, bpm)); dl.delayTime.value = t; dr.delayTime.value = t;
        fbL.gain.value = fbR.gain.value = q.feedback / 100;
        lo.frequency.value = q.lowcut; hi.frequency.value = Math.min(q.highcut, ctx.sampleRate * 0.45); setMix(q.mix);
      };
      update(p);
      return { input, output, update };
    }
    case "widen": {
      // Mid/side: M = (L+R)/2 and S = (L-R)/2; width scales S; L = M+S, R = M-S. 100% is untouched, 0% is mono.
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
      const lM = ctx.createGain(), rM = ctx.createGain(), lS = ctx.createGain(), rS = ctx.createGain();
      const mid = ctx.createGain(), side = ctx.createGain(), sideAmt = ctx.createGain(), sideNeg = ctx.createGain();
      lM.gain.value = 0.5; rM.gain.value = 0.5; lS.gain.value = 0.5; rS.gain.value = -0.5; sideNeg.gain.value = -1;
      input.connect(split);
      split.connect(lM, 0); split.connect(rM, 1); lM.connect(mid); rM.connect(mid);
      split.connect(lS, 0); split.connect(rS, 1); lS.connect(side); rS.connect(side);
      side.connect(sideAmt);
      mid.connect(merge, 0, 0); mid.connect(merge, 0, 1);
      sideAmt.connect(merge, 0, 0); sideAmt.connect(sideNeg).connect(merge, 0, 1);
      merge.connect(output);
      const update = (q) => { sideAmt.gain.value = q.width / 100; };
      update(p);
      return { input, output, update };
    }
    default:
      input.connect(output);
      return { input, output, update() {} };
  }
}
