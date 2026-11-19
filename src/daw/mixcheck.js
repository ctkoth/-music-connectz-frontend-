// Mix check: headroom, frequency clashes and ducking, worked out from measurements. Pure: runs in node.
// Everything here is arithmetic on audio the member's own device measured; nothing is a model's opinion.
import { GAIN_DB } from "./session.js";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;

// ---- Headroom: the mix's loudest sample, set to land at TARGET before mastering ----
export const HEADROOM_TARGET = -6;    // dBFS: room the master needs to work with
export function peakDb(channels) {
  let p = 0;
  for (const c of channels) for (let i = 0; i < c.length; i++) { const a = Math.abs(c[i]); if (a > p) p = a; }
  return p > 0 ? 20 * Math.log10(p) : -Infinity;
}
/** How far every fader moves (same amount for all, so the balance is kept), or 0 when it's already close. */
export function headroomMove(peak, target = HEADROOM_TARGET) {
  if (!Number.isFinite(peak)) return 0;
  const d = r1(target - peak);
  return Math.abs(d) < 0.5 ? 0 : d;
}
export const shiftFader = (gain, d) => clamp(r1((gain || 0) + d), GAIN_DB.min, GAIN_DB.max);

// ---- Clashes: two parts loud in the same band. The less central part gives way ----
export const PRIORITY = ["lead", "beat", "drums", "bass", "instrument", "backing", "other"];
export const CLASH_ZONE = [150, 5000];   // where masking is heard most; the sub and the air are left alone
export const CUT_DB = -3, CUT_Q = 1.4;
/** tracks: [{id, name, role, bands: [{f, db}]}] → [{id, name, f, gain, q, against, why}], at most one cut per track. */
export function clashes(tracks) {
  const rank = (r) => { const i = PRIORITY.indexOf(r); return i < 0 ? PRIORITY.length : i; };
  const rel = tracks.map((t) => {
    const live = (t.bands || []).filter((b) => b.db != null);
    const top = Math.max(...live.map((b) => b.db));
    return new Map(live.filter((b) => b.f >= CLASH_ZONE[0] && b.f <= CLASH_ZONE[1]).map((b) => [b.f, { rel: b.db - top, db: b.db }]));
  });
  const cuts = new Map();
  for (let a = 0; a < tracks.length; a++) for (let b = a + 1; b < tracks.length; b++) {
    for (const [f, x] of rel[a]) {
      const y = rel[b].get(f);
      if (!y || x.rel < -6 || y.rel < -6 || Math.abs(x.db - y.db) > 10) continue;
      const [keep, give] = rank(tracks[a].role) <= rank(tracks[b].role) ? [a, b] : [b, a];
      const score = Math.min(x.rel, y.rel);
      const prev = cuts.get(tracks[give].id);
      if (!prev || score > prev.score) cuts.set(tracks[give].id, { id: tracks[give].id, name: tracks[give].name, f, gain: CUT_DB, q: CUT_Q, score, against: tracks[keep].name,
        why: `${tracks[give].name} and ${tracks[keep].name} are both strong around ${f >= 1000 ? `${r1(f / 1000)} kHz` : `${Math.round(f)} Hz`}; a ${Math.abs(CUT_DB)} dB dip there on ${tracks[give].name} lets ${tracks[keep].name} through.` });
    }
  }
  return [...cuts.values()].map(({ score, ...c }) => c);
}

// ---- Ducking: a part turned down while the lead is there ----
export const DUCK_DB = -4, DUCK_BLOCK = 0.05, DUCK_GATE = -12, DUCK_RELEASE = 0.25;
/** The lead's loudness per DUCK_BLOCK seconds, in dB below its own loudest block. */
export function envelope(channels, rate) {
  const step = Math.max(1, Math.round(rate * DUCK_BLOCK));
  const n = Math.floor(channels[0].length / step), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (const c of channels) for (let k = 0; k < step; k++) { const v = c[i * step + k] || 0; s += v * v; }
    out[i] = s / (step * channels.length);
  }
  const top = Math.max(...out, 1e-12);
  return Array.from(out, (p) => (p > 0 ? 10 * Math.log10(p / top) : -120));
}
/** Volume-automation points for the ducked track: its fader `base`, and base+depth while the lead is present.
 *  The duck holds for DUCK_RELEASE after the lead stops, so it does not pump between words. */
export function duckPoints(env, base, depth = DUCK_DB) {
  const on = env.map((d) => d > DUCK_GATE);
  const hold = Math.round(DUCK_RELEASE / DUCK_BLOCK);
  const held = on.map((_, i) => on.slice(Math.max(0, i - hold), i + 1).some(Boolean));
  const pts = [];
  let last = null;
  held.forEach((h, i) => {
    const v = r1(clamp(base + (h ? depth : 0), GAIN_DB.min, GAIN_DB.max));
    if (v !== last) {
      if (last !== null) pts.push({ t: Math.round((i * DUCK_BLOCK - 0.02) * 1000) / 1000, v: last });   // hold, then a 20 ms ramp
      pts.push({ t: Math.round(i * DUCK_BLOCK * 1000) / 1000, v });
      last = v;
    }
  });
  return pts.filter((p) => p.t >= 0);
}
