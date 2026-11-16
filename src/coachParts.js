// "Which parts are yours?" for the coach. Pure, so it runs under plain node.
//
// A song can have more than one performer. The member picks every verse or chorus they
// are on; the coach scores those as their take and grades each one separately. The
// choices and the sentence are the server's (`my_part` on GET /api/<key>/coach/); this
// only keeps the pick tidy and words what came back.

/** Add or remove one part, capped at the server's maximum. Order is the order picked. */
export function togglePart(picked, label, max = 6) {
  const cur = Array.isArray(picked) ? picked : [];
  if (cur.includes(label)) return cur.filter((x) => x !== label);
  return cur.length >= max ? cur : [...cur, label];
}

/** A typed part joins the picks; blank, a repeat or a full list changes nothing. */
export function addCustomPart(picked, raw, { max = 6, maxChars = 60 } = {}) {
  const label = String(raw || "").replace(/[|\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxChars);
  const cur = Array.isArray(picked) ? picked : [];
  if (!label || cur.length >= max || cur.some((x) => x.toLowerCase() === label.toLowerCase())) return cur;
  return [...cur, label];
}

/** What goes on the wire: the parts joined with "|", or nothing when none are picked. */
export const partsField = (picked) => (Array.isArray(picked) && picked.length ? picked.join("|") : "");

/** The picked parts in one line, for the folded options and the result heading. */
export const partsLine = (picked) => (Array.isArray(picked) && picked.length ? `my parts: ${picked.join(", ")}` : "");

/** The sections the coach graded, split into the member's and everyone else's. A row
 *  with no score is not shown: a section with no number is not a grade. */
export function splitParts(parts) {
  const rows = (Array.isArray(parts) ? parts : []).filter((p) => p && p.label && typeof p.score === "number");
  return { mine: rows.filter((p) => p.mine), others: rows.filter((p) => !p.mine) };
}
