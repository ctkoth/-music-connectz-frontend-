// The one EQ band model: TrackZ's channel strip (src/mastering/strip.js) and every DAW's EQ effect
// (src/daw/plugins.js) both hold a list of these, so the two EQs gain and lose bands the same way.
//
// How many bands an EQ may have is the tier's (`eq_bands` from /limits/: Free 3, Premium 6, StatZ
// unlimited — Corey's numbers). The count is applied where a band is ADDED, never by cutting a list:
// an EQ already over the count keeps playing every band, the same rule as tracks and presets.
// MAX_BANDS is the engine's own bound, which is what "unlimited" runs to.
//
// Pure: no DOM, no Web Audio, so it is tested under plain node.

export const BAND_TYPES = {
  lowshelf: { label: "Low shelf", short: "lows" },
  peaking: { label: "Bell", short: "bell" },
  highshelf: { label: "High shelf", short: "highs" },
};
export const MAX_BANDS = 32;
export const F = { min: 20, max: 20000 };
export const Q = { min: 0.3, max: 8 };

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** A whole EQ in three bands: shelve the lows and highs, one bell in the middle. Every plan's starting point. */
export const defaultBands = () => [
  { type: "lowshelf", f: 100, gain: 0, q: 1 },
  { type: "peaking", f: 1000, gain: 0, q: 1 },
  { type: "highshelf", f: 8000, gain: 0, q: 1 },
];

/** Bands as stored: known types, numbers in range, at most MAX_BANDS. `gain` is the ± range in dB. */
export function cleanBands(raw, { gain = 18 } = {}) {
  return (Array.isArray(raw) ? raw : [])
    .filter((b) => b && BAND_TYPES[b.type] && Number.isFinite(Number(b.f)))
    .slice(0, MAX_BANDS)
    .map((b) => ({ type: b.type, f: clamp(Math.round(Number(b.f)), F.min, F.max), gain: clamp(num(b.gain, 0), -gain, gain), q: clamp(num(b.q, 1), Q.min, Q.max) }));
}

/** True when a band changes the sound. */
export const bandOn = (b) => Math.abs(b.gain) > 0.01;

/** The tier's band count from /limits/: a number, null for unlimited, undefined while unknown. */
export const bandCap = (lim) => (lim && "eq_bands" in lim ? lim.eq_bands : undefined);
/** What the next plan holds, for the line under a locked "Add a band". */
export const nextBandCap = (lim) => (lim?.tier === "free" ? lim?.tiers?.premium?.eq_bands ?? 6 : null);

/** Whether a band can be added, and how many are left. Unknown or unlimited blocks nothing. */
export function bandRoom(count, cap) {
  if (cap === undefined || cap === null) return { ok: count < MAX_BANDS, left: null };
  return { ok: count < Math.min(cap, MAX_BANDS), left: Math.max(0, Math.min(cap, MAX_BANDS) - count) };
}

/** A new bell, placed in the middle of the widest empty stretch of the spectrum (in octaves). */
export function newBand(bands) {
  const fs = [F.min, ...bands.map((b) => b.f), F.max].map((f) => Math.log2(f)).sort((a, b) => a - b);
  let best = 0;
  for (let i = 1; i < fs.length - 1; i++) if (fs[i + 1] - fs[i] > fs[best + 1] - fs[best]) best = i;
  return { type: "peaking", f: Math.round(2 ** ((fs[best] + fs[best + 1]) / 2)), gain: 0, q: 1 };
}

export const fmtHz = (f) => (f >= 1000 ? `${Math.round(f / 100) / 10} kHz` : `${Math.round(f)} Hz`);
const sdb = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)} dB`;
/** One band in words: "lows +2 dB at 100 Hz", "−6 dB at 1.3 kHz". */
export const bandWords = (b) => (b.type === "peaking" ? `${sdb(b.gain)} at ${fmtHz(b.f)}` : `${BAND_TYPES[b.type].short} ${sdb(b.gain)} at ${fmtHz(b.f)}`);
