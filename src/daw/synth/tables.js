// Band-limited wavetables. Every oscillator shape is a FRAME of one table set, built additively (sums of sines), and each
// frame has a mip level per octave with fewer harmonics, so a high note never contains a partial above Nyquist: no aliasing,
// with no PolyBLEP and no oversampling. "Wavetable" is a morph across the frames in order. Pure; built once, on first use.

export const TABLE = 2048;
export const MAX_H = 512;                       // harmonics in the finest level
const LEVELS = 10;                              // 512, 256, ... 1 harmonics

const odd = (h) => h % 2 === 1;
// [name, amplitude of harmonic h]. Order is the morph order of the "wavetable" shape.
const FRAMES = [
  ["sine", (h) => (h === 1 ? 1 : 0)],
  ["triangle", (h) => (odd(h) ? (((h - 1) / 2) % 2 ? -1 : 1) / (h * h) : 0)],
  ["saw", (h) => 1 / h],
  ["square", (h) => (odd(h) ? 1 / h : 0)],
  ["pulse", (h) => Math.sin(Math.PI * h * 0.25) / h],
  ["organ", (h) => ({ 1: 1, 2: 0.7, 3: 0.5, 4: 0.35, 6: 0.25, 8: 0.2 }[h] || 0)],
  ["vocal", (h) => (1 / h) * (1 + 3 * Math.exp(-(((h - 4) / 1.5) ** 2)) + 2 * Math.exp(-(((h - 9) / 2) ** 2)))],
];
export const FRAME_NAMES = FRAMES.map(([n]) => n);
export const SHAPE_FRAME = { sine: 0, triangle: 1, saw: 2, square: 3 };

let built = null;
function build() {
  const S = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) S[i] = Math.sin((2 * Math.PI * i) / TABLE);
  const frames = FRAMES.map(([, amp]) => {
    const levels = [];
    let norm = 1;
    for (let k = 0; k < LEVELS; k++) {
      const H = MAX_H >> k;
      const t = new Float32Array(TABLE + 1);
      for (let h = 1; h <= H; h++) {
        const a = amp(h);
        if (!a) continue;
        for (let i = 0; i < TABLE; i++) t[i] += a * S[(h * i) % TABLE];
      }
      if (k === 0) { let p = 0; for (let i = 0; i < TABLE; i++) p = Math.max(p, Math.abs(t[i])); norm = p > 0 ? 1 / p : 1; }
      for (let i = 0; i < TABLE; i++) t[i] *= norm;
      t[TABLE] = t[0];                          // guard sample for interpolation
      levels.push(t);
    }
    return levels;
  });
  return frames;
}
export const tables = () => (built ||= build());

/** The mip level for a note at `freq`: the finest one whose top harmonic stays under 0.45 x the sample rate. */
export function levelFor(freq, rate) {
  const hmax = Math.floor((0.45 * rate) / Math.max(1, freq));
  let k = 0;
  while (k < LEVELS - 1 && (MAX_H >> k) > hmax) k++;
  return k;
}

/** One sample of frame `f` at mip `k`, phase 0..1, linearly interpolated. */
export function readFrame(frames, f, k, phase) {
  const t = frames[f][k];
  const x = phase * TABLE;
  const i = x | 0;
  const a = t[i];
  return a + (t[i + 1] - a) * (x - i);
}
