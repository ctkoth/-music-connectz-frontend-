// How a finished BodieZ session compares with the one before it. Pure, so it runs under
// plain node. The server does the arithmetic (`vs_last` on the session summary); this only
// turns it into words and a direction, and decides nothing the server did not already say.
//
// "Better" is not claimed. More weight moved is MORE WEIGHT MOVED — a lighter session can be
// a deload or a recovery day — so the arrow shows direction and the colour is neutral for a
// drop. Only a record gets the trophy.

/** "up" | "down" | "same" | null (nothing to compare to). */
export function direction(deltaKg) {
  if (deltaKg == null) return null;
  if (Math.abs(deltaKg) < 0.005) return "same";
  return deltaKg > 0 ? "up" : "down";
}

const ARROW = { up: "▲", down: "▼", same: "=" };

/** "▲ 100 kg (+25%)" — `fmt` renders kg in the member's unit; the percent is the server's. */
export function changeText(deltaKg, pct, fmt) {
  const d = direction(deltaKg);
  if (!d) return "";
  if (d === "same") return `${ARROW.same} same as last time`;
  const abs = fmt(Math.abs(deltaKg));
  const p = pct == null ? "" : ` (${pct > 0 ? "+" : "−"}${Math.abs(pct)}%)`;
  return `${ARROW[d]} ${d === "up" ? "+" : "−"}${abs}${p}`;
}

/** "last Push day" / "your last session" — what the comparison is against, said plainly. */
export function againstWhat(vs) {
  if (!vs) return "";
  const when = new Date(vs.started_at).toLocaleDateString();
  return vs.basis === "routine" && vs.routine_title
    ? `last ${vs.routine_title} (${when})`
    : `your last session (${when})`;
}

/** The per-exercise change line, or "" when the lift is new or the change is not a number. */
export function liftChange(e, fmt) {
  const v = e?.vs_last;
  if (!v) return "";
  if (v.top_delta_kg != null && Math.abs(v.top_delta_kg) >= 0.005) {
    return `top ${v.top_delta_kg > 0 ? "▲ +" : "▼ −"}${fmt(Math.abs(v.top_delta_kg))}`;
  }
  if (Math.abs(v.volume_delta_kg) >= 0.005) {
    return `volume ${v.volume_delta_kg > 0 ? "▲ +" : "▼ −"}${fmt(Math.abs(v.volume_delta_kg))}`;
  }
  return "same as last time";
}

/** Reps/sets change for a session with no weight to compare (all bodyweight). */
export function repsChangeText(vs) {
  if (!vs || vs.reps_delta == null || vs.reps_delta === 0) return "";
  return `${vs.reps_delta > 0 ? "▲ +" : "▼ −"}${Math.abs(vs.reps_delta)} reps`;
}

// ---- The end-of-session report -------------------------------------------------------------------------------------
// Facts from the logged sets, worded. "Done" is EFFORT — sets done on the routine's lifts over the sets it planned — and is
// never called a rating or a score of skill (CLAUDE.md: XP and badges may reward effort; ratings and skill levels may not). The
// server computes every figure (`session_summary().report`); this only words them and decides what is worth saying.

/** "Done 75% of the plan — 6 of 8 sets · 2 of 2 lifts · +1 extra set" or the custom-session line. */
export function doneLine(report) {
  if (!report) return "";
  if (report.completion_pct == null) {
    return `Custom session — no plan to complete. ${report.sets_done} set${report.sets_done === 1 ? "" : "s"} logged.`;
  }
  const extra = report.extra_sets ? ` · +${report.extra_sets} extra set${report.extra_sets === 1 ? "" : "s"}` : "";
  return `Done ${report.completion_pct}% of the plan — ${report.sets_completed} of ${report.sets_planned} sets · ${report.lifts_done} of ${report.lifts_planned} lifts${extra}`;
}

/** How that compares with last time, or "" when there is nothing to compare: "last time 50% (+25 points)". */
export function doneVsLast(vs) {
  const then = vs?.report?.completion_pct;
  if (then == null) return "";
  const d = vs.completion_delta;
  if (d == null) return `last time ${then}%`;
  return `last time ${then}% (${d === 0 ? "same" : `${d > 0 ? "+" : "−"}${Math.abs(d)} points`})`;
}

/** "Average rest 1:20 over 5 sets — Muscle gain's target is 1:15", or "" when no rest was measured (a typed-in workout has none). */
export function restLine(report, clock) {
  if (!report || report.avg_rest_seconds == null) return "";
  const t = report.rest_target_seconds != null ? ` — the goal's target is ${clock(report.rest_target_seconds)}` : "";
  return `Average rest ${clock(report.avg_rest_seconds)} over ${report.rest_sets} set${report.rest_sets === 1 ? "" : "s"}${t}`;
}

/** The sentence for a routine edited since the session it is being compared with. */
export const editedNote = (vs) => (vs?.routine_changed
  ? "This routine was edited since last time, so its lifts and sets may not be the ones you compared against." : "");
