// Sample-rate conversion for export: 44.1 kHz for streaming and CD, 48 kHz for
// video. A master is made at its file's own rate (client.js reads it from the
// header so nothing is converted behind the member's back); converting is a
// choice they make on export, and this is the one way it is done.
//
// Windowed-sinc interpolation, Kaiser window (β 9 — about 90 dB of stopband).
// The lowpass sits a little under the LOWER of the two Nyquists, so going down
// in rate cannot fold anything above the new Nyquist back into the audible
// band. The kernel is tabulated once per conversion and read with linear
// interpolation, which keeps a four-minute song to a few seconds in a worker.

const BETA = 9;
const STEPS = 512;      // table points per input sample

function besselI0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 40; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}

function kernel(zeros, cutoff) {
  const half = Math.ceil(zeros / cutoff);
  const n = half * STEPS;
  const t = new Float32Array(n + 2);
  const i0b = besselI0(BETA);
  for (let i = 0; i <= n; i++) {
    const d = i / STEPS;
    const x = cutoff * d;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const r = d / half;
    const w = r >= 1 ? 0 : besselI0(BETA * Math.sqrt(1 - r * r)) / i0b;
    t[i] = cutoff * sinc * w;
  }
  return { table: t, half };
}

export function resampleChannel(x, inRate, outRate, { zeros = 32 } = {}) {
  if (inRate === outRate) return Float32Array.from(x);
  const ratio = outRate / inRate;
  const cutoff = Math.min(1, ratio) * 0.94;
  const { table, half } = kernel(zeros, cutoff);
  const n = x.length;
  const m = Math.floor(n * ratio);
  const out = new Float32Array(m);
  for (let j = 0; j < m; j++) {
    const t = j / ratio;
    const c = Math.floor(t);
    let sum = 0;
    const lo = Math.max(0, c - half + 1), hi = Math.min(n - 1, c + half);
    for (let k = lo; k <= hi; k++) {
      const p = Math.abs(t - k) * STEPS;
      const i = p | 0;
      if (i >= table.length - 1) continue;
      const f = p - i;
      sum += x[k] * (table[i] + (table[i + 1] - table[i]) * f);
    }
    out[j] = sum;
  }
  return out;
}

export function resample(channels, inRate, outRate, opts) {
  return channels.map((x) => resampleChannel(x, inRate, outRate, opts));
}

// The rates a member can export at, and why each exists.
export const EXPORT_RATES = {
  44100: "44.1 kHz — streaming services and CD.",
  48000: "48 kHz — video: YouTube uploads, film and TV.",
};
