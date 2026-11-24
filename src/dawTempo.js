// The tempo of the DAW session that is open, shared with the metronome beside it. Nothing is sent anywhere: a
// MetZ pane opened next to Arsenal reads it so the click it plays is the project's, and follows when it changes.
let bpm = null;
const subs = new Set();
export const getProjectBpm = () => bpm;
export function setProjectBpm(v) {
  const n = Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null;
  if (n === bpm) return;
  bpm = n;
  subs.forEach((f) => f(bpm));
}
export function onProjectBpm(fn) { subs.add(fn); return () => subs.delete(fn); }
