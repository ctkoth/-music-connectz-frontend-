// The Songwriter — Intuition's way to a chord bed without playing an instrument.
//
// Pick a key, a progression from the library and which instruments are stacked
// on it (pad, keys, bass, arp); this works out the notes and synthesises them.
// The theory (everything above `renderProgression`) is pure and tested; the
// synth needs an OfflineAudioContext, so it only runs in a browser.
import { noteHz } from "./rack.js";

export const KEYS = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
export const MODES = { major: { label: "Major", steps: MAJOR }, minor: { label: "Minor", steps: MINOR } };

// Degrees are 1-7 within the key's own scale, so one progression works in every key and both modes.
export const PROGRESSIONS = {
  pop: { label: "Pop anthem", degrees: [1, 5, 6, 4] },
  ballad: { label: "Ballad", degrees: [6, 4, 1, 5] },
  doowop: { label: "Doo-wop", degrees: [1, 6, 4, 5] },
  blues: { label: "Three-chord", degrees: [1, 4, 5, 4] },
  soul: { label: "Soul turnaround", degrees: [2, 5, 1, 6] },
  rise: { label: "Slow rise", degrees: [1, 3, 4, 5] },
  dark: { label: "Dark loop", degrees: [1, 6, 3, 7] },
  canon: { label: "Canon", degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
};

export const LAYERS = {
  pad: { label: "Pad", what: "held chords, soft" },
  keys: { label: "Keys", what: "the chord struck on each beat" },
  bass: { label: "Bass", what: "the root, an octave down" },
  arp: { label: "Arp", what: "the chord's notes one at a time" },
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const QUALITY = { "4,3": "", "3,4": "m", "3,3": "°", "4,4": "+" };

/** The triad on a scale degree: MIDI notes around middle C, its name and its roman numeral. */
export function chordAt(keyIndex, mode, degree) {
  const steps = (MODES[mode] || MODES.major).steps;
  const d = (((degree - 1) % 7) + 7) % 7;
  const tone = (i) => steps[(d + i) % 7] + 12 * Math.floor((d + i) / 7);
  const semis = [tone(0), tone(2), tone(4)];
  const q = QUALITY[`${semis[1] - semis[0]},${semis[2] - semis[1]}`] ?? "";
  const root = 48 + (((keyIndex % 12) + 12) % 12) + semis[0];
  const minorish = q === "m" || q === "°";
  return {
    notes: semis.map((s) => 48 + (((keyIndex % 12) + 12) % 12) + s),
    root,
    name: `${KEYS[root % 12]}${q}`,
    roman: `${minorish ? ROMAN[d].toLowerCase() : ROMAN[d]}${q === "°" ? "°" : q === "+" ? "+" : ""}`,
  };
}

/** Every chord of a progression in a key, in order. */
export function progressionChords(keyIndex, mode, progKey) {
  const p = PROGRESSIONS[progKey] || PROGRESSIONS.pop;
  return p.degrees.map((deg) => chordAt(keyIndex, mode, deg));
}

/** Seconds for the whole progression played `times` through, `beatsPerChord` beats a chord. */
export const progressionSeconds = (count, { bpm, beatsPerChord = 4, times = 1 }) => (60 / bpm) * beatsPerChord * count * times;

/** Whatever was stored, as settings the screen can use. */
export function cleanSong(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const layers = {};
  for (const k of Object.keys(LAYERS)) layers[k] = r.layers && typeof r.layers === "object" ? !!r.layers[k] : k !== "arp";
  if (!Object.values(layers).some(Boolean)) layers.pad = true;
  const key = Number.isInteger(r.key) && r.key >= 0 && r.key < 12 ? r.key : 0;
  return {
    key, mode: MODES[r.mode] ? r.mode : "major", prog: PROGRESSIONS[r.prog] ? r.prog : "pop",
    beats: [2, 4, 8].includes(r.beats) ? r.beats : 4, layers,
  };
}

// ---- the synth (browser only) ----

function tone(ctx, out, { hz, type, t, dur, peak, attack, release, cutoff }) {
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = hz;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, Math.max(t + attack, t + dur - release));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (cutoff) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = cutoff;
    o.connect(f); node = f;
  }
  node.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

/**
 * Render the progression `times` through as one AudioBuffer, exactly that long,
 * so it loops cleanly and lines up bar-for-bar on the timeline.
 */
export async function renderProgression(chords, { bpm, beatsPerChord = 4, times = 1, layers, rate = 44100 }) {
  const beat = 60 / bpm;
  const each = beat * beatsPerChord;
  const total = each * chords.length * times;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * rate), rate);
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(ctx.destination);
  const on = layers || { pad: true };
  for (let n = 0; n < chords.length * times; n++) {
    const c = chords[n % chords.length];
    const t = n * each;
    if (on.pad) for (const m of c.notes) tone(ctx, out, { hz: noteHz(m + 12), type: "sawtooth", t, dur: each, peak: 0.07, attack: 0.25, release: 0.3, cutoff: 1400 });
    if (on.keys) for (let b = 0; b < beatsPerChord; b++) for (const m of c.notes) tone(ctx, out, { hz: noteHz(m + 12), type: "triangle", t: t + b * beat, dur: beat * 0.9, peak: 0.1, attack: 0.005, release: beat * 0.7 });
    if (on.bass) for (let b = 0; b < beatsPerChord; b += 2) tone(ctx, out, { hz: noteHz(c.root - 12), type: "sine", t: t + b * beat, dur: Math.min(beat * 2, each - b * beat) * 0.95, peak: 0.3, attack: 0.01, release: 0.08 });
    if (on.arp) {
      const seq = [c.notes[0], c.notes[1], c.notes[2], c.notes[1]];
      for (let s = 0; s < beatsPerChord * 2; s++) tone(ctx, out, { hz: noteHz(seq[s % 4] + 24), type: "square", t: t + s * beat / 2, dur: beat * 0.45, peak: 0.05, attack: 0.004, release: beat * 0.3, cutoff: 3000 });
    }
  }
  return ctx.startRendering();
}

/** BPM from the times (ms) of a member's taps: the median gap, so one late tap does not move it. Null under 3 taps. */
export function tapTempo(times) {
  if (!Array.isArray(times) || times.length < 3) return null;
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g > 0).sort((a, b) => a - b);
  if (gaps.length < 2) return null;
  const mid = gaps.length % 2 ? gaps[(gaps.length - 1) / 2] : (gaps[gaps.length / 2 - 1] + gaps[gaps.length / 2]) / 2;
  return Math.min(300, Math.max(30, Math.round(60000 / mid)));
}
