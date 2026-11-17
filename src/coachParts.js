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

/** The breakdown as a table: one row per parameter at least one section was graded on,
 *  one cell per section. `best` is the index of the section that leads that parameter,
 *  or -1 when two are level at the top or only one was graded (nobody leads). A cell the
 *  coach did not grade is null and is drawn as a dash, never as 0. */
export function breakdownTable(parts, factors) {
  const rows = (Array.isArray(parts) ? parts : []).filter((p) => p && p.label && typeof p.score === "number");
  const overall = rows.map((p) => p.score);
  const lead = (cells) => {
    const given = cells.filter((v) => typeof v === "number");
    if (given.length < 2) return -1;
    const top = Math.max(...given);
    return given.filter((v) => v === top).length === 1 ? cells.indexOf(top) : -1;
  };
  const out = [{ key: "_overall", label: "Overall", cells: overall, best: lead(overall) }];
  for (const [key, label] of Object.entries(factors || {})) {
    const cells = rows.map((p) => (typeof p.scores?.[key] === "number" ? p.scores[key] : null));
    if (cells.some((v) => v !== null)) out.push({ key, label, cells, best: lead(cells) });
  }
  return { sections: rows, rows: out };
}

/** The headline of a comparison, from the server's own arithmetic. "" when there is
 *  nothing to compare (one section), so the screen says nothing rather than naming a winner of one. */
export function compareLine(compare) {
  if (!compare?.ranked?.length) return "";
  const top = compare.ranked[0];
  const head = compare.best
    ? `${compare.best} is the strongest section (${top.score}/10).`
    : `${compare.ranked.filter((r) => r.score === top.score).map((r) => r.label).join(" and ")} are level at the top (${top.score}/10).`;
  const leads = (compare.by_factor || []).filter((f) => f.best && f.lead >= 2)
    .sort((a, b) => b.lead - a.lead).slice(0, 3)
    .map((f) => `${f.best} leads ${f.label} by ${f.lead}`);
  return leads.length ? `${head} ${leads.join(" · ")}.` : head;
}
