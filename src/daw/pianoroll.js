// The piano roll's edits — pure, tested. A note is [pitch, startBeat, lengthBeats, velocity], the
// same shape midi.js reads, so an imported part and a drawn one are the same thing.

export const GRIDS = [["1/32", 0.125], ["1/16T", 1 / 6], ["1/16", 0.25], ["1/8T", 1 / 3], ["1/8", 0.5], ["1/4", 1], ["1/2", 2], ["1 bar", 4]];
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

/**
 * Quantize. `strength` (0..1) is how far each start moves toward its grid line: 1 snaps, 0.5 tightens a loose take and keeps
 * its feel. `swing` (0..1) delays every second grid slot (the off-beats) by up to a third of a step, 1 being a triplet feel.
 * `lengths` snaps lengths to the grid too; off keeps what was played. Two notes of one pitch that land on the same start become
 * one (the longer). Pure; the same notes and settings always give the same result.
 */
export function quantize(notes, grid = 0.25, { strength = 1, swing = 0, lengths = true } = {}) {
  const k = Math.min(1, Math.max(0, strength));
  const sw = Math.min(1, Math.max(0, swing));
  const out = new Map();
  for (const [p, s, l, v] of notes) {
    const slot = Math.round(s / grid);
    const target = slot * grid + (slot % 2 !== 0 ? sw * grid / 3 : 0);
    const start = Math.max(0, round(s + (target - s) * k));
    const len = lengths ? round(Math.max(grid, Math.round(l / grid) * grid)) : l;
    const key = `${p}:${start}`;
    const had = out.get(key);
    if (!had || len > had[2]) out.set(key, [p, start, len, v]);
  }
  return sortNotes([...out.values()]);
}

// ---- selection edits ------------------------------------------------------------------------------------------
// A selection is a Set of indexes into the notes array. Moves keep the array's order (so the indexes stay valid while a
// drag is in progress); `sortKeep` puts the notes in time order afterwards and carries the selection with them.
export function moveSelected(notes, sel, dBeat, dPitch) {
  const minStart = Math.min(...[...sel].map((i) => notes[i]?.[1] ?? Infinity));
  const dB = Number.isFinite(minStart) ? Math.max(dBeat, -minStart) : dBeat;                       // the group stops at the start of the part
  const ps = [...sel].map((i) => notes[i]?.[0]).filter((x) => x !== undefined);
  const dP = ps.length ? Math.max(-Math.min(...ps), Math.min(127 - Math.max(...ps), dPitch)) : 0;  // and at the ends of the keyboard
  return notes.map((n, i) => (sel.has(i) ? [clampPitch(n[0] + dP), round(Math.max(0, n[1] + dB)), n[2], n[3]] : n));
}
export function sortKeep(notes, sel) {
  const order = notes.map((n, i) => ({ n, i, s: sel.has(i) })).sort((a, b) => a.n[1] - b.n[1] || a.n[0] - b.n[0] || a.i - b.i);
  return { notes: order.map((o) => o.n), sel: new Set(order.flatMap((o, k) => (o.s ? [k] : []))) };
}
export const deleteSelected = (notes, sel) => notes.filter((_, i) => !sel.has(i));
export const setVelocitySelected = (notes, sel, v) => notes.map((n, i) => (sel.has(i) ? [n[0], n[1], n[2], Math.max(1, Math.min(127, Math.round(v)))] : n));
export const selectAll = (notes) => new Set(notes.map((_, i) => i));

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
