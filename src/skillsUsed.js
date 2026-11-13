// Pure decisions for the "Skills used on this" picker, kept out of the component so they
// run under plain node (and import nothing that reads import.meta.env).
//
import { skillDuration } from "./personaSkills.js";

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

/** Experience, as the member declared it: when they learned the skill and how long that is from
 *  today. Undated says so rather than 0. The length is time SERVED, from the stints the server
 *  summed, so a stint the member ended is not counted as practice. Never a rating, never inferred.
 *
 *  Precision follows what a member can honestly know. Somebody who started rapping "at 16" knows the
 *  year, not the month or the day, so from `OLD_YEARS` up it says years only ("Learned 2012 · 13
 *  years"). A month or a day is claimed only for a young skill, where the member really does know it
 *  ("Learned Mar 2025 · 8 months", "9 days"). */
export const OLD_YEARS = 2;
export function experienceLine(s) {
  const none = "Learned: no start date yet";
  if (!year(s?.learned)) return none;
  const years = s.years;
  if (years == null) return none;
  // Any year-only date (the start, or a stop) makes the length an estimate: say "about", never a month or a day.
  const yearStart = s.learned_precision === "year";
  const approx = yearStart || !!s.approximate;
  const old = years >= OLD_YEARS;
  const yearsWord = approx && years < 1 ? "less than a year" : `${approx ? "about " : ""}${years} year${years === 1 ? "" : "s"}`;
  const length = approx || old ? yearsWord : skillDuration({ periods: s.periods || [] });
  if (!length) return none;
  const learned = yearStart || old ? year(s.learned) : monthYear(s.learned);
  const last = approx || old || s.last_played_precision === "year" ? year(s.last_played) : monthYear(s.last_played);
  const stopped = s.active === false && last ? ` · last practised ${last}` : "";
  return `Learned ${learned} · ${length}${stopped}`;
}
