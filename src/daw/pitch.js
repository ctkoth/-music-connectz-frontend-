// Stem transposition: move a recording up or down in pitch while keeping its length (and so its
// tempo). Pure — Float32Arrays in, Float32Arrays out — so it is tested under node.
//
// Two steps, the standard way: WSOLA time-stretches the audio by the pitch ratio (longer for up,
// shorter for down) without changing its pitch, choosing each grain where it best lines up with the
// last so the waveform does not jump; then resampling by the same ratio brings the length back and
// moves the pitch. Good on voices and single instruments; dense full mixes smear a little, as they do
// in every stretch of this kind.
import { resampleChannel } from "../mastering/resample.js";

export const ratioFor = (semis) => 2 ** (semis / 12);

/** The semitone range a tier may move a stem: Corey's numbers, 3 / 6 / 12 (null = StatZ's full octave). */
export const rangeFor = (count) => (count == null ? 12 : Math.max(1, Math.min(12, count)));

/** WSOLA: stretch `x` to `stretch` times its length, keeping the pitch. */
export function wsola(x, stretch, rate) {
  const n = x.length;
  if (n < 32 || Math.abs(stretch - 1) < 1e-6) return Float32Array.from(x);
  const win = Math.max(256, Math.round(rate * 0.046)) & ~1;   // ~46 ms grains
  const hop = win / 2;
  const tol = Math.round(rate * 0.012);                        // search ±12 ms for the best fit
  const outLen = Math.round(n * stretch);
  const out = new Float32Array(outLen + win);
  const norm = new Float32Array(outLen + win);
  const w = new Float32Array(win);
  for (let i = 0; i < win; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win);
  let prevIn = 0;                 // where the last grain was read from
  for (let outPos = 0, k = 0; outPos < outLen; outPos += hop, k++) {
    const nominal = Math.round(outPos / stretch);
    let best = nominal;
    if (k > 0) {
      // The natural continuation of the last grain is prevIn + hop; find the read point near
      // `nominal` whose start looks most like it (cross-correlation over a short span).
      const target = prevIn + hop, span = Math.min(hop, 512);
      let bestScore = -Infinity;
      for (let d = -tol; d <= tol; d += 2) {
        const c = nominal + d;
        if (c < 0 || c + span >= n || target + span >= n) continue;
        let score = 0;
        for (let j = 0; j < span; j += 4) score += x[c + j] * x[target + j];
        if (score > bestScore) { bestScore = score; best = c; }
      }
    }
    best = Math.max(0, Math.min(n - 1, best));
    for (let i = 0; i < win && best + i < n; i++) { out[outPos + i] += x[best + i] * w[i]; norm[outPos + i] += w[i]; }
    prevIn = best;
  }
  const y = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) y[i] = norm[i] > 1e-6 ? out[i] / norm[i] : 0;
  return y;
}

/** Shift one channel by `semis` semitones, same length. */
export function shiftChannel(x, rate, semis) {
  if (!semis) return Float32Array.from(x);
  const r = ratioFor(semis);
  const stretched = wsola(x, r, rate);
  // Playing the stretched audio r times faster restores the length and multiplies the pitch by r.
  const back = resampleChannel(stretched, rate * r, rate);
  const y = new Float32Array(x.length);
  y.set(back.subarray(0, Math.min(back.length, x.length)));
  return y;
}

/** Shift every channel of a recording. */
export const pitchShift = (channels, rate, semis) => channels.map((c) => shiftChannel(c, rate, semis));
