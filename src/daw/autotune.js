// Autotune: pitch correction for one voice, rendered on the member's device (StatZ). Pure: Float32Arrays in and
// out, so it is tested under node.
//
// Three steps, the standard way for a single voice:
//   1. DETECT the pitch every HOP seconds (YIN, on a copy taken down to DETECT_RATE so it stays fast).
//   2. PLAN: snap each pitch to the nearest note of the chosen key and scale, and glide toward it at the chosen
//      speed (0 ms is the hard, robotic snap; 100 ms+ is natural). Unvoiced moments (breaths, "s") are left alone.
//   3. SHIFT with TD-PSOLA: the voice's own cycles are cut out (two periods, windowed) and laid back down spaced by
//      the TARGET period instead of the sung one. Timing is untouched; only the pitch moves.
export const HOP = 0.005;            // s between pitch readings
export const DETECT_RATE = 12000;    // Hz the detector runs at
export const F_MIN = 70, F_MAX = 1000;
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const SCALES = {
  chromatic: { label: "Chromatic (every note)", steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  major: { label: "Major", steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { label: "Minor", steps: [0, 2, 3, 5, 7, 8, 10] },
};

const midiOf = (f) => 69 + 12 * Math.log2(f / 440);
const freqOf = (m) => 440 * 2 ** ((m - 69) / 12);

/** The nearest note (as a midi number) in `key` (0 = C) and scale to a sung midi number. */
export function snap(midi, key = 0, scale = "chromatic") {
  const steps = (SCALES[scale] || SCALES.chromatic).steps;
  let best = Math.round(midi), bestD = Infinity;
  for (let base = Math.floor(midi) - 2; base <= Math.ceil(midi) + 2; base++) {
    const pc = ((base - key) % 12 + 12) % 12;
    if (!steps.includes(pc)) continue;
    const d = Math.abs(midi - base);
    if (d < bestD) { bestD = d; best = base; }
  }
  return best;
}

function mono(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length, out = new Float32Array(n);
  for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length;
  return out;
}

/** YIN pitch track: [{t, f}] every HOP s, f = 0 where unvoiced. */
export function detect(channels, rate) {
  const x = mono(channels);
  const step = Math.max(1, Math.round(rate / DETECT_RATE)), r = rate / step;
  const n = Math.floor(x.length / step), d = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < step; k++) s += x[i * step + k]; d[i] = s / step; }
  const W = Math.round(r * 0.03), maxLag = Math.ceil(r / F_MIN), minLag = Math.floor(r / F_MAX), hop = Math.round(r * HOP);
  const diff = new Float32Array(maxLag + 1), out = [];
  for (let start = 0; start + W + maxLag < n; start += hop) {
    let energy = 0; for (let i = 0; i < W; i++) energy += d[start + i] * d[start + i];
    if (energy / W < 1e-6) { out.push({ t: start / r, f: 0 }); continue; }
    for (let lag = 1; lag <= maxLag; lag++) { let s = 0; for (let i = 0; i < W; i++) { const v = d[start + i] - d[start + i + lag]; s += v * v; } diff[lag] = s; }
    let run = 0, lagFound = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
      run += diff[lag];
      const cmnd = run ? (diff[lag] * lag) / run : 1;
      if (lag >= minLag && cmnd < 0.15) {
        while (lag + 1 <= maxLag) { const nr = run + diff[lag + 1]; if ((diff[lag + 1] * (lag + 1)) / nr < cmnd && diff[lag + 1] < diff[lag]) { lag++; run = nr; } else break; }
        lagFound = lag; break;
      }
    }
    if (!lagFound) { out.push({ t: start / r, f: 0 }); continue; }
    // Parabolic refinement for sub-sample accuracy.
    const a = diff[lagFound - 1] ?? diff[lagFound], b = diff[lagFound], c = diff[lagFound + 1] ?? diff[lagFound];
    const den = a - 2 * b + c, lag = lagFound + (den ? 0.5 * (a - c) / den : 0);
    out.push({ t: start / r, f: r / lag });
  }
  return out;
}

/** Target frequency per reading: snapped to the scale, reached at `speedMs` (0 = instantly). */
export function plan(track, { key = 0, scale = "chromatic", speedMs = 0, amount = 100 } = {}) {
  const a = speedMs > 0 ? Math.exp(-(HOP * 1000) / speedMs) : 0;
  let corr = 0;
  return track.map(({ t, f }) => {
    if (!f) { corr = 0; return { t, f, to: 0 }; }
    const m = midiOf(f), want = (snap(m, key, scale) - m) * (amount / 100);
    corr = a * corr + (1 - a) * want;
    return { t, f, to: freqOf(m + corr) };
  });
}

/** TD-PSOLA: each channel re-laid with the target periods. */
export function psola(channels, rate, targets) {
  const at = (time) => targets[Math.min(targets.length - 1, Math.max(0, Math.round(time / HOP)))] || { f: 0, to: 0 };
  return channels.map((x) => {
    const n = x.length, out = new Float32Array(n), norm = new Float32Array(n);
    const unvoicedP = Math.round(rate * HOP);
    let tOut = 0;
    while (tOut < n) {
      const p = at(tOut / rate);
      const voiced = p.f > 0 && p.to > 0;
      const periodIn = voiced ? rate / p.f : unvoicedP;           // grain size comes from the sung period
      const periodOut = voiced ? rate / p.to : unvoicedP;         // spacing comes from the target
      // The analysis mark nearest this output time keeps the timing; marks sit on the sung period's grid.
      const mark = Math.round(Math.round(tOut / periodIn) * periodIn);
      const half = Math.max(2, Math.round(periodIn));
      for (let k = -half; k < half; k++) {
        const src = mark + k, dst = Math.round(tOut) + k;
        if (src < 0 || src >= n || dst < 0 || dst >= n) continue;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * k) / half);
        out[dst] += x[src] * w; norm[dst] += w;
      }
      tOut += Math.max(1, periodOut);
    }
    for (let i = 0; i < n; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
    return out;
  });
}

/** The whole job: channels in, corrected channels out, and how much it moved (for the sentence on screen). */
export function autotune(channels, rate, opts = {}) {
  const track = detect(channels, rate);
  const targets = plan(track, opts);
  const voiced = targets.filter((p) => p.f > 0);
  const avgCents = voiced.length ? Math.round(voiced.reduce((s, p) => s + Math.abs(1200 * Math.log2(p.to / p.f)), 0) / voiced.length) : 0;
  return { channels: psola(channels, rate, targets), voicedShare: track.length ? voiced.length / track.length : 0, avgCents };
}
