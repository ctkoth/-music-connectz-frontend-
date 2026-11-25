// MixEZ: ear training for mix engineers. Everything here is arithmetic over a boost the app itself applied, so a score is
// a fact (you named the band that was lifted, or your curve sits N dB from the target) and never an opinion. Pure, tested.
export const BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const LEVELS = {
  easy: { label: "Easy", gain: 12, q: 1.2, bands: [125, 500, 2000, 8000] },
  medium: { label: "Medium", gain: 9, q: 1.4, bands: BANDS.slice(1, 8) },
  hard: { label: "Hard", gain: 6, q: 1.8, bands: BANDS },
};
export const SLIDERS = [100, 400, 1600, 6400, 12000];   // drill 2's controls
export const SLIDER_RANGE = 12;                         // dB either way
export const CLOSE_DB = 1.5;                            // "matched": average error under this

export const fmtHz = (f) => (f >= 1000 ? `${Math.round(f / 100) / 10} kHz` : `${Math.round(f)} Hz`);

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Drill 1: which band is boosted. Never the same band twice in a row when `prev` is given. */
export function findRound(seed, level = "easy", prev = null) {
  const L = LEVELS[level] || LEVELS.easy;
  const r = rng(seed);
  const pool = L.bands.filter((b) => b !== prev);
  const band = pool[Math.floor(r() * pool.length)];
  return { band, gain: L.gain, q: L.q, options: L.bands };
}
export const gradeFind = (round, picked) => ({ right: picked === round.band, answer: round.band });

/** Magnitude (dB) of an RBJ peaking biquad at `f`. This is the real filter the browser runs, written out. */
export function peakDb(f, f0, gainDb, q, fs = 48000) {
  const A = 10 ** (gainDb / 40), w0 = (2 * Math.PI * f0) / fs, al = Math.sin(w0) / (2 * q), c = Math.cos(w0);
  const b0 = 1 + al * A, b1 = -2 * c, b2 = 1 - al * A, a0 = 1 + al / A, a1 = -2 * c, a2 = 1 - al / A;
  const w = (2 * Math.PI * f) / fs, cw = Math.cos(w), sw = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * cw + b2 * c2, ni = -(b1 * sw + b2 * s2);
  const dr = a0 + a1 * cw + a2 * c2, di = -(a1 * sw + a2 * s2);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}
/** Total response (dB) of a chain of `gains` on SLIDERS, at f. */
export const curveDb = (gains, f, q = 1.0) => SLIDERS.reduce((s, f0, i) => s + peakDb(f, f0, gains[i] || 0, q), 0);

const GRID = Array.from({ length: 60 }, (_, i) => 30 * (16000 / 30) ** (i / 59));   // log-spaced 30 Hz..16 kHz

/** Drill 2: a hidden target curve. Two or three sliders moved, the rest flat, in whole dB. */
export function matchRound(seed, level = "easy") {
  const r = rng(seed);
  const moved = level === "hard" ? 4 : level === "medium" ? 3 : 2;
  const mag = level === "hard" ? [3, 9] : [4, 10];
  const idx = SLIDERS.map((_, i) => i).sort(() => r() - 0.5).slice(0, moved);
  const gains = SLIDERS.map((_, i) => (idx.includes(i) ? Math.round(mag[0] + r() * (mag[1] - mag[0])) * (r() < 0.5 ? -1 : 1) : 0));
  return { gains };
}
/** Average dB the member's curve is off the target's across the audible range (RMS). */
export function matchError(target, mine) {
  const e = GRID.reduce((s, f) => s + (curveDb(target, f) - curveDb(mine, f)) ** 2, 0);
  return Math.sqrt(e / GRID.length);
}
export const matchGrade = (err) => ({ err, close: err <= CLOSE_DB, words: err <= 0.5 ? "Spot on" : err <= CLOSE_DB ? "Matched" : err <= 3 ? "Close" : "Not yet" });

// Progress lives on the device; it is the member's practice log, not a rating of them.
export function addResult(log, drill, right, now = Date.now()) {
  const next = [...(Array.isArray(log) ? log : []), { drill, right: !!right, at: now }];
  return next.slice(-200);
}
export function summary(log, drill) {
  const rows = (Array.isArray(log) ? log : []).filter((x) => x.drill === drill);
  const n = rows.length, ok = rows.filter((x) => x.right).length;
  const last10 = rows.slice(-10), ok10 = last10.filter((x) => x.right).length;
  return { n, ok, pct: n ? Math.round((100 * ok) / n) : null, last10: last10.length, ok10 };
}

// Drill 3: balance. A hidden level of the chords against the drums; the member sets their own by ear. Score = dB apart.
export const BALANCE_RANGE = 12;                          // the fader goes this far either way
export const BALANCE_CLOSE_DB = 1;                        // within this is "matched"
export function balanceRound(seed, level = "easy") {
  const r = rng(seed);
  const [lo, hi] = level === "hard" ? [1, 4] : level === "medium" ? [3, 7] : [5, 10];
  const mag = Math.round(lo + r() * (hi - lo));
  return { db: r() < 0.5 ? -mag : mag };                  // + means the chords are louder than the drums
}
export function balanceGrade(target, mine) {
  const err = Math.abs(target - mine);
  return { err, close: err <= BALANCE_CLOSE_DB, words: err <= 0.5 ? "Spot on" : err <= BALANCE_CLOSE_DB ? "Matched" : err <= 3 ? "Close" : "Not yet", side: mine > target ? "too loud" : "too quiet" };
}
