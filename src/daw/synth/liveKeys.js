// Playing the synth from a keyboard: the computer's keys as a piano, and MIDI messages from a real one. Pure and tested.

// Home row is the white keys, the row above is the black keys, like a tracker or a DAW's "musical typing".
export const KEY_OFFSETS = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ";": 16 };
export const OCTAVE_KEYS = { z: -12, x: 12 };
export const BASE_MIN = 12, BASE_MAX = 84, BASE_DEFAULT = 48;       // the pitch the A key plays: C1 .. C6, starting at C3
export const clampBase = (b) => Math.min(BASE_MAX, Math.max(BASE_MIN, b));

/** The note a computer key plays at this base, or null. Keys with modifiers belong to the app (Ctrl+Z is undo), not to the synth. */
export function pitchForKey(e, base) {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const off = KEY_OFFSETS[String(e.key).toLowerCase()];
  if (off === undefined) return null;
  const p = base + off;
  return p >= 0 && p <= 127 ? p : null;
}
/** A decoded MIDI message: { type: "on" | "off" | "panic", pitch, vel } or null for anything the synth does not use. */
export function parseMidi(data) {
  if (!data || data.length < 2) return null;
  const status = data[0] & 0xf0;
  if (status === 0x90 && data[2] > 0) return { type: "on", pitch: data[1], vel: data[2] };
  if (status === 0x80 || (status === 0x90 && data[2] === 0)) return { type: "off", pitch: data[1], vel: 0 };
  if (status === 0xb0 && (data[1] === 123 || data[1] === 120)) return { type: "panic" };     // all notes off / all sound off
  return null;
}
const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
export const noteName = (p) => `${NAMES[p % 12]}${Math.floor(p / 12) - 1}`;
export const isBlack = (p) => [1, 3, 6, 8, 10].includes(p % 12);

/** The on-screen keyboard's layout for `count` keys from `base`: each key with its place along the white keys, 0..1. */
export function layout(base, count = 25) {
  const keys = [];
  let whites = 0;
  for (let i = 0; i < count; i++) {
    const pitch = base + i;
    if (isBlack(pitch)) keys.push({ pitch, black: true, at: whites });            // sits on the line after the last white key
    else { keys.push({ pitch, black: false, at: whites }); whites++; }
  }
  return { keys, whites };
}
