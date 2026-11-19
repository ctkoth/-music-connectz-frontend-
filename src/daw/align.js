// Timing: line a track up against a reference, and catch one whose polarity is flipped. Pure: runs in node.
//
// Measured, never guessed. Both tracks are folded to mono and taken down to RATE, and the lag where they agree
// most (normalised cross-correlation) is the offset. That only means something when the track is PART of the
// reference — a stem against the full song, two mics on one source — so a weak match is reported as "no clear
// match" and left alone, never moved on a guess. A strong match that is NEGATIVE is the same sound upside down
// (polarity), which cancels when summed; that is said and offered as a flip.
import { lenOf, removeRegion, updateRegion, playlistOf } from "./session.js";

export const RATE = 1000;           // Hz the comparison runs at: 1 ms steps, cheap enough for the main thread
export const MAX_LAG = 0.5;         // seconds either way it looks
export const WINDOW = 20;           // seconds of each track it compares
export const MIN_MATCH = 0.3;       // |correlation| below this is "no clear match"
export const MIN_MOVE = 0.002;      // a shift under 2 ms is not worth moving

/** Mono, block-averaged down to RATE, first WINDOW seconds. Averaging (not |abs|) keeps the sign for polarity. */
export function reduce(channels, rate, offset = 0) {
  const step = Math.max(1, Math.round(rate / RATE));
  const start = Math.max(0, Math.round(offset * rate));
  const n = Math.min(Math.floor((channels[0].length - start) / step), WINDOW * RATE);
  const out = new Float32Array(Math.max(0, n));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < step; k++) for (const c of channels) s += c[start + i * step + k] || 0;
    out[i] = s / (step * channels.length);
  }
  return out;
}

/** {lag (seconds the track is LATE by), corr (-1..1)} — the strongest |correlation| within ±MAX_LAG. */
export function bestLag(ref, x) {
  const max = Math.round(MAX_LAG * RATE);
  let best = { k: 0, c: 0 };
  for (let k = -max; k <= max; k++) {
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < ref.length; i++) {
      const j = i + k;
      if (j < 0 || j >= x.length) continue;
      sxy += ref[i] * x[j]; sxx += ref[i] * ref[i]; syy += x[j] * x[j];
    }
    const c = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    if (Math.abs(c) > Math.abs(best.c)) best = { k, c };
  }
  return { lag: best.k / RATE, corr: Math.round(best.c * 100) / 100 };
}

/** What to do with one track, in words, from a measurement. */
export function verdict({ lag, corr }) {
  if (Math.abs(corr) < MIN_MATCH) return { move: 0, flip: false, why: "No clear match with the reference, so it's left alone (it may simply be a different part)." };
  const move = Math.abs(lag) >= MIN_MOVE ? -lag : 0;
  const flip = corr < 0;
  const parts = [];
  if (move) parts.push(`${Math.abs(lag * 1000).toFixed(0)} ms ${lag > 0 ? "late" : "early"} — moves ${move < 0 ? "earlier" : "later"} to line up`);
  if (flip) parts.push("polarity is flipped against the reference, so the two cancel when summed — flip it");
  return { move, flip, why: parts.length ? `${parts.join("; ")}.` : "Already in time with the reference." };
}

/** Shift every region on a track's active playlist by `shift` seconds. A region pushed before 0:00 starts later
 *  in its own audio instead, so the alignment holds; one shifted wholly before 0:00 is removed. */
export function shiftTrack(s, trackId, shift) {
  const t = s.tracks.find((x) => x.id === trackId);
  if (!t || !shift) return s;
  let out = s;
  for (const r of playlistOf(t).regions) {
    const at = r.at + shift;
    if (at >= 0) { out = updateRegion(out, r.id, { at }); continue; }
    const cut = -at;
    if (cut >= lenOf(r)) { out = removeRegion(out, r.id); continue; }
    out = updateRegion(out, r.id, { at: 0, in: r.in + cut });
  }
  return out;
}
