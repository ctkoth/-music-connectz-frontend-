// Supersets: two routine rows done back to back, the rest taken after the pair.
//
// A superset is DATA on the rows — two ADJACENT rows sharing a `group` label —
// and linking two lifts by hand is free at every tier. What the Coach adds is
// choosing the partner (the server's `superset.py`, StatZ or the free hour), and
// it hands back rows in this same shape, so a pair the Coach made and a pair a
// member made are the same thing and edit the same way.
//
// These are the rules for keeping that shape honest after a hand edit, mirrored
// from the server's `valid_groups`: a group is only meaningful as exactly two rows
// side by side, so a lone label left behind by a delete, three rows sharing one,
// or two with a lift between them are dropped rather than guessed at. Pure, so the
// designer and the logger and the tests all read one definition.
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Drop every group that is not exactly two adjacent rows. */
export function validGroups(rows) {
  const at = {};
  rows.forEach((r, i) => { if (r.group) (at[r.group] ||= []).push(i); });
  const good = new Set(Object.entries(at)
    .filter(([, idx]) => idx.length === 2 && idx[1] === idx[0] + 1).map(([g]) => g));
  return rows.map((r) => {
    if (!r.group || good.has(r.group)) return r;
    const { group: _drop, ...rest } = r;
    return rest;
  });
}

/** Fresh labels A, B, C… in routine order. */
export function relabel(rows) {
  const names = {};
  let n = 0;
  return rows.map((r) => {
    if (!r.group) return r;
    if (!(r.group in names)) names[r.group] = LETTERS[n++ % LETTERS.length];
    return { ...r, group: names[r.group] };
  });
}

export const normalize = (rows) => relabel(validGroups(rows));

/** Index of the other half of the pair row `i` is in, or -1. */
export function partnerOf(rows, i) {
  const g = rows[i]?.group;
  if (!g) return -1;
  if (rows[i - 1]?.group === g) return i - 1;
  if (rows[i + 1]?.group === g) return i + 1;
  return -1;
}

/** "A1" for the first lift of pair A, "A2" for the second, "" for a single. */
export function badge(rows, i) {
  const p = partnerOf(rows, i);
  return p === -1 ? "" : `${rows[i].group}${p < i ? 2 : 1}`;
}

/** Row `i` and the one below it become a pair. Null if they cannot (the last
 *  row, or either is already in one) — the caller leaves the routine as it was. */
export function linkWithNext(rows, i) {
  if (i < 0 || i >= rows.length - 1) return null;
  if (rows[i].group || rows[i + 1].group) return null;
  const out = rows.map((r) => ({ ...r }));
  out[i].group = out[i + 1].group = "_";
  return normalize(out);
}

/** The pair row `i` is in comes apart. */
export function unlink(rows, i) {
  const p = partnerOf(rows, i);
  if (p === -1) return rows;
  return normalize(rows.map((r, k) => {
    if (k !== i && k !== p) return r;
    const { group: _drop, ...rest } = r;
    return rest;
  }));
}

/** The plan as blocks: a single lift, or a pair side by side. */
export function blocks(rows) {
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const p = partnerOf(rows, i);
    if (p === i + 1) { out.push({ pair: [rows[i], rows[i + 1]], group: rows[i].group }); i += 1; }
    else out.push({ single: rows[i] });
  }
  return out;
}

/**
 * Which lift to do next in a pair, from how many sets of each are done. They
 * alternate: A1, A2, A1, A2 — so the one with fewer sets is next, the first on a
 * tie. Null once both have their target sets.
 */
export function nextInPair(pair, doneFirst, doneSecond) {
  const [a, b] = pair;
  const ta = a.sets || 3, tb = b.sets || 3;
  const aOpen = doneFirst < ta, bOpen = doneSecond < tb;
  if (!aOpen && !bOpen) return null;
  if (aOpen && !bOpen) return 0;
  if (!aOpen && bOpen) return 1;
  return doneFirst <= doneSecond ? 0 : 1;
}

/**
 * The lift the member should go STRAIGHT to, if the set they just logged was the
 * first half of a pair — so the rest clock does not tell them to rest in the middle
 * of a superset. Null whenever the last set was not the first of a pair, or the
 * second is already done.
 */
export function holdFor(planned, setsByExercise, lastExerciseId) {
  for (const b of blocks(planned)) {
    if (!b.pair) continue;
    const [a, c] = b.pair;
    if (a.exercise_id !== lastExerciseId) continue;
    const da = (setsByExercise[a.exercise_id] || []).length;
    const dc = (setsByExercise[c.exercise_id] || []).length;
    return nextInPair(b.pair, da, dc) === 1 && da > dc ? c : null;
  }
  return null;
}
