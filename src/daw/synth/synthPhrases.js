// Short phrases to audition a patch with: a chord and a line in three registers, so a bass patch is heard as a bass.
// [pitch, startBeat, lengthBeats, velocity]. Pure data.
const chord = (root, len) => [0, 3, 7, 10].map((i) => [root + i, 0, len, 96]);
export const PHRASES = {
  low: { label: "Low (bass)", bpm: 100, notes: [[36, 0, 1.5, 110], [36, 2, 0.5, 100], [39, 3, 1, 100], [34, 4, 1.5, 110], [41, 6, 0.5, 100], [36, 7, 1, 100]] },
  mid: { label: "Mid (chords)", bpm: 100, notes: [...chord(48, 3.5), ...chord(46, 4).map(([p, , l, v]) => [p, 4, l, v])] },
  high: { label: "High (lead)", bpm: 100, notes: [[72, 0, 0.5, 100], [75, 0.5, 0.5, 90], [79, 1, 1, 105], [77, 2, 0.5, 95], [75, 2.5, 0.5, 90], [72, 3, 1, 100], [70, 4, 0.5, 100], [74, 4.5, 0.5, 90], [77, 5, 2, 105]] },
};
export const PHRASE_KEYS = Object.keys(PHRASES);
