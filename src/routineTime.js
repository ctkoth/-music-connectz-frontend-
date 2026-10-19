// How long a routine will take, as an ESTIMATE the screen labels as one.
//
// Nothing here is measured. It is arithmetic over the routine's own sets and
// reps plus three stated assumptions, and the assumptions travel with the
// number (`routineTimeNote`) — a duration with no visible basis is a figure
// nobody can check, and people plan their evening around it. The rest between
// sets is the one input that is NOT ours: a goal carries its own
// `rest_seconds` from the server, and that is used when there is one.
export const REP_SECONDS = 3;       // one controlled rep
export const SETUP_SECONDS = 60;    // change the load, find the machine, get set
export const DEFAULT_REST_SECONDS = 90;

/** items: [{ sets, reps }] (strings are fine — the designer holds text boxes). */
export function estimateRoutineSeconds(items, restSeconds) {
  const rest = Number.isFinite(restSeconds) && restSeconds > 0 ? restSeconds : DEFAULT_REST_SECONDS;
  let total = 0;
  for (const it of items || []) {
    const sets = Math.max(0, Math.floor(Number(it?.sets)) || 0);
    const reps = Math.max(0, Math.floor(Number(it?.reps)) || 0);
    if (!sets || !reps) continue;
    total += SETUP_SECONDS + sets * reps * REP_SECONDS + (sets - 1) * rest;
  }
  return total;
}

/** "≈ 45 min" — rounded to 5 so the figure is not claiming more than it knows. */
export function fmtEstimate(seconds) {
  if (!seconds) return "";
  const min = Math.max(5, Math.round(seconds / 300) * 5);
  return min >= 60 ? `≈ ${Math.floor(min / 60)} h ${min % 60 ? `${min % 60} min` : ""}`.trim() : `≈ ${min} min`;
}

export function routineTimeNote(restSeconds) {
  const rest = Number.isFinite(restSeconds) && restSeconds > 0 ? restSeconds : DEFAULT_REST_SECONDS;
  return `Estimate: ${REP_SECONDS} s a rep, ${rest} s rest between sets, ${SETUP_SECONDS / 60} min to set up each exercise.`;
}
