// The arithmetic under Mix ConnectZ. Pure functions over Float32Arrays — no
// AudioContext, no DOM — so the same code runs in the mastering worker and
// under plain node in mastering.test.mjs. Every number a member is shown is
// measured by something in this file or meter.js, never estimated.

export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => (g > 0 ? 20 * Math.log10(g) : -Infinity);
export const powerToDb = (p) => (p > 0 ? 10 * Math.log10(p) : -Infinity);

// ---- Biquads ---------------------------------------------------------------
// RBJ "Audio EQ Cookbook" forms, normalised so a0 = 1. Coefficients are plain
// objects so a plan can be inspected and tested without running audio.

export function peaking(fs, f0, gainDb, q) {
  const A = Math.pow(10, gainDb / 40);
  const w = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  const a0 = 1 + alpha / A;
  return {
    b0: (1 + alpha * A) / a0, b1: (-2 * c) / a0, b2: (1 - alpha * A) / a0,
    a1: (-2 * c) / a0, a2: (1 - alpha / A) / a0,
  };
}

export function lowShelf(fs, f0, gainDb, s = 0.8) {
  const A = Math.pow(10, gainDb / 40);
  const w = (2 * Math.PI * f0) / fs;
  const c = Math.cos(w);
  const alpha = (Math.sin(w) / 2) * Math.sqrt((A + 1 / A) * (1 / s - 1) + 2);
  const k = 2 * Math.sqrt(A) * alpha;
  const a0 = (A + 1) + (A - 1) * c + k;
  return {
    b0: (A * ((A + 1) - (A - 1) * c + k)) / a0,
    b1: (2 * A * ((A - 1) - (A + 1) * c)) / a0,
    b2: (A * ((A + 1) - (A - 1) * c - k)) / a0,
    a1: (-2 * ((A - 1) + (A + 1) * c)) / a0,
    a2: ((A + 1) + (A - 1) * c - k) / a0,
  };
}

export function highShelf(fs, f0, gainDb, s = 0.8) {
  const A = Math.pow(10, gainDb / 40);
  const w = (2 * Math.PI * f0) / fs;
  const c = Math.cos(w);
  const alpha = (Math.sin(w) / 2) * Math.sqrt((A + 1 / A) * (1 / s - 1) + 2);
  const k = 2 * Math.sqrt(A) * alpha;
  const a0 = (A + 1) - (A - 1) * c + k;
  return {
    b0: (A * ((A + 1) + (A - 1) * c + k)) / a0,
    b1: (-2 * A * ((A - 1) + (A + 1) * c)) / a0,
    b2: (A * ((A + 1) + (A - 1) * c - k)) / a0,
    a1: (2 * ((A - 1) - (A + 1) * c)) / a0,
    a2: ((A + 1) - (A - 1) * c - k) / a0,
  };
}

export function highPass(fs, f0, q = Math.SQRT1_2) {
  const w = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  const a0 = 1 + alpha;
  return {
    b0: (1 + c) / 2 / a0, b1: -(1 + c) / a0, b2: (1 + c) / 2 / a0,
    a1: (-2 * c) / a0, a2: (1 - alpha) / a0,
  };
}

export function lowPass(fs, f0, q = Math.SQRT1_2) {
  const w = (2 * Math.PI * f0) / fs;
  const alpha = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  const a0 = 1 + alpha;
  return {
    b0: (1 - c) / 2 / a0, b1: (1 - c) / a0, b2: (1 - c) / 2 / a0,
    a1: (-2 * c) / a0, a2: (1 - alpha) / a0,
  };
}

// Transposed direct form II, in place. Returns the array for chaining.
export function biquadInPlace(x, co) {
  const { b0, b1, b2, a1, a2 } = co;
  let z1 = 0, z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = b0 * v + z1;
    z1 = b1 * v - a1 * y + z2;
    z2 = b2 * v - a2 * y;
    x[i] = y;
  }
  return x;
}

export function biquadInto(x, co) {
  return biquadInPlace(Float32Array.from(x), co);
}

// Magnitude response in dB of a cascade at frequency f — how the plan's
// "after" curve is predicted before any audio is run, and how tests check a
// filter does what its label says.
export function responseDb(cascade, fs, f) {
  const w = (2 * Math.PI * f) / fs;
  const cr = Math.cos(w), ci = -Math.sin(w);          // z^-1
  const c2r = Math.cos(2 * w), c2i = -Math.sin(2 * w); // z^-2
  let db = 0;
  for (const co of cascade) {
    const nr = co.b0 + co.b1 * cr + co.b2 * c2r;
    const ni = co.b1 * ci + co.b2 * c2i;
    const dr = 1 + co.a1 * cr + co.a2 * c2r;
    const di = co.a1 * ci + co.a2 * c2i;
    db += 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
  }
  return db;
}

// ---- K-weighting (ITU-R BS.1770-4) ---------------------------------------
// Derived for ANY sample rate from the filter's analogue parameters (the same
// derivation libebur128 uses), so a 44.1 kHz file is weighted as correctly as
// the 48 kHz one the standard's table is printed for.
export function kWeighting(fs) {
  let f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
  let K = Math.tan((Math.PI * f0) / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Q + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / Q + K * K) / a0,
  };
  f0 = 38.13547087602444; Q = 0.5003270373238773;
  K = Math.tan((Math.PI * f0) / fs);
  a0 = 1 + K / Q + K * K;
  const hp = { b0: 1, b1: -2, b2: 1, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 };
  return [shelf, hp];
}

// ---- True-peak interpolator ----------------------------------------------
// 4x oversampling (BS.1770-4 Annex 2) with a 48-tap windowed-sinc split into
// four phases. Each phase is normalised to unity DC gain so a constant reads
// as itself rather than 0.1 dB off.
const TP_UP = 4;
const TP_TAPS_PER_PHASE = 12;
let TP_PHASES = null;
function tpPhases() {
  if (TP_PHASES) return TP_PHASES;
  const N = TP_UP * TP_TAPS_PER_PHASE;
  const c = (N - 1) / 2;
  const h = new Float64Array(N);
  for (let m = 0; m < N; m++) {
    const x = (m - c) / TP_UP;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    // Blackman-Harris: low sidelobes, which is what keeps a 0 dBFS sine
    // from reading as +0.2 dBTP.
    const t = (2 * Math.PI * m) / (N - 1);
    const w = 0.35875 - 0.48829 * Math.cos(t) + 0.14128 * Math.cos(2 * t) - 0.01168 * Math.cos(3 * t);
    h[m] = sinc * w;
  }
  TP_PHASES = [];
  for (let p = 0; p < TP_UP; p++) {
    const ph = new Float64Array(TP_TAPS_PER_PHASE);
    let sum = 0;
    for (let k = 0; k < TP_TAPS_PER_PHASE; k++) { ph[k] = h[k * TP_UP + p]; sum += ph[k]; }
    for (let k = 0; k < TP_TAPS_PER_PHASE; k++) ph[k] /= sum;
    TP_PHASES.push(ph);
  }
  return TP_PHASES;
}

// Per-sample true-peak envelope across all channels: env[n] is the largest
// absolute value of any channel at sample n OR at the three points the
// interpolator places between n and n+1. Mastering limits on this, not on the
// samples, because a lossy encoder and a DAC both reconstruct the waveform
// between the samples, and that is where the clipping a member hears lives.
export function truePeakEnvelope(channels) {
  const [p0, p1, p2, p3] = tpPhases();
  const n = channels[0].length;
  const env = new Float32Array(n);
  const T = TP_TAPS_PER_PHASE;
  const half = T / 2;
  // Zero-padded copy so the inner loop has no bounds checks, and each input
  // sample is loaded once for all four phases. This is the hot loop of the
  // whole engine (it runs over every sample of every channel three times per
  // master), so it is written for the JIT rather than for brevity.
  const pad = new Float32Array(n + T);
  for (const x of channels) {
    pad.set(x, half);
    for (let i = 0; i < n; i++) {
      // window x[i+half-k] for k = 0..T-1  ==  pad[i + 2*half - k]
      const base = i + T;
      let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
      for (let k = 0; k < T; k++) {
        const v = pad[base - k];
        a0 += p0[k] * v; a1 += p1[k] * v; a2 += p2[k] * v; a3 += p3[k] * v;
      }
      let m = x[i] < 0 ? -x[i] : x[i];
      if (a0 < 0) a0 = -a0; if (a0 > m) m = a0;
      if (a1 < 0) a1 = -a1; if (a1 > m) m = a1;
      if (a2 < 0) a2 = -a2; if (a2 > m) m = a2;
      if (a3 < 0) a3 = -a3; if (a3 > m) m = a3;
      if (m > env[i]) env[i] = m;
    }
    pad.fill(0);
  }
  return env;
}

export function truePeak(channels) {
  const env = truePeakEnvelope(channels);
  let m = 0;
  for (let i = 0; i < env.length; i++) if (env[i] > m) m = env[i];
  return m;
}

export function samplePeak(channels) {
  let m = 0;
  for (const x of channels) for (let i = 0; i < x.length; i++) {
    const a = x[i] < 0 ? -x[i] : x[i];
    if (a > m) m = a;
  }
  return m;
}

// ---- FFT -------------------------------------------------------------------
// Iterative radix-2, in place on separate real/imag arrays. Only used for the
// averaged spectrum, so clarity beats the last 20% of speed.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2], bi = im[i + k + len / 2];
        const tr = br * cr - bi * ci, ti = br * ci + bi * cr;
        re[i + k] = ar + tr; im[i + k] = ai + ti;
        re[i + k + len / 2] = ar - tr; im[i + k + len / 2] = ai - ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// A seeded PRNG for dither, so a test can assert on the exact noise and two
// exports of the same master are bit-identical.
export function xorshift(seed = 0x9e3779b9) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
