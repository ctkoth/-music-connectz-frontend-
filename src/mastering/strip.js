// A channel strip for one TrackZ track: a high-pass, an EQ of N bands and a compressor, run BEFORE
// the track's gain and pan. Pure functions over Float32Arrays, so the worker, the tests and the live
// preview all run the same code: the preview plays a buffer this file made, not a Web Audio stand-in
// with its own idea of a compressor, so what is set by ear is exactly what is mixed and mastered.
//
// Free at every tier — it runs on the member's device and costs the platform nothing. The tier says how
// many tracks and how many EQ BANDS (tracks Free 3 / Premium 6 / StatZ unlimited; bands Free 3 / Premium 6 / StatZ 12, the band count applied
// where a band is added — src/eqbands.js); it never says whether a track may have an EQ. The low cut is
// a filter, not a band, and is not counted.
import { dbToGain, highPass, lowShelf, highShelf, peaking, biquadInPlace, responseDb } from "./dsp.js";
import { bandOn, bandWords, cleanBands, defaultBands } from "../eqbands.js";

export const EQ_MIN = -12;
export const EQ_MAX = 12;
export const HP = { off: 0, min: 20, max: 400 };
export const COMP = {
  threshold: { min: -60, max: 0 },
  ratio: { min: 1, max: 10 },
  makeup: { min: 0, max: 12 },
  kneeDb: 6,
};
// Attack and release by name, because a millisecond figure says little to most members.
export const SPEEDS = {
  fast: { label: "Fast", attackMs: 3, releaseMs: 80, why: "grabs every hit — tames peaks, flattens punch" },
  medium: { label: "Medium", attackMs: 15, releaseMs: 150, why: "evens the level and keeps most of the attack" },
  slow: { label: "Slow", attackMs: 40, releaseMs: 300, why: "lets the start of each note through, then holds the sustain" },
};

export const FLAT = Object.freeze({ hp: 0, bands: Object.freeze(defaultBands()),
  comp: Object.freeze({ on: false, thresholdDb: -18, ratio: 3, speed: "medium", makeupDb: 0 }) });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const r1 = (v) => Math.round(v * 10) / 10;
const sdb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(r1(v))} dB`;
const hz = (f) => (f >= 1000 ? `${r1(f / 1000)} kHz` : `${Math.round(f)} Hz`);

// A strip saved before bands existed had a fixed low shelf (100 Hz), one bell and a high shelf (8 kHz).
const legacyBands = (s) => [
  { type: "lowshelf", f: 100, gain: num(s.low, 0), q: 1 },
  { type: "peaking", f: num(s.midHz, 1000), gain: num(s.mid, 0), q: 1 },
  { type: "highshelf", f: 8000, gain: num(s.high, 0), q: 1 },
];

/** A strip as stored: every number inside its range, junk replaced by flat. */
export function cleanStrip(raw) {
  const s = raw || {};
  const c = s.comp || {};
  const hpv = num(s.hp, 0);
  return {
    hp: hpv < HP.min ? 0 : clamp(Math.round(hpv), HP.min, HP.max),
    bands: cleanBands(Array.isArray(s.bands) ? s.bands : legacyBands(s), { gain: EQ_MAX }),
    comp: {
      on: !!c.on,
      thresholdDb: clamp(num(c.thresholdDb, FLAT.comp.thresholdDb), COMP.threshold.min, COMP.threshold.max),
      ratio: clamp(num(c.ratio, FLAT.comp.ratio), COMP.ratio.min, COMP.ratio.max),
      speed: SPEEDS[c.speed] ? c.speed : FLAT.comp.speed,
      makeupDb: clamp(num(c.makeupDb, 0), COMP.makeup.min, COMP.makeup.max),
    },
  };
}

const eqOn = (s) => s.hp > 0 || s.bands.some(bandOn);
const compOn = (s) => s.comp.on && (s.comp.ratio > 1.001 || s.comp.makeupDb > 0.01);
/** True when the strip changes nothing, so the track is used exactly as loaded. */
export const stripIsFlat = (raw) => { const s = cleanStrip(raw); return !eqOn(s) && !compOn(s); };

/** The EQ as biquads, in the order they run: the low cut (12 dB/oct), then every band that moves anything. */
export function eqCascade(raw, fs) {
  const s = cleanStrip(raw);
  const out = [];
  if (s.hp > 0) out.push(highPass(fs, s.hp));
  for (const b of s.bands) {
    if (!bandOn(b)) continue;
    const f = Math.min(b.f, fs * 0.45);
    out.push(b.type === "lowshelf" ? lowShelf(fs, f, b.gain, 1) : b.type === "highshelf" ? highShelf(fs, f, b.gain, 1) : peaking(fs, f, b.gain, b.q));
  }
  return out;
}

/** What the EQ does at frequency f, in dB — for tests and for a curve on screen. */
export const eqAt = (raw, fs, f) => responseDb(eqCascade(raw, fs), fs, f);

/**
 * Run the strip on copies of the channels. Returns { channels, maxGrDb, avgGrDb }.
 * The compressor is stereo-linked (both sides move together, so the image does not wobble),
 * with a peak-power detector and a soft knee.
 */
export function applyStrip(channels, fs, raw) {
  const s = cleanStrip(raw);
  const ch = channels.map((c) => Float32Array.from(c));
  for (const co of eqCascade(s, fs)) for (const x of ch) biquadInPlace(x, co);
  let maxGrDb = 0, avgGrDb = 0;
  if (compOn(s)) {
    const sp = SPEEDS[s.comp.speed];
    const aA = Math.exp(-1 / ((sp.attackMs / 1000) * fs));
    const aR = Math.exp(-1 / ((sp.releaseMs / 1000) * fs));
    const T = s.comp.thresholdDb, knee = COMP.kneeDb, slope = 1 / s.comp.ratio - 1;
    const makeup = dbToGain(s.comp.makeupDb);
    const n = ch[0].length;
    let env = 0, sum = 0, count = 0;
    for (let i = 0; i < n; i++) {
      let p = 0;
      for (const x of ch) { const v = x[i] * x[i]; if (v > p) p = v; }
      env = p > env ? aA * env + (1 - aA) * p : aR * env + (1 - aR) * p;
      const over = 10 * Math.log10(env + 1e-12) - T;
      let gdb;
      if (2 * over < -knee) gdb = 0;
      else if (2 * Math.abs(over) <= knee) gdb = (slope * (over + knee / 2) ** 2) / (2 * knee);
      else gdb = slope * over;
      if (gdb < -0.1) { sum -= gdb; count++; if (-gdb > maxGrDb) maxGrDb = -gdb; }
      const g = dbToGain(gdb) * makeup;
      for (const x of ch) x[i] *= g;
    }
    avgGrDb = count ? sum / count : 0;
  }
  return { channels: ch, maxGrDb: r1(maxGrDb), avgGrDb: r1(avgGrDb) };
}

/** The strip in words, for the track's line in the result. Empty when it is flat. */
export function stripWords(raw, res = null) {
  const s = cleanStrip(raw);
  const parts = [];
  if (s.hp > 0) parts.push(`high-pass at ${hz(s.hp)}`);
  for (const b of s.bands) if (bandOn(b)) parts.push(bandWords(b));
  if (compOn(s)) {
    const took = res && res.maxGrDb > 0 ? `, took off up to ${r1(res.maxGrDb)} dB (${r1(res.avgGrDb)} dB on average)` : res ? ", never reached the threshold" : "";
    parts.push(`compressed ${r1(s.comp.ratio)}:1 over ${s.comp.thresholdDb < 0 ? "−" : ""}${Math.abs(r1(s.comp.thresholdDb))} dB, ${SPEEDS[s.comp.speed].label.toLowerCase()}${s.comp.makeupDb > 0 ? `, ${sdb(s.comp.makeupDb)} make-up` : ""}${took}`);
  }
  return parts.join(", ");
}

/** A key that changes exactly when the sound would. */
export const stripKey = (raw) => (stripIsFlat(raw) ? "" : JSON.stringify(cleanStrip(raw)));

// Where a part usually wants its low end cut, by TrackZ role, with the reason. Bass, drums and a
// finished beat keep theirs: that is where their weight lives. A starting point, said as one.
export const HP_BY_ROLE = {
  lead: { hz: 90, why: "a voice has nothing under ~90 Hz but rumble and mic handling, and it muddies the bass" },
  backing: { hz: 150, why: "backing vocals cut higher than the lead so the low end belongs to the bass and the lead" },
  instrument: { hz: 100, why: "keys and guitars sit above the bass; cutting their lows keeps the bass clear" },
  other: { hz: 80, why: "a gentle cut below 80 Hz clears rumble without thinning the part" },
};
