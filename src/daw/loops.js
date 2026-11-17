// Witchcraft's loop library — ready-made loops at the session's tempo and key, made on the device
// from the engine's own generators (the drummer, the chord writer). Pure list here, tested; the
// rendering is the generators', so a loop is no download and no storage until it is on a track.
import { STYLES } from "./drummer.js";
import { PROGRESSIONS } from "./chords.js";

/** Every loop, by family, in LADDER order within each family (a tier may use the first N of each). */
export function loopCatalogue() {
  const drums = Object.entries(STYLES).map(([k, s]) => ({ id: `drums:${k}`, family: "Drums", label: `${s.label} beat`, kind: "drums", style: k }));
  const chords = Object.entries(PROGRESSIONS).map(([k, p]) => ({ id: `pad:${k}`, family: "Chords", label: `${p.label} — pad`, kind: "chords", prog: k, layers: { pad: true } }));
  const keys = Object.entries(PROGRESSIONS).map(([k, p]) => ({ id: `keys:${k}`, family: "Keys", label: `${p.label} — keys`, kind: "chords", prog: k, layers: { keys: true } }));
  const bass = Object.entries(PROGRESSIONS).map(([k, p]) => ({ id: `bass:${k}`, family: "Bass", label: `${p.label} — bass`, kind: "chords", prog: k, layers: { bass: true } }));
  const arps = Object.entries(PROGRESSIONS).map(([k, p]) => ({ id: `arp:${k}`, family: "Arps", label: `${p.label} — arp`, kind: "chords", prog: k, layers: { arp: true } }));
  return [...drums, ...chords, ...keys, ...bass, ...arps];
}

/** The loops a tier may use: the first `cap` of each family (null = all). */
export function allowedLoops(cap) {
  const seen = {};
  return new Set(loopCatalogue().filter((l) => {
    seen[l.family] = (seen[l.family] || 0) + 1;
    return cap == null || seen[l.family] <= cap;
  }).map((l) => l.id));
}
