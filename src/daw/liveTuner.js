// Live pitch for the DAW's tuner: one block of the mic in, the note and how many cents off it is out. Pure, so it
// runs under plain node. The pitch work is autotune.js's YIN detector — one detector, so the tuner and Autotune
// can never disagree about what note was sung.
import { detect } from "./autotune.js";
import { NAMES, keyFromChroma } from "../songKey.js";

/** The note nearest a frequency: { name, midi, cents }, cents positive when SHARP (tuning.js's convention). */
export function noteOf(hz) {
  if (!(hz > 0)) return null;
  const exact = 69 + 12 * Math.log2(hz / 440);
  const midi = Math.round(exact);
  return { name: `${NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`, pc: ((midi % 12) + 12) % 12, midi, cents: Math.round((exact - midi) * 100) };
}

/** The note in one block of samples (the median of its readings), or null for silence / no clear pitch. */
export function liveNote(block, rate) {
  const fs = detect([block], rate).map((p) => p.f).filter((f) => f > 0).sort((a, b) => a - b);
  if (fs.length < 2) return null;
  return noteOf(fs[Math.floor(fs.length / 2)]);
}

/** Add one heard note to a 12-bin pitch-class tally. Returns the same array. */
export function tally(hist, note, weight = 1) {
  if (note && Number.isFinite(note.pc)) hist[note.pc] += weight;
  return hist;
}

/** The key the tally points at, or null until enough has been heard for it to mean anything. */
export function keyOfTally(hist, minHeard = 12) {
  if (hist.reduce((s, v) => s + v, 0) < minHeard) return null;
  return keyFromChroma(hist);
}
