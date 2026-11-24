// A MIDI part's own level and position: gain as a percentage (100% is unity, 200% is +6 dB, 0% is silent) and pan from -100 (all
// left) to +100 (all right). Shown on the piano roll, heard in the MIDI window, and carried to the new track's fader and pan when the
// part is sent. Pure and tested.
export const GAIN_PCT_MAX = 200;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const cleanGainPct = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? clamp(Math.round(Number(v)), 0, GAIN_PCT_MAX) : 100);
export const cleanPanPct = (v) => (Number.isFinite(Number(v)) && v !== "" && v !== null ? clamp(Math.round(Number(v)), -100, 100) : 0);
/** The fader's dB for a percentage: 100% -> 0 dB, 50% -> -6 dB, 200% -> +6 dB. Silent (0%) is the fader's floor. */
export const gainPctToDb = (pct, floor = -60) => { const p = cleanGainPct(pct); return p <= 0 ? floor : Math.max(floor, Math.round(20 * Math.log10(p / 100) * 10) / 10); };
export const gainPctToLinear = (pct) => cleanGainPct(pct) / 100;
/** Pan as the StereoPanner takes it, -1..1. */
export const panToUnit = (pct) => cleanPanPct(pct) / 100;
export const panLabel = (pct) => { const p = cleanPanPct(pct); return p === 0 ? "Center" : p < 0 ? `L ${-p}%` : `R ${p}%`; };
export const gainLabel = (pct) => { const p = cleanGainPct(pct); return p === 0 ? "Silent" : `${p}% (${gainPctToDb(p) > 0 ? "+" : ""}${gainPctToDb(p)} dB)`; };
