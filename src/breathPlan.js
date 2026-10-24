// Turns a BreathZ pattern into the seconds a pacer runs — pure, so it can be tested.
//
// A step's length is in beats. For most patterns a beat is a second; for a
// `bpm_based` pattern (rap breathes on the bar) a beat is one beat at the member's
// own tempo, so the breath is measured in the same unit as the verse.

/** Seconds per beat for a pattern at `bpm`. */
export const beatSeconds = (pattern, bpm) =>
  pattern?.bpm_based ? 60 / Math.max(40, Math.min(220, Number(bpm) || pattern.bpm_default || 90)) : 1;

/** One round as [{phase, seconds}]. */
export function roundOf(pattern, bpm) {
  const b = beatSeconds(pattern, bpm);
  return (pattern?.steps || []).map((s) => ({ phase: s.phase, seconds: +(s.beats * b).toFixed(2) }));
}

/** The whole session as a flat list of {phase, seconds, round}. */
export function planFor(pattern, bpm) {
  const out = [];
  for (let r = 1; r <= (pattern?.rounds || 0); r++) {
    for (const step of roundOf(pattern, bpm)) out.push({ ...step, round: r });
  }
  return out;
}

export const totalSeconds = (plan) => Math.round(plan.reduce((n, s) => n + s.seconds, 0));

export const PHASE_WORD = { in: "Breathe in", hold: "Hold", out: "Let it out" };
