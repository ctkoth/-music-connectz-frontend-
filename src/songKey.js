// The musical key of a recording, ESTIMATED on the device from the audio. Pure maths here; nothing is sent
// anywhere, and the label always says "estimated", because a key read from sound is a best guess, not a fact
// about the song. Relative keys (A minor / C major) share every note and are the usual way it goes wrong, so
// the relative key is always named beside the answer.
//
// Method: how much energy each of the twelve pitch classes carries across the song (Goertzel on the
// pitches C2..B6, Hann-windowed frames spread evenly through it), correlated against the Krumhansl-Kessler
// major and minor profiles in all twelve rotations. Honest about silence: no tonal energy is null, never a key.
export const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const FRAME = 8192;
const MIDI_LO = 36, MIDI_HI = 95;           // C2 .. B6

function goertzel(x, start, n, freq, sr) {
  const w = (2 * Math.PI * freq) / sr, coeff = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = 0; i < n; i++) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const s = x[start + i] * hann + coeff * s1 - s2;
    s2 = s1; s1 = s;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2));
}

/** Twelve numbers: how much of the song sits on each pitch class (C = 0). */
export function chroma(samples, sampleRate, { frames = 36 } = {}) {
  const out = new Array(12).fill(0);
  if (!samples || samples.length < FRAME || !sampleRate) return out;
  const last = samples.length - FRAME;
  const count = Math.min(frames, Math.floor(last / (FRAME / 2)) + 1);
  for (let f = 0; f < count; f++) {
    const start = count === 1 ? 0 : Math.floor((last * f) / (count - 1));
    for (let m = MIDI_LO; m <= MIDI_HI; m++) {
      const freq = 440 * Math.pow(2, (m - 69) / 12);
      if (freq >= sampleRate / 2) break;
      out[m % 12] += goertzel(samples, start, FRAME, freq, sampleRate);
    }
  }
  return out;
}

function pearson(a, b) {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** The best key for a chroma vector, or null when there is no tonal content to judge. */
export function keyFromChroma(c) {
  const total = c.reduce((s, v) => s + v, 0);
  if (!(total > 0)) return null;
  const scored = [];
  for (let root = 0; root < 12; root++) {
    const rot = (p) => c.map((_, i) => p[(i - root + 12) % 12]);
    scored.push({ root, mode: "major", r: pearson(c, rot(MAJOR)) }, { root, mode: "minor", r: pearson(c, rot(MINOR)) });
  }
  scored.sort((a, b) => b.r - a.r);
  const best = scored[0];
  if (best.r < 0.4) return null;                          // nothing that sounds like a key
  const rel = best.mode === "major" ? { root: (best.root + 9) % 12, mode: "minor" } : { root: (best.root + 3) % 12, mode: "major" };
  return {
    root: NAMES[best.root], mode: best.mode,
    label: `${NAMES[best.root]} ${best.mode}`,
    relative: `${NAMES[rel.root]} ${rel.mode}`,
    // How far ahead of the next-best DIFFERENT-root key it was: small means "could be several".
    margin: Math.round((best.r - (scored.find((s) => s.root !== best.root && !(s.root === rel.root && s.mode === rel.mode))?.r ?? 0)) * 100) / 100,
    score: Math.round(best.r * 100) / 100,
  };
}

/** The key of mono samples at a sample rate, or null. */
export const detectKey = (samples, sampleRate, opts) => keyFromChroma(chroma(samples, sampleRate, opts));

/** The key of a track already in memory as channels (the DAW's own render of it). Reads up to a minute from the middle. */
export function detectKeyFromChannels({ channels, rate }) {
  const len = channels?.[0]?.length || 0;
  if (!len) return null;
  const want = Math.min(len, rate * 60), from = Math.floor((len - want) / 2);
  const mono = new Float32Array(want);
  for (const d of channels) for (let i = 0; i < want; i++) mono[i] += d[from + i] / channels.length;
  return detectKey(mono, rate);
}

/** Decode an audio address (a blob: or same-origin URL) and read its key. Browser only. Reads up to a minute from the middle. */
export async function detectKeyFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't open that audio.");
  const buf = await res.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audio = await new Promise((ok, no) => { const p = ctx.decodeAudioData(buf, ok, no); p?.then?.(ok, no); });
    const sr = audio.sampleRate, len = audio.length, want = Math.min(len, sr * 60);
    const from = Math.max(0, Math.floor((len - want) / 2));
    const mono = new Float32Array(want);
    for (let ch = 0; ch < audio.numberOfChannels; ch++) {
      const d = audio.getChannelData(ch);
      for (let i = 0; i < want; i++) mono[i] += d[from + i] / audio.numberOfChannels;
    }
    return detectKey(mono, sr);
  } finally { ctx.close?.(); }
}
