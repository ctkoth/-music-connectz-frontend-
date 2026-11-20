// Tempo from audio: how often the beat comes round, found by looking for the spacing at which the track's loudness jumps repeat.
//
// Method (plain, and checkable): cut the audio into ~12 ms frames, take each frame's loudness, keep only the RISES (a drum hit
// or a chord change makes a rise; a held note does not), then find the spacing (a "lag") at which that pattern lines up with
// itself best, between 60 and 180 BPM. A tempo has a half-time and a double-time twin that line up almost as well, so a mild
// preference for the 80-160 range chooses between them, and the twin is reported as `alt` rather than hidden.
//
// It is an estimate and says so: `null` when nothing in the audio repeats (a pad, silence, a free-time recording), never a
// number made up to fill the box. A song that changes tempo, or has no steady pulse, will not read well.

const MIN_BPM = 60, MAX_BPM = 180;
const FRAME_SECONDS = 0.0116;
const RISE_FLOOR = 0.12;   // in log-loudness units; a drum hit rises by whole units, a held tone's ripple by hundredths

function envelope(samples, rate) {
  const hop = Math.max(1, Math.round(rate * FRAME_SECONDS));
  const win = hop * 4;                                   // each frame looks 4 hops wide, so a steady tone's ripple averages out
  const n = Math.floor((samples.length - win) / hop);
  if (n < 2) return { onset: new Float32Array(0), frameRate: rate / hop };
  const env = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let sum = 0;
    for (let i = f * hop, e = i + win; i < e; i++) sum += samples[i] * samples[i];
    env[f] = Math.log1p(1000 * Math.sqrt(sum / win));   // log: a quiet hit still counts next to a loud one
  }
  const onset = new Float32Array(n);
  for (let f = 1; f < n; f++) {
    const rise = env[f] - env[f - 1];
    onset[f] = rise > RISE_FLOOR ? rise : 0;             // a wobble is not a hit
  }
  // A little smoothing, so a hit that lands between two frames still lines up with the next one.
  const sm = new Float32Array(n);
  for (let f = 1; f < n - 1; f++) sm[f] = 0.25 * onset[f - 1] + 0.5 * onset[f] + 0.25 * onset[f + 1];
  return { onset: sm, frameRate: rate / hop };
}

/** Tempo of mono samples: { bpm, alt, strength } or null. `bpm` is a whole number (a session's tempo is); `strength` is 0-1, how
 *  clearly the pulse repeats. Reads up to 90 s from the middle. */
export function detectTempo(samples, rate) {
  if (!samples || !samples.length || !(rate > 0)) return null;
  const want = Math.min(samples.length, Math.round(rate * 90));
  const from = Math.floor((samples.length - want) / 2);
  const { onset, frameRate } = envelope(samples.subarray ? samples.subarray(from, from + want) : samples.slice(from, from + want), rate);
  const n = onset.length;
  const loLag = Math.floor(frameRate * 60 / MAX_BPM), hiLag = Math.ceil(frameRate * 60 / MIN_BPM);
  if (n < hiLag * 3) return null;                       // too short to see a pulse repeat

  let top = 0; for (let i = 0; i < n; i++) if (onset[i] > top) top = onset[i];
  if (top < RISE_FLOOR) return null;                    // nothing in this audio ever jumps in loudness

  let mean = 0; for (let i = 0; i < n; i++) mean += onset[i]; mean /= n;
  let energy = 0; for (let i = 0; i < n; i++) energy += (onset[i] - mean) ** 2;
  if (!(energy > 1e-9)) return null;                    // nothing jumps at all

  const ac = new Float32Array(hiLag * 2 + 3);
  for (let lag = loLag - 1; lag <= hiLag * 2 + 1; lag++) {
    let s = 0;
    for (let i = lag; i < n; i++) s += (onset[i] - mean) * (onset[i - lag] - mean);
    ac[lag] = s / energy;
  }
  const bpmOf = (lag) => 60 * frameRate / lag;
  const weight = (bpm) => (bpm >= 80 && bpm <= 160 ? 1 : 0.85);
  let best = 0, bestScore = -1;
  for (let lag = loLag; lag <= hiLag; lag++) {
    if (!(ac[lag] > ac[lag - 1] && ac[lag] >= ac[lag + 1])) continue;       // a peak, not a slope
    const score = (ac[lag] + 0.5 * Math.max(0, ac[lag * 2] || 0)) * weight(bpmOf(lag));   // a real beat also repeats two beats later
    if (score > bestScore) { bestScore = score; best = lag; }
  }
  if (!best || ac[best] < 0.12) return null;            // nothing repeats clearly enough to call a tempo

  // Refine between frames (parabola through the peak), then round: a session holds whole BPM.
  const a = ac[best - 1], b = ac[best], c = ac[best + 1];
  const shift = (a - 2 * b + c) !== 0 ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
  const bpm = Math.round(bpmOf(best + Math.max(-1, Math.min(1, shift))));
  const twin = bpm * 2 <= MAX_BPM + 20 && bpm >= 100 ? Math.round(bpm / 2) : bpm / 2 >= MIN_BPM - 20 && bpm <= 100 ? bpm * 2 : null;
  return { bpm, alt: twin && twin !== bpm ? twin : null, strength: Math.round(Math.min(1, ac[best]) * 100) / 100 };
}

/** The tempo of a track already in memory as channels (the DAW's own render of it). */
export function detectTempoFromChannels({ channels, rate }) {
  const len = channels?.[0]?.length || 0;
  if (!len) return null;
  const mono = new Float32Array(len);
  for (const d of channels) for (let i = 0; i < len; i++) mono[i] += d[i] / channels.length;
  return detectTempo(mono, rate);
}
