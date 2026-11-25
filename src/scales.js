// ScaleZ: the notes of a key, so a member can see and hear what belongs in it. Pure and tested; the screen
// only draws it. Everything is spelled with sharps, the way ChordZ and TunerZ already spell notes.
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Semitone steps from the root. Each is a scale a musician names, none invented here.
export const SCALES = {
  major: { name: "Major", steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: "Natural minor", steps: [0, 2, 3, 5, 7, 8, 10] },
  majorPent: { name: "Major pentatonic", steps: [0, 2, 4, 7, 9] },
  minorPent: { name: "Minor pentatonic", steps: [0, 3, 5, 7, 10] },
  blues: { name: "Blues", steps: [0, 3, 5, 6, 7, 10] },
  dorian: { name: "Dorian", steps: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { name: "Mixolydian", steps: [0, 2, 4, 5, 7, 9, 10] },
};

/** The note names of `scale` from `root` ("C" .. "B"), in order. [] for an unknown root or scale. */
export function scaleNotes(root, scale) {
  const i = NOTE_NAMES.indexOf(root);
  const s = SCALES[scale];
  if (i < 0 || !s) return [];
  return s.steps.map((st) => NOTE_NAMES[(i + st) % 12]);
}

/** Frequency of a note name in an octave (A4 = 440). */
export function noteFreq(name, octave = 4) {
  const i = NOTE_NAMES.indexOf(name);
  if (i < 0) return null;
  return 440 * Math.pow(2, (i - 9 + (octave - 4) * 12) / 12);
}

// The chords that belong to a seven-note key, by degree: triads built by stacking thirds inside the scale.
// Only major and natural minor are offered; a pentatonic or blues scale has no tidy seven-chord set.
const TRIAD = { "4,7": "", "3,7": "m", "3,6": "°" };
export function diatonicChords(root, scale) {
  const s = SCALES[scale];
  if (!s || s.steps.length !== 7 || !["major", "minor"].includes(scale)) return [];
  const idx = NOTE_NAMES.indexOf(root);
  return s.steps.map((st, d) => {
    const third = (s.steps[(d + 2) % 7] - st + 12) % 12;
    const fifth = (s.steps[(d + 4) % 7] - st + 12) % 12;
    return NOTE_NAMES[(idx + st) % 12] + (TRIAD[`${third},${fifth}`] ?? "");
  });
}
