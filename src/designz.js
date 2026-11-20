// Pure decisions for DesignZ, kept out of the component so they run under plain node (the component imports api.js,
// which reads import.meta.env). The feed, the ratings and every control are the server's; this only picks which posts are
// DESIGN work and finds the picture to show.

/** The picture a post carries, whichever shape the server sent it in. "" when it has none. */
export function imageOf(p) {
  if (!p) return "";
  if (p.media && typeof p.media === "object" && p.media.image) return String(p.media.image);
  if ((p.media_type || "") === "image" && p.media_url) return String(p.media_url);
  return "";
}

/** The coach notes handed over from ImageZ, or null when they are not the shape the server sends. The numbers and the words
 *  are the server's and are shown as they came; this only refuses a payload that would draw a blank label or a bare number. */
export function notesFromHandoff(p) {
  const n = p && p.notes;
  if (!n || typeof n !== "object" || !n.scores || typeof n.scores !== "object") return null;
  const rows = Object.entries(n.scores)
    .filter(([, d]) => d && typeof d === "object" && d.label)
    .map(([key, d]) => ({ key, label: String(d.label), score: typeof d.score === "number" ? d.score : null, why: String(d.why || ""), how: String(d.how || "") }));
  if (!rows.length) return null;
  const image = typeof p.image === "string" && p.image.startsWith("data:image/") ? p.image : "";
  return { overall: typeof n.overall === "number" ? n.overall : null, verdict: String(n.verdict || ""), next: String(n.next || ""), rows, image };
}

/** The posts that are design work: they carry a picture, or they name a design skill. Order is the server's. A post with
 *  neither is not a design and is not shown — nothing is padded in to fill the grid. */
export function designPosts(posts, designSkillKeys) {
  const keys = designSkillKeys instanceof Set ? designSkillKeys : new Set(designSkillKeys || []);
  return (Array.isArray(posts) ? posts : []).filter((p) => p && p.id != null
    && (imageOf(p) || (p.skills_used || []).some((k) => keys.has(k))));
}
