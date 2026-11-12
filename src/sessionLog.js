// SessionZ's list logic, kept pure so it runs under plain node. The server does the work —
// `GET bodiez/sessions/log/` pages, searches, bounds by date, totals and flags what needs a second look —
// and this only builds the request and keeps the list straight as pages arrive.

export const PAGE = 25;
export const PAGE_MAX = 100;                 // the server's own ceiling

/** The query string for one page; blank filters are left out rather than sent empty. */
export function logQuery({ q = "", since = "", until = "", check = false, limit = PAGE, offset = 0, id = null } = {}) {
  const p = new URLSearchParams();
  p.set("limit", String(Math.max(1, Math.min(limit, PAGE_MAX))));
  if (offset > 0) p.set("offset", String(offset));
  if (id != null) p.set("id", String(id));
  if (String(q).trim()) p.set("q", String(q).trim());
  if (since) p.set("since", since);
  if (until) p.set("until", until);
  if (check) p.set("check", "1");
  return `?${p.toString()}`;
}

/** When a session was COMPLETED. A finished row always has `ended_at`; `started_at` is only the fallback for a
 *  row that somehow lacks one. A workout begun Monday and finished Friday is a Friday workout. */
export function completedAt(row) {
  const t = new Date(row?.ended_at || row?.started_at || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Newest completed first; the id breaks a tie the same way the server does, so the order never flickers. */
export function byCompleted(rows) {
  return [...rows].sort((a, b) => completedAt(b) - completedAt(a) || b.id - a.id);
}

/** "Thu, Nov 12, 2026" — the day it was completed, with the year, so every row says its date outright. */
export function completedDate(row, locale) {
  const t = completedAt(row);
  if (!t) return "";
  return new Date(t).toLocaleDateString(locale, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

/** Append a page without repeating a row the list already holds (a refresh and a "more" can overlap).
 *  The result is always newest-completed first, whatever order the pages arrived in. */
export function mergeRows(existing, incoming) {
  const seen = new Set(existing.map((r) => r.id));
  return byCompleted([...existing, ...incoming.filter((r) => !seen.has(r.id))]);
}

/** Is anything narrowing the list? */
export const filtersActive = ({ q, since, until, check }) => !!(String(q || "").trim() || since || until || check);

/** The same filters as one comparable string — a change means "start from page one". */
export const filterKey = (f) => JSON.stringify([String(f.q || "").trim(), f.since || "", f.until || "", !!f.check]);

/** How many rows a refresh should re-ask for so a member who has paged down is not sent back to the top. */
export const refreshLimit = (loaded) => Math.max(PAGE, Math.min(loaded || 0, PAGE_MAX));

/** "1:02:10" / "45:00", or "" when the length was not measured (typed in afterwards). Never 0. */
export function durationText(seconds, clock) {
  return seconds == null ? "" : clock(seconds);
}

/** "42 sessions · 610 sets · 18,400 kg lifted" — what the member has logged, said once at the top. */
export function totalsLine(totals, fmt) {
  if (!totals) return "";
  const n = totals.sessions;
  return `${n.toLocaleString()} session${n === 1 ? "" : "s"} · ${totals.sets.toLocaleString()} sets · ${fmt(totals.volume_kg)} lifted`;
}
