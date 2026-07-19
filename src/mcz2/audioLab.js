// InstrumentZ audio lab — real analysis of a mic recording or an uploaded
// audio/video file. Extracts pitch, pitch stability, breath/phrasing, cadence,
// and loudness with the Web Audio API, then maps them to 0–100 scores that
// SingZ / RapZ (and any InstrumentZ) rate and coach against.

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function freqToNote(hz) {
  if (!hz || hz <= 0) return "—";
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTES[(midi % 12 + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// Decode a Blob/File into an AudioBuffer (mono mix used for analysis).
export async function decodeBlob(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  try {
    const arr = await blob.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    return buf;
  } finally {
    ctx.close?.();
  }
}

// Classic autocorrelation pitch detector for one frame. Returns Hz or -1.
function acfPitch(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // unvoiced / silent
  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  const b = buf.slice(r1, r2);
  const n = b.length;
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];
  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  let T0 = maxpos;
  if (T0 <= 0) return -1;
  const x1 = c[T0 - 1] || 0, x2 = c[T0] || 0, x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2, bb = (x3 - x1) / 2;
  if (a) T0 -= bb / (2 * a);
  const hz = sampleRate / T0;
  return hz > 50 && hz < 1500 ? hz : -1;
}

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// Analyze an AudioBuffer → { metrics, scores }.
export function analyzeAudioBuffer(audio) {
  const sr = audio.sampleRate;
  const data = audio.getChannelData(0);
  const FRAME = 2048;
  const HOP = 2048;
  const maxSamples = Math.min(data.length, sr * 8); // cap analysis to ~8s
  const f0s = [];
  const rmsSeq = [];
  for (let i = 0; i + FRAME < maxSamples; i += HOP) {
    const frame = data.subarray(i, i + FRAME);
    let rms = 0;
    for (let j = 0; j < FRAME; j++) rms += frame[j] * frame[j];
    rms = Math.sqrt(rms / FRAME);
    rmsSeq.push(rms);
    const hz = acfPitch(frame, sr);
    if (hz > 0) f0s.push(hz);
  }
  const durationSec = Math.min(audio.duration, 8);
  const voicedRatio = rmsSeq.length ? f0s.length / rmsSeq.length : 0;

  // Pitch: median + semitone stability.
  const sorted = [...f0s].sort((a, b) => a - b);
  const medHz = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  let semitoneStd = 0;
  if (f0s.length > 1 && medHz > 0) {
    const cents = f0s.map((h) => 12 * Math.log2(h / medHz));
    const mean = cents.reduce((a, b) => a + b, 0) / cents.length;
    semitoneStd = Math.sqrt(cents.reduce((t, c) => t + (c - mean) ** 2, 0) / cents.length);
  }
  const pitchStability = clamp(100 - semitoneStd * 45, 0, 100); // <0.5 semitone spread ≈ great

  // Breath / phrasing: pauses = low-RMS runs between voiced phrases.
  const peak = Math.max(...rmsSeq, 0.0001);
  const gate = peak * 0.15;
  let pauses = 0, inPhrase = false, phraseLens = [], cur = 0;
  rmsSeq.forEach((r) => {
    if (r > gate) { inPhrase = true; cur++; }
    else { if (inPhrase) { phraseLens.push(cur); cur = 0; } inPhrase = false; pauses++; }
  });
  if (cur) phraseLens.push(cur);
  const framesPerSec = sr / HOP;
  const avgPhraseSec = phraseLens.length ? (phraseLens.reduce((a, b) => a + b, 0) / phraseLens.length) / framesPerSec : 0;
  // Healthy phrasing: phrases 1.5–5s with real breaths between. Too-long = poor breath support.
  const breathScore = clamp(100 - Math.abs(avgPhraseSec - 3) * 18 - (pauses === 0 ? 25 : 0), 20, 100);

  // Cadence: onsets (RMS rising through the gate) per second.
  let onsets = 0;
  for (let i = 1; i < rmsSeq.length; i++) if (rmsSeq[i] > gate && rmsSeq[i - 1] <= gate) onsets++;
  const onsetsPerSec = durationSec ? onsets / durationSec : 0;
  const cadenceScore = clamp(100 - Math.abs(onsetsPerSec - 3) * 16, 20, 100); // ~3 hits/s comfortable

  // Loudness consistency (dynamic control).
  const meanRms = rmsSeq.reduce((a, b) => a + b, 0) / (rmsSeq.length || 1);
  const rmsStd = Math.sqrt(rmsSeq.reduce((t, r) => t + (r - meanRms) ** 2, 0) / (rmsSeq.length || 1));
  const loudnessScore = clamp(100 - (rmsStd / (meanRms || 1)) * 60, 30, 100);

  const overall = Math.round((pitchStability + breathScore + cadenceScore + loudnessScore) / 4);
  return {
    ok: f0s.length > 3,
    metrics: {
      pitchHz: Math.round(medHz), note: freqToNote(medHz),
      semitoneSpread: +semitoneStd.toFixed(2),
      voicedRatio: +voicedRatio.toFixed(2),
      avgPhraseSec: +avgPhraseSec.toFixed(1),
      onsetsPerSec: +onsetsPerSec.toFixed(1),
      durationSec: +durationSec.toFixed(1),
    },
    scores: {
      pitch: Math.round(pitchStability),
      breath: Math.round(breathScore),
      cadence: Math.round(cadenceScore),
      control: Math.round(loudnessScore),
      overall,
    },
  };
}
