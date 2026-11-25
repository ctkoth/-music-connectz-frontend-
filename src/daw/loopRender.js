// A loop from the library, rendered at the session's tempo and key: what the Loop Library's Send does, as a function the Studio
// Dragon browser can call the moment a loop is dropped on a track. Browser only (it renders audio); the choices it makes are the
// pure `keyOf` below, tested.
import { drumPart, styleSwing } from "./drummer.js";
import { renderBars } from "./rack.js";
import { KEYS, progressionChords, renderProgression } from "./chords.js";
import { loopCatalogue } from "./loops.js";

const FLAT = { "C#": 1, Db: 1, Eb: 3, "D#": 3, "F#": 6, Gb: 6, Ab: 8, "G#": 8, Bb: 10, "A#": 10 };
/** { key: 0..11 into chords.js KEYS, mode: "major"|"minor" } from a session key like "F# minor" or "Bb major"; A minor when unset. */
export function keyOf(sessionKey) {
  const m = /^([A-G][#b]?)\s+(major|minor)$/i.exec(String(sessionKey || "").trim());
  if (!m) return { key: 9, mode: "minor" };
  const note = m[1][0].toUpperCase() + m[1].slice(1);
  const natural = KEYS.findIndex((k) => k === note);
  return { key: natural >= 0 ? natural : FLAT[note] ?? 9, mode: m[2].toLowerCase() };
}
export const loopById = (id) => loopCatalogue().find((l) => l.id === id) || null;

export async function renderLoop(loop, { bpm, sessionKey, bars = 8, rate }) {
  const { key, mode } = keyOf(sessionKey);
  if (loop.kind === "drums") return renderBars(drumPart(loop.style, { busy: 0.5, hard: 0.6, bars, fillEvery: 4 }), { bpm, swing: styleSwing(loop.style), rate });
  return renderProgression(progressionChords(key, mode, loop.prog), { bpm, beatsPerChord: 4, times: Math.max(1, Math.round(bars / 4)), layers: loop.layers, rate });
}
export const loopFileName = (loop, sessionKey, bars) => {
  const { key, mode } = keyOf(sessionKey);
  return `${loop.label}${loop.kind === "drums" ? "" : ` in ${KEYS[key]} ${mode}`} ×${bars}.wav`;
};
