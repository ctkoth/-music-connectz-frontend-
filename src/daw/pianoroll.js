// The piano roll's edits — pure, tested. A note is [pitch, startBeat, lengthBeats, velocity], the
// same shape midi.js reads, so an imported part and a drawn one are the same thing.

export const GRIDS = [["1/16", 0.25], ["1/8", 0.5], ["1/4", 1], ["1/2", 2], ["1 bar", 4]];
export const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const pitchName = (p) => `${NAMES[((p % 12) + 12) % 12]}${Math.floor(p / 12) - 1}`;
export const isBlack = (p) => [1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12);
const clampPitch = (p) => Math.max(0, Math.min(127, Math.round(p)));
const sortNotes = (ns) => [...ns].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

/** The note covering (pitch, beat), or -1. */
export function noteAt(notes, pitch, beat) {
  return notes.findIndex(([p, s, l]) => p === pitch && beat >= s - 1e-9 && beat < s + l - 1e-9);
}

/** Click on the roll: remove the note under it, or add one of `len` snapped to `grid`. */
export function toggleAt(notes, pitch, beat, { grid = 0.25, len = 0.25, vel = 100 } = {}) {
  const i = noteAt(notes, pitch, beat);
  if (i >= 0) return notes.filter((_, k) => k !== i);
  const start = Math.max(0, Math.floor(beat / grid + 1e-9) * grid);
  return sortNotes([...notes, [clampPitch(pitch), round(start), round(len), vel]]);
}

/** Change one note's length, at least one grid step. */
export const resize = (notes, i, len, grid = 0.25) =>
  notes.map((n, k) => (k === i ? [n[0], n[1], round(Math.max(grid, Math.round(len / grid) * grid)), n[3]] : n));

/** Snap every start (and length) to the grid. */
export const quantize = (notes, grid = 0.25) =>
  sortNotes(notes.map(([p, s, l, v]) => [p, round(Math.round(s / grid) * grid), round(Math.max(grid, Math.round(l / grid) * grid)), v]));

export const transpose = (notes, semis) => notes.map(([p, s, l, v]) => [clampPitch(p + semis), s, l, v]);
export const setVelocity = (notes, v) => notes.map(([p, s, l]) => [p, s, l, Math.max(1, Math.min(127, Math.round(v)))]);

/** How many bars the roll should show: the part's own length, at least `min`. */
export const barsFor = (notes, min = 4) => Math.max(min, Math.ceil(notes.reduce((m, n) => Math.max(m, n[1] + n[2]), 0) / 4));

/** A pitch range to show: the part's notes with some room, at least two octaves. */
export function rangeFor(notes) {
  if (!notes.length) return [48, 83];
  const lo = Math.min(...notes.map((n) => n[0])), hi = Math.max(...notes.map((n) => n[0]));
  const mid = Math.round((lo + hi) / 2);
  const half = Math.max(12, Math.ceil((hi - lo) / 2) + 4);
  return [clampPitch(mid - half), clampPitch(mid + half)];
}

const round = (x) => Math.round(x * 1000) / 1000;
