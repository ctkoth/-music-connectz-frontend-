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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2012-03-01" -> "Mar 2012". Anything that is not a date comes back empty. */
export function monthYear(iso) {
  const [y, m] = String(iso || "").split("-").map(Number);
  return y && m >= 1 && m <= 12 ? `${MONTHS[m - 1]} ${y}` : "";
}

const year = (iso) => (/^\d{4}/.test(String(iso || "")) ? String(iso).slice(0, 4) : "");

/** "2012-03-04" -> "Mar 4, 2012". Anything that is not a date comes back empty. */
export function fullDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m >= 1 && m <= 12 && d ? `${MONTHS[m - 1]} ${d}, ${y}` : "";
}

const DAY = 86400000;
const asUtc = (v) => {
  const [y, m, d] = String(v || "").split("-").map(Number);
  return y && m && d ? Date.UTC(y, m - 1, d) : null;
};

/** Experience in years with ONE decimal, so .5 reads as six months and nobody does the sum:
 *  "21.4". Time SERVED, summed over the stints the member declared (a stint they ended stops
 *  counting), never past today. null when undated — undated has no length, it is not 0. */
export function decimalYears(s, now = Date.now()) {
  const t = new Date(now);
  const today = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  let days = 0, counted = false;
  for (const p of s?.periods || []) {
    const a = asUtc(p?.start);
    if (a == null) continue;
    const b = Math.min(asUtc(p.end) ?? today, today);
    if (b < a) continue;
    days += (b - a) / DAY; counted = true;
  }
  if (!counted) return s?.years == null ? null : Number(s.years);
  return Math.round((days / 365.2425) * 10) / 10;
}

/** Experience, as the member declared it: the date (or just the year) they started, and how long
 *  that is in years with a decimal ("21.4 years"; .5 is six months). Undated says so rather than 0.
 *  The length is time SERVED from the stints, so a stint the member ended is not counted as
 *  practice. Never a rating, never inferred. A year-only start or stop makes the length an
 *  estimate, and it says "about" rather than claim a precision nobody gave. */
export function experienceLine(s, now = Date.now()) {
  const none = "Started: no start date yet";
  if (!year(s?.learned)) return none;
  const yrs = decimalYears(s, now);
  if (yrs == null) return none;
  const yearStart = s.learned_precision === "year";
  const approx = yearStart || !!s.approximate;
  const length = yrs < 0.1 ? "less than 0.1 years" : `${approx ? "about " : ""}${yrs.toFixed(1)} years`;
  const started = yearStart ? year(s.learned) : fullDate(s.learned);
  const lastIso = s.last_played;
  const last = s.last_played_precision === "year" ? year(lastIso) : fullDate(lastIso);
  const stopped = s.active === false && last ? ` · last practised ${last}` : "";
  return `Started ${started} · ${length} experience${stopped}`;
}
