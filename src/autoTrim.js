// Auto-trim (StatZ, or the daily sample): when a member logs a set on a different lift, any lift they started and
// left part-done has its target trimmed to the sets they did — 3/5 reads 3/3. Pure, so it is tested under node.
//
// Rules, each one a way it could get it wrong:
// - Never between the two lifts of a superset: alternating them is the point of a pair, not moving on.
// - Never over a target the member set by hand (`over` holds it and `auto` does not): their choice beats ours.
// - Never a lift not yet started (0 done): skipping a lift is not finishing it, and 0/0 would read as done.
// - A lift it trimmed that the member comes back to grows with them (4 done on a trimmed 3 reads 4/4).
// - Today only: the routine is never touched, and the end-of-session report still counts the routine's plan.

/** Are lifts a and b the two halves of one superset? Routine pairs share a `group`; session pairs are id pairs. */
export function partnered(a, b, pairs = []) {
  if (!a || !b) return false;
  if (a.group && a.group === b.group) return true;
  return (pairs || []).some((p) => Array.isArray(p) && p.includes(a.exercise_id) && p.includes(b.exercise_id));
}

/**
 * @param planned   the plan's rows: {orig_id, exercise_id, sets (current target), group, extra?}
 * @param doneBy    {exercise_id: sets done BEFORE this log}
 * @param loggedId  the lift a set was just logged on
 * @param over      {orig_id: target} today's targets
 * @param auto      [orig_id] the targets auto-trim set (the rest in `over` are the member's own)
 * @returns {over, auto, trimmed: [{name, sets}]}
 */
export function trimOnMove({ planned = [], doneBy = {}, loggedId, pairs = [], over = {}, auto = [] }) {
  const next = { ...over };
  const mine = new Set(auto);
  const trimmed = [];
  const logged = planned.find((p) => p.exercise_id === loggedId) || { exercise_id: loggedId };
  for (const p of planned) {
    if (p.extra) continue;
    const done = (doneBy[p.exercise_id] || 0) + (p.exercise_id === loggedId ? 1 : 0);
    if (p.exercise_id === loggedId) {
      if (mine.has(p.orig_id) && done > (next[p.orig_id] || 0)) next[p.orig_id] = done;
      continue;
    }
    if (partnered(p, logged, pairs)) continue;
    const target = p.sets || 3;
    const manual = p.orig_id in over && !mine.has(p.orig_id);
    if (manual || done <= 0 || done >= target) continue;
    next[p.orig_id] = done;
    mine.add(p.orig_id);
    trimmed.push({ name: p.name, sets: done });
  }
  return { over: next, auto: [...mine], trimmed };
}
