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
