// The pure part of the portfolio editor: turning what a member pastes into link
// rows, and deciding how many of them fit. Nothing here decides what is allowed —
// the server owns the ceiling and the scheme list and refuses what it will not
// store; this only makes the common case (pasting a dozen URLs) not a chore, and
// tells the member what happened to each one. It runs under plain node, so it
// imports nothing that reads import.meta.env.
import { hostOf } from "./widgetz.js";

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** A URL as typed, with the scheme people leave off completed. "" if it is nothing. */
export function normalizeUrl(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  if (SCHEME.test(t)) return t;
  return `https://${t}`;
}

/** A first guess at a label, from the host. The member can change it. */
export function labelFor(url) {
  return hostOf(url) || "";
}

// What the server will keep, mirrored ONLY so the screen can say "not saved" before
// the request rather than after it. If this drifts the server still decides.
const KEPT = /^(https?:|mailto:)/i;

/**
 * Lines of pasted text -> rows. A line is a URL, or "Label | URL". Blank lines are
 * ignored; a line that is plainly not a link is returned in `invalid` so the member
 * is told it was skipped rather than finding it missing.
 */
export function parsePasted(text) {
  const rows = [];
  const invalid = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const bar = t.indexOf("|");
    const label = bar > 0 ? t.slice(0, bar).trim() : "";
    const url = normalizeUrl(bar > 0 ? t.slice(bar + 1) : t);
    const ok = KEPT.test(url) && (url.toLowerCase().startsWith("mailto:") || !!hostOf(url));
    if (!ok) { invalid.push(t); continue; }
    rows.push({ label: label || labelFor(url), url });
  }
  return { rows, invalid };
}

const key = (u) => String(u || "").trim().toLowerCase().replace(/\/+$/, "");

/**
 * Add `incoming` to `existing` without going past `limit`. Reports what happened
 * to every row that did not go in: duplicates (already on the list, or earlier in
 * this paste), and those the ceiling left out — in order, so the first links
 * pasted are the ones kept.
 */
export function planAdd(existing, incoming, limit) {
  const seen = new Set(existing.map((r) => key(r.url)));
  const room = Math.max(0, limit - existing.length);
  const added = [];
  const duplicates = [];
  const overLimit = [];
  for (const r of incoming) {
    const k = key(r.url);
    if (seen.has(k)) { duplicates.push(r); continue; }
    seen.add(k);
    if (added.length < room) added.push(r); else overLimit.push(r);
  }
  return { added, duplicates, overLimit, rows: [...existing, ...added] };
}

/** One sentence saying what a paste did, or "" when it did exactly what was asked. */
export function pasteSummary({ added, duplicates, overLimit }, invalid, limit) {
  const parts = [];
  parts.push(`${added.length} added`);
  if (duplicates.length) parts.push(`${duplicates.length} already on your list`);
  if (invalid.length) parts.push(`${invalid.length} not a link`);
  if (overLimit.length) parts.push(`${overLimit.length} left out — your list holds ${limit}`);
  return parts.join(" · ");
}

/** Move the row at `i` by `dir` (-1 up, +1 down). A moveRow off either end is no moveRow. */
export function moveRow(rows, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= rows.length) return rows;
  const next = rows.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
