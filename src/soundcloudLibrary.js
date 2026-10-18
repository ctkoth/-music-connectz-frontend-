// Pure decisions for the SoundCloud library manager. No api.js / limits.js
// here (they read import.meta.env) so this runs under plain node.
//
// Nothing here has run against SoundCloud: the server mocks it in its tests.
// This file decides nothing about price, consent or dating; the server's
// preview says all three and the screen renders its sentences unreworded.

export const VISIBILITIES = ["public", "restricted", "private"];
export const LABEL = { public: "Public", restricted: "Restricted", private: "Private" };

export const toggleId = (sel, id) => {
  const next = new Set(sel);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
};

export const selectPage = (sel, rows) => new Set([...sel, ...rows.map((r) => r.id)]);
export const unselectPage = (sel, rows) => {
  const drop = new Set(rows.map((r) => r.id));
  return new Set([...sel].filter((id) => !drop.has(id)));
};
export const pageFullySelected = (sel, rows) => rows.length > 0 && rows.every((r) => sel.has(r.id));

/** Selection in list order, so the batch runs in the order it is read. */
export const orderedIds = (sel, order) => order.filter((id) => sel.has(id));

export const chunk = (list, n) => {
  const out = [];
  for (let i = 0; i < list.length; i += Math.max(1, n)) out.push(list.slice(i, i + n));
  return out;
};

/** Which tracks already sit at the chosen visibility (nothing to do). */
export const alreadyAt = (rows, sel, vis) => rows.filter((r) => sel.has(r.id) && r.visibility === vis).length;

/** The server's sentence, or "" until a preview exists. Never composed here:
 *  a second copy of the cost/consent wording is how two screens disagree. */
export const previewText = (pv) => (pv && pv.detail) || "";

/** The apply button is only live once a preview for THIS choice exists. */
export const canApply = (pv, vis, n) => !!pv && pv.visibility === vis && n > 0 && pv.would_change > 0;

/** Combine per-call apply answers (the server does at most max_per_call). */
export function mergeResults(parts) {
  const out = { results: [], published: 0, changed: 0, skipped: 0, not_attempted: 0, charged: 0, stopped: "" };
  for (const p of parts) {
    if (!p) continue;
    out.results.push(...(p.results || []));
    out.published += p.published || 0;
    out.changed += p.changed || 0;
    out.skipped += p.skipped || 0;
    out.not_attempted += p.not_attempted || 0;
    out.charged += (p.charged && p.charged.amount) || 0;
    if (p.stopped && !out.stopped) out.stopped = p.stopped;
  }
  return out;
}

/** What actually happened, from what the server reported. Says "published"
 *  only for rows the server marked published. */
export function resultLine(m) {
  const bits = [];
  if (m.published) bits.push(`${m.published} published`);
  const moved = m.changed - m.published;
  if (moved > 0) bits.push(`${moved} changed`);
  if (m.skipped) bits.push(`${m.skipped} skipped`);
  if (m.not_attempted) bits.push(`${m.not_attempted} not attempted`);
  return bits.length ? bits.join(", ") : "Nothing changed";
}

/** Plan-ladder sentence from the server's own numbers (null = whole library). */
export function importScope(info) {
  if (!info) return "";
  if (info.whole_catalogue || info.max_tracks == null) return "your whole SoundCloud library";
  return `your newest ${info.max_tracks} SoundCloud track${info.max_tracks === 1 ? "" : "s"}`;
}

export const countsLine = (c) => c
  ? `${c.total} imported: ${c.public || 0} public, ${c.restricted || 0} restricted, ${c.private || 0} private`
  : "";
