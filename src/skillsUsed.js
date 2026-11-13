// Pure decisions for the "Skills used on this" picker, kept out of the component so they
// run under plain node (and import nothing that reads import.meta.env).
//
// The list itself, every rating in it and every link to the work behind it come from
// GET /api/economy/ratez/skills/. Nothing here computes a rating or decides which skills a
// member has — it only words what the server sent.

/** Every skill across every persona, flat, in the server's order. */
export const flatSkills = (data) =>
  (data?.personas || []).flatMap((p) => p.skills || []);

/** "median of 12 ratings" / "1 rating" — or the honest absence. Never a 0. */
export function ratingDetail(s) {
  if (!s || s.rating == null) return "not rated yet";
  const n = s.count || 0;
  const base = `median of ${n} rating${n === 1 ? "" : "s"}`;
  return s.coach ? `${base}, with your AI coach's takes` : base;
}

/** The work a rating came from, and how many more pieces the server left off the list. */
export function workShown(s) {
  const shown = (s?.work || []).filter((w) => w && w.id != null);
  const total = Math.max(s?.work_total || 0, shown.length);
  return { shown, more: Math.max(0, total - shown.length) };
}

/** One piece of work as a line: "Midnight — 8/10 from 3". */
export function workLine(w) {
  const n = w.count || 0;
  const score = w.rating == null ? "" : ` — ${Number.isInteger(w.rating) ? w.rating : Number(w.rating).toFixed(1)}/10`;
  return `${w.title || `Post ${w.id}`}${score}${n > 1 ? ` from ${n}` : ""}`;
}
