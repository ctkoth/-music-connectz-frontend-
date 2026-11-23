// The synth's patch: everything a sound is, as plain data, cleaned to safe ranges. Pure and tested. A saved patch can be
// anything a member's browser stored, so `cleanPatch` is the one door in: every number is clamped, every choice is checked.

export const OSC_SHAPES = ["sine", "triangle", "saw", "square", "wavetable"];
export const FILTER_TYPES = ["lp", "hp", "bp", "notch"];
export const LFO_SHAPES = ["sine", "triangle", "saw", "square", "random"];
export const MOD_SOURCES = ["lfo1", "lfo2", "env2", "velocity", "key"];
export const MOD_DESTS = ["pitch", "cutoff", "level", "wave", "pan", "reso"];
export const MAX_MODS = 8;
export const MAX_UNISON = 7;

const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? Number(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pick = (v, list, d) => (list.includes(v) ? v : d);
const n = (v, d, lo, hi) => clamp(num(v, d), lo, hi);

function cleanOsc(o, d) {
  return {
    shape: pick(o?.shape, OSC_SHAPES, d.shape), wave: n(o?.wave, d.wave, 0, 1),
    coarse: Math.round(n(o?.coarse, d.coarse, -48, 48)), fine: n(o?.fine, d.fine, -100, 100),
    level: n(o?.level, d.level, 0, 1), unison: Math.round(n(o?.unison, d.unison, 1, MAX_UNISON)),
    detune: n(o?.detune, d.detune, 0, 100), spread: n(o?.spread, d.spread, 0, 1),
  };
}
const cleanEnv = (e, d) => ({ a: n(e?.a, d.a, 0, 10), d: n(e?.d, d.d, 0.001, 10), s: n(e?.s, d.s, 0, 1), r: n(e?.r, d.r, 0.001, 10) });
const cleanLfo = (l, d) => ({ shape: pick(l?.shape, LFO_SHAPES, d.shape), rate: n(l?.rate, d.rate, 0.05, 30), retrig: !!(l?.retrig ?? d.retrig) });

const OSC_D = { shape: "saw", wave: 0, coarse: 0, fine: 0, level: 1, unison: 1, detune: 12, spread: 0.6 };
const ENV_D = { a: 0.005, d: 0.4, s: 0.7, r: 0.25 };
const LFO_D = { shape: "sine", rate: 4, retrig: false };

export function defaultPatch() { return cleanPatch({}); }

export function cleanPatch(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const oscs = [cleanOsc(p.oscs?.[0], OSC_D), cleanOsc(p.oscs?.[1], { ...OSC_D, level: 0 })];
  const f = p.filter || {};
  const fx = p.fx || {};
  const mods = (Array.isArray(p.mods) ? p.mods : []).slice(0, MAX_MODS)
    .filter((m) => MOD_SOURCES.includes(m?.src) && MOD_DESTS.includes(m?.dst))
    .map((m) => ({ src: m.src, dst: m.dst, amount: n(m.amount, 0, -1, 1) }));
  return {
    name: String(p.name || "Init").slice(0, 40),
    oscs,
    sub: { level: n(p.sub?.level, 0, 0, 1), octave: p.sub?.octave === -2 ? -2 : -1 },
    noise: n(p.noise, 0, 0, 1),
    filter: {
      type: pick(f.type, FILTER_TYPES, "lp"), cutoff: n(f.cutoff, 8000, 20, 20000), reso: n(f.reso, 0.1, 0, 1),
      drive: n(f.drive, 0, 0, 1), keytrack: n(f.keytrack, 0.3, 0, 1), env: n(f.env, 0, -1, 1),
    },
    amp: cleanEnv(p.amp, ENV_D), env2: cleanEnv(p.env2, { a: 0.005, d: 0.5, s: 0, r: 0.25 }),
    lfo1: cleanLfo(p.lfo1, LFO_D), lfo2: cleanLfo(p.lfo2, { ...LFO_D, rate: 0.3 }),
    mods,
    fx: {
      drive: n(fx.drive, 0, 0, 1),
      chorus: { mix: n(fx.chorus?.mix, 0, 0, 1), rate: n(fx.chorus?.rate, 0.6, 0.05, 5), depth: n(fx.chorus?.depth, 0.5, 0, 1) },
      delay: { mix: n(fx.delay?.mix, 0, 0, 1), time: n(fx.delay?.time, 0.3, 0.02, 1.5), feedback: n(fx.delay?.feedback, 0.35, 0, 0.85) },
      reverb: { mix: n(fx.reverb?.mix, 0, 0, 1), size: n(fx.reverb?.size, 0.5, 0, 1) },
    },
    gain: n(p.gain, 0.8, 0, 1.5), voices: Math.round(n(p.voices, 16, 1, 32)),
  };
}

// ---- presets --------------------------------------------------------------------------------------------------
// Written as differences from the defaults. Nobody has auditioned these by ear; the tests hold what can be measured
// (pitch, no aliasing, envelope, no clipping) and the sound itself is for a person to judge and tune.
const P = (name, o) => ({ name, ...o });
export const PRESETS = {
  ether: P("Ether pad", {
    oscs: [{ shape: "wavetable", wave: 0.3, unison: 5, detune: 18, spread: 0.9 }, { shape: "saw", coarse: -12, unison: 3, detune: 10, level: 0.5 }],
    filter: { cutoff: 1800, reso: 0.15, keytrack: 0.5 }, amp: { a: 0.9, d: 0.8, s: 0.85, r: 1.6 },
    lfo1: { shape: "sine", rate: 0.2 }, mods: [{ src: "lfo1", dst: "cutoff", amount: 0.25 }, { src: "lfo1", dst: "wave", amount: 0.2 }],
    fx: { chorus: { mix: 0.5, rate: 0.4, depth: 0.6 }, reverb: { mix: 0.45, size: 0.8 } }, gain: 0.7,
  }),
  supersaw: P("Supersaw lead", {
    oscs: [{ shape: "saw", unison: 7, detune: 32, spread: 1 }, { shape: "saw", coarse: 12, unison: 5, detune: 18, level: 0.35 }],
    filter: { cutoff: 6000, reso: 0.15, keytrack: 0.6 }, amp: { a: 0.01, d: 0.3, s: 0.8, r: 0.35 },
    fx: { delay: { mix: 0.25, time: 0.375, feedback: 0.4 }, reverb: { mix: 0.2, size: 0.5 } }, gain: 0.6,
  }),
  sub: P("Sub bass", {
    oscs: [{ shape: "sine" }, { shape: "saw", level: 0.25 }], filter: { cutoff: 700, reso: 0.1, keytrack: 0.2 },
    amp: { a: 0.004, d: 0.6, s: 0.8, r: 0.12 }, gain: 0.9,
  }),
  reese: P("Reese bass", {
    oscs: [{ shape: "saw", unison: 2, detune: 14, spread: 0.3 }, { shape: "saw", coarse: -12, level: 0.7, unison: 2, detune: 9 }],
    filter: { cutoff: 900, reso: 0.3, drive: 0.4, keytrack: 0.4 }, lfo1: { shape: "sine", rate: 0.35 },
    mods: [{ src: "lfo1", dst: "cutoff", amount: 0.35 }], amp: { a: 0.01, d: 0.4, s: 0.9, r: 0.2 }, fx: { drive: 0.25 }, gain: 0.7,
  }),
  glass: P("Glass keys", {
    oscs: [{ shape: "wavetable", wave: 0.72, unison: 2, detune: 6 }, { shape: "sine", coarse: 12, level: 0.35 }],
    filter: { cutoff: 5000, reso: 0.1, env: 0.35, keytrack: 0.8 }, env2: { a: 0.002, d: 0.7, s: 0, r: 0.4 },
    amp: { a: 0.003, d: 1.6, s: 0.05, r: 0.5 }, fx: { chorus: { mix: 0.4, rate: 0.7, depth: 0.5 }, reverb: { mix: 0.3, size: 0.6 } }, gain: 0.8,
  }),
  pluck: P("Pluck", {
    oscs: [{ shape: "saw", unison: 3, detune: 10, spread: 0.7 }], filter: { cutoff: 900, reso: 0.25, env: 0.7, keytrack: 0.7 },
    env2: { a: 0.001, d: 0.3, s: 0, r: 0.2 }, amp: { a: 0.001, d: 0.45, s: 0, r: 0.2 },
    fx: { delay: { mix: 0.2, time: 0.25, feedback: 0.35 }, reverb: { mix: 0.15, size: 0.4 } }, gain: 0.85,
  }),
  strings: P("Warm strings", {
    oscs: [{ shape: "saw", unison: 4, detune: 14, spread: 0.9 }, { shape: "triangle", coarse: 12, level: 0.3, unison: 2, detune: 8 }],
    filter: { cutoff: 2800, reso: 0.1, keytrack: 0.6 }, amp: { a: 0.35, d: 0.3, s: 0.85, r: 0.7 },
    lfo1: { shape: "sine", rate: 5.2 }, mods: [{ src: "lfo1", dst: "pitch", amount: 0.004 }],
    fx: { chorus: { mix: 0.45, rate: 0.5, depth: 0.5 }, reverb: { mix: 0.3, size: 0.7 } }, gain: 0.7,
  }),
  brass: P("Brass stab", {
    oscs: [{ shape: "saw", unison: 2, detune: 8 }, { shape: "square", level: 0.4, coarse: -12 }],
    filter: { cutoff: 700, reso: 0.15, env: 0.6, keytrack: 0.6 }, env2: { a: 0.06, d: 0.3, s: 0.35, r: 0.2 },
    amp: { a: 0.04, d: 0.3, s: 0.75, r: 0.2 }, fx: { reverb: { mix: 0.15, size: 0.4 } }, gain: 0.75,
  }),
  bell: P("Glass bell", {
    oscs: [{ shape: "sine" }, { shape: "sine", coarse: 19, level: 0.35 }], sub: { level: 0 },
    filter: { cutoff: 12000, keytrack: 0 }, amp: { a: 0.002, d: 2.5, s: 0, r: 1.2 },
    fx: { chorus: { mix: 0.25 }, reverb: { mix: 0.45, size: 0.75 } }, gain: 0.8,
  }),
  vocal: P("Vocal morph", {
    oscs: [{ shape: "wavetable", wave: 0.85, unison: 3, detune: 9, spread: 0.7 }], filter: { cutoff: 4000, reso: 0.2, keytrack: 0.6 },
    amp: { a: 0.25, d: 0.5, s: 0.85, r: 0.8 }, lfo1: { shape: "triangle", rate: 0.25 }, mods: [{ src: "lfo1", dst: "wave", amount: 0.4 }],
    fx: { chorus: { mix: 0.35 }, reverb: { mix: 0.4, size: 0.7 } }, gain: 0.7,
  }),
  wobble: P("Wobble", {
    oscs: [{ shape: "saw", unison: 2, detune: 12 }, { shape: "square", coarse: -12, level: 0.6 }],
    filter: { cutoff: 600, reso: 0.55, drive: 0.5, keytrack: 0.2 }, lfo1: { shape: "sine", rate: 3.5 },
    mods: [{ src: "lfo1", dst: "cutoff", amount: 0.55 }], amp: { a: 0.005, d: 0.3, s: 0.9, r: 0.15 }, fx: { drive: 0.3 }, gain: 0.7,
  }),
};
export const PRESET_IDS = Object.keys(PRESETS);
export const presetPatch = (id) => cleanPatch(PRESETS[id] || PRESETS.ether);
