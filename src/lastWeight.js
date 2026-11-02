// What a logger's weight box opens on: the weight the member LAST ENTERED for
// this lift, done this way. Pure, so it runs under plain node.
//
// Order of preference, and why:
//   1. the latest set of this lift in the session being logged — they are
//      mid-lift and the next set is nearly always the same weight;
//   2. the last set of the last FINISHED session (the history endpoint, same
//      one-arm / one-leg marker — a one-arm row is not last week's two-arm row);
//   3. the routine's target, only when neither exists.
// It is a default the member can overwrite, never a suggestion: every number
// here is a row they logged or a target they set. Nothing is invented, so a lift
// with no history opens blank (the substance rule — see the history endpoint).
//
// The LATEST set decides, even if it had no weight: bodyweight after a loaded
// set is a bodyweight set, and filling the loaded number back in would log the
// wrong thing without anyone typing it.

const same = (a, b) => (a || "") === (b || "");

// `sets` oldest -> newest. Returns kg or null.
export function lastWeightKg({ sets = [], side = "", last = null, plannedKg = null } = {}) {
  const mine = sets.filter((s) => same(s.one_sided, side));
  if (mine.length) return mine[mine.length - 1].weight_kg ?? null;
  const past = last?.sets || [];
  if (past.length) return past[past.length - 1].weight_kg ?? null;
  return plannedKg ?? null;
}

// Where the number came from, so the box can say so rather than hold a figure
// nobody can account for. "" when blank.
export function lastWeightSource({ sets = [], side = "", last = null, plannedKg = null } = {}) {
  if (sets.some((s) => same(s.one_sided, side))) return "set";
  if ((last?.sets || []).length) return "history";
  return plannedKg != null ? "plan" : "";
}

// Live sessions append, but a drag reorders `sets`; "latest" there is the
// newest row, not the last position.
export const byEntered = (sets) => sets.slice().sort((a, b) => (a.id ?? Infinity) - (b.id ?? Infinity));

// A typed value only holds while nothing it was typed against has changed — the
// lift, the side, or how many sets are logged. Logging a set therefore hands the
// box back to the auto-fill (which is that set's weight) with no effect to run
// and no stale copy of the old number.
export const typedKey = (...parts) => parts.join(":");
export function boxValue(typed, key, autoKg, fromKg, unit) {
  if (typed && typed.key === key) return { value: typed.v, auto: false };
  return { value: autoKg == null ? "" : String(fromKg(autoKg, unit)), auto: autoKg != null };
}
