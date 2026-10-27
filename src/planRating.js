// The Plan rating, worded. Pure, so it runs under plain node. The server does every judgement
// (`routine_plan.py`: five checks, the Planner's fix, and which check moved a score); this only turns its
// answer into words and decides which checks the Planner can fix.
//
// The Plan is NOT the Thorough rating. Thorough comes from sessions the member trained; Plan is the routine as
// written against its goal's prescription. A routine nobody has trained is "not thorough yet" and can still have a
// Plan, and the screen never lets one stand in for the other (the caveat is the server's and travels with it).

/** Checks the Planner can fix itself: order, reps, sets. Access and repeats are the member's to resolve. */
export const FIXABLE = new Set(["order", "reps", "sets"]);

export const failing = (plan) => (plan?.checks || []).filter((c) => c.ok === false);
export const canFix = (plan) => failing(plan).some((c) => FIXABLE.has(c.key));
export const stillYours = (plan) => failing(plan).filter((c) => !FIXABLE.has(c.key));

/** "4 of 5 checks · Muscle gain" — what the number is out of, and against what. */
export function planDetail(plan) {
  if (!plan) return "";
  if (plan.score == null) return plan.note || "Nothing to check yet.";
  return `${plan.passed} of ${plan.applicable} checks · ${plan.goal || "no goal set"}`;
}

export const mark = (ok) => (ok === true ? "✓" : ok === false ? "✗" : "–");

/** "7.5 → 10" for a change, or "stays 10" when the score did not move. */
export function moveText(cmp) {
  if (!cmp || cmp.before == null || cmp.after == null) return "";
  const f = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return cmp.before === cmp.after ? `stays ${f(cmp.after)}` : `${f(cmp.before)} → ${f(cmp.after)}`;
}

/** One line per check that moved, saying which way and why: "Big lifts first: ✗ → ✓ — Barbell Row (compound) comes after …". */
export function checkMoves(cmp) {
  return (cmp?.checks || []).map((c) => ({
    key: c.check,
    text: `${c.label}: ${mark(c.was)} → ${mark(c.now)}`,
    why: c.why,
  }));
}
