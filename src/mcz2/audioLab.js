// InstrumentZ audio lab — real analysis of a mic recording or an uploaded
// audio/video file. Extracts pitch, pitch range, pitch stability, breath /
// phrasing, cadence, and loudness with the Web Audio API, then maps them to
// 0–100 scores. Which metrics matter — and how they're weighted into the
// overall — is adapted per instrument via INSTRUMENT_PROFILES so SingZ,
// RapZ, and every other InstrumentZ get feedback tuned to their craft.

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function freqToNote(hz) {
  if (!hz || hz <= 0) return "—";
  const midi = Math.round(69 + 12 * Math.log2(hz / 440));
  return `${NOTES[(midi % 12 + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

function hzToMidi(hz) {
  return hz > 0 ? 69 + 12 * Math.log2(hz / 440) : 0;
}

// Vocal range classes by comfortable center pitch (Hz). Used to detect or
// confirm a singer's range class from the median of a take.
const VOCAL_CLASSES = [
  { name: "Bass", emoji: "🧔‍♂️", centerHz: 147 },        // ~D3
  { name: "Baritone", emoji: "🎙️", centerHz: 185 },      // ~F#3
  { name: "Tenor", emoji: "🎤", centerHz: 233 },          // ~A#3
  { name: "Countertenor", emoji: "🕊️", centerHz: 294 },  // ~D4
  { name: "Contralto", emoji: "🎻", centerHz: 262 },      // ~C4
  { name: "Alto", emoji: "🎶", centerHz: 330 },           // ~E4
  { name: "Mezzo-Soprano", emoji: "🌊", centerHz: 392 },  // ~G4
  { name: "Soprano", emoji: "☀️", centerHz: 494 },        // ~B4
];

// Nearest vocal class to a median frequency.
export function detectVocalClass(medHz) {
  if (!medHz || medHz <= 0) return null;
  let best = VOCAL_CLASSES[0], bestD = Infinity;
  for (const c of VOCAL_CLASSES) {
    const d = Math.abs(12 * Math.log2(medHz / c.centerHz)); // semitone distance
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// Instrument profiles: which score meters to surface, how to weight the
// overall, and a label pack. `metrics` is the ordered set of scores shown;
// `weights` are relative weights for the overall (missing → 1). `emphasis`
// is what the coach should lead with.
export const INSTRUMENT_PROFILES = {
  voice: {
    label: "Voice",
    metrics: ["pitch", "range", "breath", "tone", "control"],
    weights: { pitch: 2, range: 1.5, breath: 1.5, tone: 1, control: 1 },
    emphasis: "pitch accuracy, range and breath support",
  },
  rap: {
    label: "Rap",
    metrics: ["cadence", "flow", "breath", "clarity", "control"],
    weights: { cadence: 2, flow: 2, breath: 1.5, clarity: 1.5, control: 1 },
    emphasis: "cadence, flow and breath control",
  },
  instrument: {
    label: "Instrument",
    metrics: ["pitch", "range", "timing", "control"],
    weights: { pitch: 2, range: 1, timing: 2, control: 1 },
    emphasis: "pitch, timing and dynamic control",
  },
};

export function profileFor(kind) {
  return INSTRUMENT_PROFILES[kind] || INSTRUMENT_PROFILES.voice;
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

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = clamp(Math.round((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[idx];
}

// Analyze an AudioBuffer → { ok, metrics, scores }.
// `kind` selects the instrument profile that shapes the overall and the
// meters surfaced ("voice" | "rap" | "instrument").
export function analyzeAudioBuffer(audio, kind = "voice") {
  const profile = profileFor(kind);
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

  // Range: robust low/high pitch (5th–95th pct guards against octave errors),
  // span in semitones, and detected vocal class.
  const lowHz = percentile(sorted, 0.05);
  const highHz = percentile(sorted, 0.95);
  const rangeSemitones = lowHz > 0 && highHz > 0 ? 12 * Math.log2(highHz / lowHz) : 0;
  const vocalClass = detectVocalClass(medHz);
  // A confident, usable range spans ~12+ semitones; reward wider control.
  const rangeScore = clamp(35 + rangeSemitones * 4.2, 20, 100);

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
  // Rap wants a busier, tighter delivery (~4 hits/s); voice/instrument ~3.
  const cadenceTarget = kind === "rap" ? 4 : 3;
  const cadenceScore = clamp(100 - Math.abs(onsetsPerSec - cadenceTarget) * 16, 20, 100);

  // Flow (rap): evenness of the gap between onsets — steady pocket scores high.
  let onsetTimes = [];
  for (let i = 1; i < rmsSeq.length; i++) if (rmsSeq[i] > gate && rmsSeq[i - 1] <= gate) onsetTimes.push(i / framesPerSec);
  let flowScore = 60;
  if (onsetTimes.length > 2) {
    const gaps = [];
    for (let i = 1; i < onsetTimes.length; i++) gaps.push(onsetTimes[i] - onsetTimes[i - 1]);
    const gMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const gStd = Math.sqrt(gaps.reduce((t, g) => t + (g - gMean) ** 2, 0) / gaps.length);
    flowScore = clamp(100 - (gStd / (gMean || 1)) * 90, 25, 100); // low relative jitter ⇒ steady flow
  }

  // Loudness consistency (dynamic control).
  const meanRms = rmsSeq.reduce((a, b) => a + b, 0) / (rmsSeq.length || 1);
  const rmsStd = Math.sqrt(rmsSeq.reduce((t, r) => t + (r - meanRms) ** 2, 0) / (rmsSeq.length || 1));
  const loudnessScore = clamp(100 - (rmsStd / (meanRms || 1)) * 60, 30, 100);

  // Tone (voice): resonance proxy = strong voiced ratio + stable pitch.
  const toneScore = clamp(voicedRatio * 60 + pitchStability * 0.4, 20, 100);

  // Clarity (rap): enunciation proxy = healthy voiced ratio without smearing.
  const clarityScore = clamp(voicedRatio * 55 + (100 - semitoneStd * 20) * 0.4, 20, 100);

  // Timing (instrument): steadiness of onsets, like flow but named for players.
  const timingScore = flowScore;

  const allScores = {
    pitch: Math.round(pitchStability),
    range: Math.round(rangeScore),
    breath: Math.round(breathScore),
    tone: Math.round(toneScore),
    cadence: Math.round(cadenceScore),
    flow: Math.round(flowScore),
    clarity: Math.round(clarityScore),
    timing: Math.round(timingScore),
    control: Math.round(loudnessScore),
  };

  // Overall = profile-weighted mean over the meters this instrument cares about.
  let wsum = 0, acc = 0;
  for (const m of profile.metrics) {
    const w = profile.weights[m] ?? 1;
    acc += (allScores[m] ?? 0) * w;
    wsum += w;
  }
  const overall = Math.round(wsum ? acc / wsum : 0);

  // Only surface the meters relevant to this instrument (+ overall).
  const scores = { overall };
  for (const m of profile.metrics) scores[m] = allScores[m];

  return {
    ok: f0s.length > 3,
    kind,
    profile: { label: profile.label, emphasis: profile.emphasis, metrics: profile.metrics },
    metrics: {
      pitchHz: Math.round(medHz), note: freqToNote(medHz),
      lowHz: Math.round(lowHz), lowNote: freqToNote(lowHz),
      highHz: Math.round(highHz), highNote: freqToNote(highHz),
      rangeSemitones: +rangeSemitones.toFixed(1),
      rangeOctaves: +(rangeSemitones / 12).toFixed(1),
      vocalClass: vocalClass ? vocalClass.name : null,
      vocalClassEmoji: vocalClass ? vocalClass.emoji : null,
      semitoneSpread: +semitoneStd.toFixed(2),
      voicedRatio: +voicedRatio.toFixed(2),
      avgPhraseSec: +avgPhraseSec.toFixed(1),
      onsetsPerSec: +onsetsPerSec.toFixed(1),
      durationSec: +durationSec.toFixed(1),
    },
    scores,
  };
}
