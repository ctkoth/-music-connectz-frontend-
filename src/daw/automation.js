// Automation: a track's volume and pan drawn over time, shared by every DawZ workflow.
//
// A lane is a list of points { t (seconds), v (dB for volume, −1…+1 for pan) } and an on/off
// ("read"). While a lane is on and has points it IS the fader (or the pan knob): the static value
// is used only when the lane is off or empty. That is how Pro Tools, Logic and Reaper read it.
//
// The engine schedules a lane as straight-line ramps on the Web Audio param (`schedule`), and the
// screen draws it with `valueAt`. Both interpolate the same way — volume in linear GAIN, because
// that is what `linearRampToValueAtTime` does on a GainNode; pan linearly — so the line the member
// sees is the level they hear, and the bounce (an OfflineAudioContext given the same calls) holds it.
import { dbToGain } from "./plugins.js";

export const PARAMS = {
  volume: { label: "Volume", min: -60, max: 12, unit: "dB", rest: 0 },
  pan: { label: "Pan", min: -1, max: 1, unit: "", rest: 0 },
};
export const MAX_POINTS = 2000;          // per lane: about 30 points a second for a minute of writing
export const SAME_SPOT = 0.01;           // a point closer than 10 ms to another replaces it
export const WRITE_SPACING = 0.03;       // a fader written while playing keeps a point every 30 ms at most
export const WRITE_TOLERANCE = { volume: 0.25, pan: 0.01 };   // and drops ones the line already passes through

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const gainToDb = (g) => (g <= 1e-3 ? -60 : clamp(20 * Math.log10(g), -60, 12));
const clampV = (param, v) => clamp(num(v, PARAMS[param].rest), PARAMS[param].min, PARAMS[param].max);

/** A lane as stored: on/off and its points sorted by time, junk dropped. */
export function cleanLane(param, raw) {
  const pts = (Array.isArray(raw?.points) ? raw.points : [])
    .map((p) => ({ t: Math.max(0, num(p?.t, NaN)), v: clampV(param, p?.v) }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t)
    .slice(0, MAX_POINTS);
  return { on: raw?.on !== false, points: pts };
}

/** A track's automation, both lanes, repaired. Missing lanes are simply absent. */
export function cleanAuto(raw) {
  const out = {};
  for (const p of Object.keys(PARAMS)) if (raw && raw[p]) out[p] = cleanLane(p, raw[p]);
  return out;
}

export const laneOf = (track, param) => track?.auto?.[param] || { on: true, points: [] };
/** Is this lane what the param follows right now? */
export const reads = (track, param) => !!(track?.auto?.[param]?.on && track.auto[param].points.length);
/** How many lanes in the session hold any points — what the tier counts. */
export const laneCount = (session) => session.tracks.reduce((n, t) => n + Object.keys(PARAMS).filter((p) => t.auto?.[p]?.points?.length).length, 0);

const toRaw = (param, v) => (param === "volume" ? dbToGain(v) : v);
const fromRaw = (param, x) => (param === "volume" ? gainToDb(x) : x);

/** The lane's value at time `time`: the first point's before it, the last point's after it, a straight line between (in gain for volume). */
export function valueAt(param, points, time, fallback = PARAMS[param].rest) {
  if (!points || !points.length) return fallback;
  if (time <= points[0].t) return points[0].v;
  const last = points[points.length - 1];
  if (time >= last.t) return last.v;
  let lo = 0, hi = points.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].t <= time) lo = mid; else hi = mid; }
  const a = points[lo], b = points[hi];
  const f = b.t > a.t ? (time - a.t) / (b.t - a.t) : 1;
  return fromRaw(param, toRaw(param, a.v) + (toRaw(param, b.v) - toRaw(param, a.v)) * f);
}

/** Add a point (replacing one within SAME_SPOT of it). Returns the new lane. */
export function addPoint(param, lane, t, v) {
  const p = { t: Math.max(0, num(t, 0)), v: clampV(param, v) };
  const pts = lane.points.filter((x) => Math.abs(x.t - p.t) >= SAME_SPOT);
  if (pts.length >= MAX_POINTS) return lane;
  pts.push(p);
  pts.sort((a, b) => a.t - b.t);
  return { ...lane, points: pts };
}

/** Move point i, kept between its neighbours so the lane never reorders under a drag. */
export function movePoint(param, lane, i, t, v) {
  if (i < 0 || i >= lane.points.length) return lane;
  const lo = i > 0 ? lane.points[i - 1].t + SAME_SPOT : 0;
  const hi = i < lane.points.length - 1 ? lane.points[i + 1].t - SAME_SPOT : Infinity;
  const pts = lane.points.slice();
  pts[i] = { t: clamp(num(t, pts[i].t), lo, Math.max(lo, hi)), v: clampV(param, v) };
  return { ...lane, points: pts };
}

export const removePoint = (lane, i) => ({ ...lane, points: lane.points.filter((_, k) => k !== i) });

/** Drop points the line already passes through (within `tol`), and any closer than `spacing` to the one kept before. */
export function thin(param, points, tol = WRITE_TOLERANCE[param], spacing = WRITE_SPACING) {
  if (points.length <= 2) return points.slice();
  const spaced = [points[0]];
  for (let i = 1; i < points.length - 1; i++) if (points[i].t - spaced[spaced.length - 1].t >= spacing) spaced.push(points[i]);
  spaced.push(points[points.length - 1]);
  const out = [spaced[0]];
  for (let i = 1; i < spaced.length - 1; i++) {
    const a = out[out.length - 1], b = spaced[i + 1];
    if (Math.abs(valueAt(param, [a, b], spaced[i].t) - spaced[i].v) > tol) out.push(spaced[i]);
  }
  out.push(spaced[spaced.length - 1]);
  return out;
}

/**
 * Write what the member did with the fader while it played (latch): everything the lane had
 * between the first and last written moments is replaced by what was written, thinned. A point
 * at each edge keeps the lane's own values either side of the pass.
 */
export function writePass(param, lane, written) {
  if (!written || written.length < 1) return lane;
  const w = written.map((p) => ({ t: Math.max(0, p.t), v: clampV(param, p.v) })).sort((a, b) => a.t - b.t);
  const from = w[0].t, to = w[w.length - 1].t;
  const kept = lane.points.filter((p) => p.t < from - SAME_SPOT || p.t > to + SAME_SPOT);
  const pts = [...kept, ...thin(param, w)].sort((a, b) => a.t - b.t).slice(0, MAX_POINTS);
  return { on: true, points: pts };
}

/**
 * Put a lane on a Web Audio param for playback starting at timeline second `from`, which the
 * context plays at its time `t0`. `scale` multiplies the raw value (0 for a muted track).
 */
export function schedule(audioParam, param, lane, from, t0, scale = 1) {
  const pts = lane.points;
  audioParam.cancelScheduledValues(0);
  audioParam.setValueAtTime(toRaw(param, valueAt(param, pts, from)) * scale, t0);
  for (const p of pts) {
    if (p.t <= from) continue;
    audioParam.linearRampToValueAtTime(toRaw(param, p.v) * scale, t0 + (p.t - from));
  }
}

/** What the tier allows: lanes with points, the shared Free 3 / Premium 6 / StatZ unlimited count. */
export function laneRoom(session, track, param, cap) {
  if (cap === undefined || cap === null) return { ok: true };
  if (track?.auto?.[param]?.points?.length) return { ok: true };   // drawing on a lane you already have
  return { ok: laneCount(session) < cap };
}
