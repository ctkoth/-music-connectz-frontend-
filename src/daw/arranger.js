// The arranger: the song as named sections you can move, copy and drop, with everything inside them going along.
// A section is { id, name, start, end, color } on the session (session.js). Arranging works on the song as ONE contiguous map
// from the first section's start to the last section's end: a gap between two sections belongs to the section before it, so
// nothing is ever left behind when a section moves. Audio before the first section stays where it is; audio after the last
// follows the arrangement's new end. Every take lane on every track moves together, so takes stay lined up. Pure and tested.
import { MIN_LEN, MAX_SECTIONS, COLORS, beatSeconds, endOf, lenOf, lengthOf, uid } from "./session.js";

const EPS = 1e-6;
export const sortedSections = (s) => [...(s.sections || [])].sort((a, b) => a.start - b.start);

/** Each section's span in the contiguous map: [start of it, start of the next) and, for the last, to its own end. */
export function spans(s) {
  const sec = sortedSections(s);
  return sec.map((x, i) => ({ id: x.id, a: x.start, b: i + 1 < sec.length ? sec[i + 1].start : x.end }));
}
/** Why a section cannot go here (a sentence), or null. */
export function sectionProblem(s, start, end, ignoreId = null) {
  if (!(end - start >= 0.1)) return "A section needs to be at least a tenth of a second long.";
  if ((s.sections || []).length >= MAX_SECTIONS && !ignoreId) return `A song holds up to ${MAX_SECTIONS} sections.`;
  const clash = (s.sections || []).find((x) => x.id !== ignoreId && start < x.end - EPS && end > x.start + EPS);
  return clash ? `That overlaps "${clash.name}". Sections can't overlap.` : null;
}
export function addSection(s, { name, start, end, color }) {
  if (sectionProblem(s, start, end)) return s;
  const i = (s.sections || []).length;
  return { ...s, sections: [...(s.sections || []), { id: uid("sec"), name: String(name || `Section ${i + 1}`).slice(0, 40), start: Math.max(0, start), end, color: color || COLORS[i % COLORS.length] }].sort((a, b) => a.start - b.start) };
}
/** A section of `bars` bars straight after the last one (or at the start). */
export function appendSection(s, name, bars = 8) {
  const last = sortedSections(s).at(-1);
  const start = last ? last.end : 0;
  return addSection(s, { name, start, end: start + bars * s.meter * beatSeconds(s) });
}
export function updateSection(s, id, patch) {
  const cur = (s.sections || []).find((x) => x.id === id);
  if (!cur) return s;
  const next = { ...cur, ...patch, name: String(patch.name ?? cur.name).slice(0, 40) };
  if (patch.start !== undefined || patch.end !== undefined) { if (sectionProblem(s, next.start, next.end, id)) return s; }
  return { ...s, sections: s.sections.map((x) => (x.id === id ? next : x)).sort((a, b) => a.start - b.start) };
}
export const removeSection = (s, id) => ({ ...s, sections: (s.sections || []).filter((x) => x.id !== id) });   // the music stays; only the label goes

/**
 * Lay the song out as `plan`: a list of section ids, in the order they should now play. An id may appear twice (a copy) or not
 * at all (cut, with its music). Everything in a section's span goes with it: audio is split at the section edges, markers and
 * automation points move, take lanes stay aligned. Returns the same session when the plan is the song as it already is.
 */
export function arrange(s, plan) {
  const sp = spans(s);
  if (!sp.length) return s;
  const byId = new Map(sp.map((x) => [x.id, x]));
  const slots = plan.filter((id) => byId.has(id));
  if (!slots.length) return s;
  if (slots.length === sp.length && slots.every((id, i) => id === sp[i].id)) return s;

  const first = sp[0].a, lastEnd = sp.at(-1).b;
  const lenOfSpan = (x) => x.b - x.a;
  // The output slots, with where each now starts.
  let cursor = first;
  const out = slots.map((id) => { const x = byId.get(id); const slot = { id, src: x, at: cursor }; cursor += lenOfSpan(x); return slot; });
  const newEnd = cursor;
  const tailShift = newEnd - lastEnd;
  // Pieces of the song that are not in any section: before the first (stays) and after the last (follows the end).
  const pre = { a: -Infinity, b: first, shift: 0 };
  const post = { a: lastEnd, b: Infinity, shift: tailShift };
  const places = [pre, ...out.map((o, i) => ({ a: o.src.a, b: o.src.b, shift: o.at - o.src.a, slot: i, copy: out.findIndex((p) => p.id === o.id) !== i })), post];

  const pieceRegions = (regions) => {
    const made = []; const used = new Set();
    for (const r of regions) {
      const rEnd = endOf(r);
      for (const pl of places) {
        const ia = Math.max(r.at, pl.a), ib = Math.min(rEnd, pl.b);
        if (ib - ia < MIN_LEN) continue;
        const keep = !used.has(r.id) && !pl.copy;
        used.add(r.id);
        made.push({ ...r, id: keep ? r.id : uid("r"), at: Math.round((ia + pl.shift) * 1e6) / 1e6, in: r.in + (ia - r.at), out: r.in + (ib - r.at),
          fadeIn: Math.abs(ia - r.at) < EPS ? r.fadeIn : 0, fadeOut: Math.abs(ib - rEnd) < EPS ? r.fadeOut : 0 });
      }
    }
    return made.sort((a, b) => a.at - b.at);
  };
  const movePoints = (pts) => {
    const made = [];
    for (const p of pts) for (const pl of places) if (p.t >= pl.a && p.t < pl.b) made.push({ ...p, t: Math.max(0, Math.round((p.t + pl.shift) * 1e6) / 1e6) });
    return made.sort((a, b) => a.t - b.t);
  };
  const tracks = s.tracks.map((t) => ({
    ...t,
    playlists: t.playlists.map((p) => ({ ...p, regions: pieceRegions(p.regions) })),
    auto: Object.fromEntries(Object.entries(t.auto || {}).map(([k, lane]) => [k, { ...lane, points: movePoints(lane.points || []) }])),
  }));
  const markers = [];
  for (const m of s.markers || []) for (const pl of places) if (m.t >= pl.a && m.t < pl.b) markers.push({ ...m, id: pl.copy ? uid("m") : m.id, t: Math.max(0, m.t + pl.shift) });
  const seen = new Set();
  const sections = out.map((o) => {
    const orig = (s.sections || []).find((x) => x.id === o.id);
    const dupe = seen.has(o.id); seen.add(o.id);
    return { ...orig, id: dupe ? uid("sec") : orig.id, name: dupe ? `${orig.name} (copy)`.slice(0, 40) : orig.name, start: o.at, end: o.at + (orig.end - orig.start) };
  });
  // Material in a gap after a section was folded into that section's span, so the sections' own ends are their own lengths again.
  return { ...s, tracks, markers: markers.sort((a, b) => a.t - b.t), sections: sections.slice(0, MAX_SECTIONS) };
}

export const moveSection = (s, id, toIndex) => {
  const ids = spans(s).map((x) => x.id);
  const from = ids.indexOf(id);
  if (from < 0) return s;
  ids.splice(from, 1);
  ids.splice(Math.max(0, Math.min(ids.length, toIndex)), 0, id);
  return arrange(s, ids);
};
export const duplicateSection = (s, id) => {
  const ids = spans(s).map((x) => x.id); const i = ids.indexOf(id);
  if (i < 0) return s;
  ids.splice(i + 1, 0, id);
  return arrange(s, ids);
};
/** Cut a section AND its music, closing the gap. (`removeSection` only takes the label off.) */
export const deleteSectionWithMusic = (s, id) => arrange(s, spans(s).map((x) => x.id).filter((x) => x !== id));
export const songEnd = (s) => Math.max(lengthOf(s), sortedSections(s).at(-1)?.end || 0);
export { lenOf };
