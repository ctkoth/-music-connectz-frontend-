// The Smart Drummer — FormulaWon's way to a beat without programming one.
//
// The member picks a style and moves two dials: how BUSY the drummer plays and
// how HARD. This turns that into rack patterns (rack.js), so the same synth and
// the same Playlist take it from there. It is deterministic on purpose: the same
// settings always give the same groove, so "Send to Tracks" sends what was heard.
//
// Each style is layers per drum, simplest first. Busy decides how many layers of
// each drum play; hard sets the volumes and brings the open hat and ghost notes in.
import { STEPS, newChannel } from "./rack.js";

const at = (...idx) => idx;

// For each drum: [steps always played, steps added when busier, steps added when busiest].
export const STYLES = {
  pop: {
    label: "Pop", swing: 0,
    kick: [at(0, 8), at(10), at(7)],
    snare: [at(4, 12), at(), at(15)],
    hat: [at(0, 4, 8, 12), at(2, 6, 10, 14), at(1, 3, 5, 7, 9, 11, 13, 15)],
    openhat: [at(), at(14), at(6)],
    fill: { snare: at(8, 10, 12, 13, 14, 15), kick: at(0, 4) },
  },
  rock: {
    label: "Rock", swing: 0,
    kick: [at(0, 8), at(6, 10), at(14)],
    snare: [at(4, 12), at(), at(7, 9)],
    hat: [at(0, 4, 8, 12), at(2, 6, 10, 14), at()],
    openhat: [at(), at(), at(14)],
    fill: { snare: at(4, 6, 8, 10, 12, 13, 14, 15), kick: at(0) },
  },
  hiphop: {
    label: "Hip-hop", swing: 0.25,
    kick: [at(0, 10), at(7), at(3, 13)],
    snare: [at(4, 12), at(), at(15)],
    hat: [at(0, 4, 8, 12), at(2, 6, 10, 14), at(11, 15)],
    openhat: [at(), at(6), at()],
    fill: { snare: at(10, 12, 14, 15), kick: at(0, 3, 8) },
  },
  trap: {
    label: "Trap", swing: 0,
    kick: [at(0, 10), at(6), at(13)],
    snare: [at(8), at(), at(15)],
    clap: [at(8), at(), at()],
    hat: [at(0, 2, 4, 6, 8, 10, 12, 14), at(1, 3, 11), at(5, 7, 9, 13, 15)],
    openhat: [at(), at(4), at()],
    fill: { snare: at(8, 12, 13, 14, 15), hat: at(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15), kick: at(0, 6) },
  },
  house: {
    label: "House", swing: 0,
    kick: [at(0, 4, 8, 12), at(), at(15)],
    clap: [at(4, 12), at(), at()],
    hat: [at(2, 6, 10, 14), at(), at(1, 5, 9, 13)],
    openhat: [at(), at(2, 6, 10, 14), at()],
    fill: { snare: at(8, 10, 12, 13, 14, 15), kick: at(0, 4) },
  },
  rnb: {
    label: "R&B", swing: 0.3,
    kick: [at(0, 9), at(6), at(14)],
    snare: [at(4, 12), at(), at(7)],
    hat: [at(0, 4, 8, 12), at(2, 6, 10, 14), at(3, 11)],
    openhat: [at(), at(), at(14)],
    fill: { snare: at(11, 12, 14, 15), kick: at(0, 9) },
  },
};

const DRUMS = ["kick", "snare", "clap", "hat", "openhat"];
const clamp01 = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5; };

/** How many layers of a drum play at this busyness: 1, 2 or 3. */
export const layersFor = (busy) => (clamp01(busy) < 0.34 ? 1 : clamp01(busy) < 0.67 ? 2 : 3);

function steps(idx) {
  return Array.from({ length: STEPS }, (_, i) => idx.includes(i));
}

/** One bar of the groove as a rack pattern. */
export function groove(styleKey, { busy = 0.5, hard = 0.5 } = {}) {
  const style = STYLES[styleKey] || STYLES.pop;
  const n = layersFor(busy);
  const h = clamp01(hard);
  const vol = { kick: 0.6 + 0.4 * h, snare: 0.5 + 0.45 * h, clap: 0.45 + 0.4 * h, hat: 0.3 + 0.4 * h, openhat: 0.3 + 0.35 * h };
  const channels = [];
  for (const d of DRUMS) {
    if (!style[d]) continue;
    const idx = style[d].slice(0, n).flat();
    if (!idx.length) continue;
    channels.push({ ...newChannel(d, steps(idx)), vol: Math.round(vol[d] * 100) / 100 });
  }
  return { name: `${style.label} groove`, channels };
}

/** The bar that ends a phrase: the groove's first half, then the style's fill. */
export function fillBar(styleKey, opts = {}) {
  const style = STYLES[styleKey] || STYLES.pop;
  const base = groove(styleKey, opts);
  const channels = base.channels.map((c) => ({ ...c, steps: c.steps.map((v, i) => (i < 8 ? v : false)) }));
  for (const [d, idx] of Object.entries(style.fill || {})) {
    const late = idx.filter((i) => i >= 8);
    const early = idx.filter((i) => i < 8);
    let ch = channels.find((c) => c.voice === d);
    if (!ch) { ch = { ...newChannel(d), vol: 0.8 }; channels.push(ch); }
    ch.steps = ch.steps.map((v, i) => (late.includes(i) ? true : i < 8 ? v || (d !== "snare" && early.includes(i)) : false));
  }
  return { name: `${style.label} fill`, channels };
}

/**
 * `bars` bars of drumming: the groove, with a fill closing every `fillEvery`
 * bars (0 for none). A list of one-bar patterns, ready for renderBars.
 */
export function drumPart(styleKey, { busy, hard, bars = 4, fillEvery = 4 } = {}) {
  const g = groove(styleKey, { busy, hard });
  const f = fillEvery ? fillBar(styleKey, { busy, hard }) : null;
  return Array.from({ length: Math.max(1, bars) }, (_, i) => (f && (i + 1) % fillEvery === 0 ? f : g));
}

export const styleSwing = (styleKey) => (STYLES[styleKey] || STYLES.pop).swing;
