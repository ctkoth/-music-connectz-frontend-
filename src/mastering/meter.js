// Measurement. Everything Mix ConnectZ decides is decided from these numbers,
// and every number on its screen comes from here — loudness per ITU-R
// BS.1770-4 / EBU R128, loudness range per EBU Tech 3342, true peak per
// BS.1770-4 Annex 2. If one of them is wrong, a master is wrong in a way the
// member cannot hear on a phone speaker and a distributor will reject, so
// mastering.test.mjs checks them against signals whose answer is known.
import {
  kWeighting, biquadInto, biquadInPlace, truePeakEnvelope, samplePeak, fft, powerToDb, gainToDb, lowPass,
} from "./dsp.js";

const LUFS_OFFSET = -0.691;

// Energy of the K-weighted signal in consecutive 100 ms segments, summed over
// channels (L and R weigh 1.0 in BS.1770; there is no surround here). A 400 ms
// momentary block is 4 segments and a 3 s short-term block is 30, so one pass
// serves every loudness figure.
function segmentEnergies(channels, fs) {
  const seg = Math.max(1, Math.round(fs * 0.1));
  const n = channels[0].length;
  const count = Math.floor(n / seg);
  const e = new Float64Array(count);
  const [s, h] = kWeighting(fs);
  // Both K-weighting stages run in one pass with no intermediate buffer —
  // this is called once per loudness iteration on the whole song, so an
  // allocation or a per-sample division here is paid many times over.
  for (const x of channels) {
    let sz1 = 0, sz2 = 0, hz1 = 0, hz2 = 0;
    let i = 0;
    for (let b = 0; b < count; b++) {
      let acc = 0;
      const end = i + seg;
      for (; i < end; i++) {
        const v = x[i];
        const y = s.b0 * v + sz1;
        sz1 = s.b1 * v - s.a1 * y + sz2;
        sz2 = s.b2 * v - s.a2 * y;
        const o = h.b0 * y + hz1;
        hz1 = h.b1 * y - h.a1 * o + hz2;
        hz2 = h.b2 * y - h.a2 * o;
        acc += o * o;
      }
      e[b] += acc;
    }
  }
  return { e, seg, count };
}

function blocks(e, seg, width) {
  // Mean-square of each block of `width` segments, stepped one segment at a
  // time (75% overlap for 400 ms, as the standard specifies).
  const out = [];
  if (e.length < width) return out;
  let run = 0;
  for (let i = 0; i < width; i++) run += e[i];
  out.push(run / (width * seg));
  for (let i = width; i < e.length; i++) {
    run += e[i] - e[i - width];
    out.push(run / (width * seg));
  }
  return out;
}

const lk = (ms) => LUFS_OFFSET + powerToDb(ms);

export function integratedLoudness(channels, fs) {
  const { e, seg } = segmentEnergies(channels, fs);
  return gatedLoudness(blocks(e, seg, 4));
}

function gatedLoudness(ms) {
  const abs = ms.filter((z) => lk(z) > -70);
  if (!abs.length) return -Infinity;
  const relGate = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const rel = abs.filter((z) => lk(z) > relGate);
  if (!rel.length) return -Infinity;
  return lk(rel.reduce((a, b) => a + b, 0) / rel.length);
}

function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function loudness(channels, fs) {
  const { e, seg } = segmentEnergies(channels, fs);
  const momentary = blocks(e, seg, 4);
  const short = blocks(e, seg, 30);
  const integrated = gatedLoudness(momentary);
  // LRA, EBU Tech 3342: short-term values, absolute gate −70, relative gate
  // −20 LU below their own energy mean, then the 10th to 95th percentile.
  const sAbs = short.filter((z) => lk(z) > -70);
  let lra = 0;
  if (sAbs.length) {
    const gate = lk(sAbs.reduce((a, b) => a + b, 0) / sAbs.length) - 20;
    const vals = sAbs.map(lk).filter((v) => v > gate).sort((a, b) => a - b);
    if (vals.length > 1) lra = percentile(vals, 0.95) - percentile(vals, 0.1);
  }
  const shortMax = short.length ? Math.max(...short.map(lk)) : integrated;
  const momentaryMax = momentary.length ? Math.max(...momentary.map(lk)) : integrated;
  return { integrated, lra, shortMax, momentaryMax };
}

// Pearson correlation of L and R. +1 is mono, 0 unrelated, below 0 means parts
// of the mix cancel when the two sides are summed — on a phone speaker, a club
// rig, anything mono. Worth saying before anybody widens it.
export function correlation(l, r) {
  let sl = 0, sr = 0, slr = 0;
  for (let i = 0; i < l.length; i++) { sl += l[i] * l[i]; sr += r[i] * r[i]; slr += l[i] * r[i]; }
  return sl > 0 && sr > 0 ? slr / Math.sqrt(sl * sr) : 1;
}

// Side energy over mid energy, in dB. −∞ is mono; around −10 dB is a typical
// stereo mix; near 0 dB the sides are as loud as the centre.
export function sideToMidDb(l, r) {
  let m = 0, s = 0;
  for (let i = 0; i < l.length; i++) {
    const a = (l[i] + r[i]) / 2, b = (l[i] - r[i]) / 2;
    m += a * a; s += b * b;
  }
  return m > 0 ? powerToDb(s / m) : 0;
}

// Third-octave centres from 31.5 Hz to 16 kHz. Fine enough to see a bump,
// coarse enough that a decision made on it is a mastering move and not a
// mixing one.
export const BANDS = [
  31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800,
  1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000,
];

// Averaged power spectrum of the mid signal, summed into BANDS, in dB. Up to
// `maxFrames` evenly spaced 4096-sample Hann frames — enough to describe a
// song's tonal balance without reading every sample twice.
export function bandSpectrum(channels, fs, maxFrames = 400) {
  const N = 4096;
  const n = channels[0].length;
  const mid = new Float32Array(n);
  if (channels.length > 1) for (let i = 0; i < n; i++) mid[i] = (channels[0][i] + channels[1][i]) / 2;
  else mid.set(channels[0]);
  const frames = Math.max(1, Math.min(maxFrames, Math.floor(n / N)));
  const step = frames > 1 ? Math.floor((n - N) / (frames - 1)) : 0;
  const win = new Float64Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const power = new Float64Array(N / 2);
  const re = new Float64Array(N), im = new Float64Array(N);
  let used = 0;
  for (let f = 0; f < frames; f++) {
    const start = f * step;
    if (start + N > n) break;
    for (let i = 0; i < N; i++) { re[i] = mid[start + i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    used++;
  }
  const bin = fs / N;
  const out = BANDS.map((fc) => {
    const lo = fc / Math.pow(2, 1 / 6), hi = fc * Math.pow(2, 1 / 6);
    let p = 0, cnt = 0;
    for (let k = Math.max(1, Math.floor(lo / bin)); k <= Math.min(N / 2 - 1, Math.ceil(hi / bin)); k++) {
      const f = k * bin;
      if (f >= lo && f < hi) { p += power[k]; cnt++; }
    }
    return { f: fc, db: cnt && used && fc < fs / 2 ? powerToDb(p / used) : null };
  });
  return out;
}

// Straight-line fit of band level against octave number — a track's own
// tonal trend. "Warmer" and "brighter" are a tilt of this line, and a bump is
// a band sitting off it, which is the whole vocabulary the EQ decisions use.
export function tilt(bands, lo = 40, hi = 16000) {
  const pts = bands.filter((b) => b.db != null && b.f >= lo && b.f <= hi)
    .map((b) => [Math.log2(b.f / 1000), b.db]);
  if (pts.length < 2) return { slope: 0, at1k: 0 };
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  let num = 0, den = 0;
  for (const [x, y] of pts) { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); }
  const slope = den ? num / den : 0;
  return { slope, at1k: my - slope * mx };
}

// Correlation of the low end on its own: two kicks panned apart, or a stereo
// sub, sum badly on mono systems and are the first thing a mastering engineer
// folds to the centre.
export function lowEndCorrelation(l, r, fs, below = 150) {
  // Two cascaded Butterworth low-passes (24 dB/oct), so what is measured is
  // the low end and not a smear of the low mids.
  const lp = lowPass(fs, below);
  const lo = (x) => biquadInPlace(biquadInto(x, lp), lp);
  return correlation(lo(l), lo(r));
}

// `known.truePeak` lets a caller that has just measured the true peak (the
// mastering chain does, to guarantee the ceiling) pass it in rather than run
// the interpolator over the whole song a second time.
export function analyse(channels, fs, known = {}) {
  const stereo = channels.length > 1;
  const l = channels[0], r = stereo ? channels[1] : channels[0];
  const loud = loudness(channels, fs);
  let tp = 0, clipped = 0;
  if (Number.isFinite(known.truePeak)) tp = known.truePeak;
  else {
    const tpEnv = truePeakEnvelope(channels);
    for (let i = 0; i < tpEnv.length; i++) if (tpEnv[i] > tp) tp = tpEnv[i];
  }
  for (const x of channels) for (let i = 0; i < x.length; i++) if (x[i] >= 0.9999 || x[i] <= -0.9999) clipped++;
  let dc = 0;
  for (let i = 0; i < l.length; i++) dc += l[i];
  dc /= l.length || 1;
  const sp = samplePeak(channels);
  const bands = bandSpectrum(channels, fs);
  return {
    sampleRate: fs,
    seconds: l.length / fs,
    channels: channels.length,
    lufs: loud.integrated,
    lra: loud.lra,
    shortMax: loud.shortMax,
    truePeakDb: gainToDb(tp),
    samplePeakDb: gainToDb(sp),
    // Peak-to-loudness ratio: how much room the peaks stand above the
    // average. Low PLR is what "squashed" means, measured.
    plr: gainToDb(tp) - loud.integrated,
    correlation: stereo ? correlation(l, r) : 1,
    lowCorrelation: stereo ? lowEndCorrelation(l, r, fs) : 1,
    sideToMidDb: stereo ? sideToMidDb(l, r) : -Infinity,
    clippedSamples: clipped,
    dcOffset: dc,
    bands,
    tilt: tilt(bands),
  };
}
