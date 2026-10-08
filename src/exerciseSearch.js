// Exercise search, kept pure (no React) so it can be tested and reused.

// 0 = starts with the query, 1 = a word starts with it, 2 = contains it, null = no match.
// Every typed word must match somewhere, so "inc dumb" finds "Incline Dumbbell Press".
export function matchRank(name, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const n = name.toLowerCase();
  let rank = 0;
  for (const w of q.split(/\s+/)) {
    if (n.startsWith(w)) continue;
    if (n.split(/[^a-z0-9]+/).some((t) => t.startsWith(w))) { rank = Math.max(rank, 1); continue; }
    if (n.includes(w)) { rank = Math.max(rank, 2); continue; }
    return null;
  }
  return rank;
}

/** The suggestions for what is typed, narrowed by muscle. Pure, so it can be tested. */
export function suggest(exercises, query, muscle) {
  const pool = exercises.filter((e) => !muscle || e.muscle_group === muscle);
  const scored = [];
  for (const e of pool) {
    const r = matchRank(e.name, query);
    if (r !== null) scored.push({ e, r });
  }
  scored.sort((a, b) =>
    a.r - b.r
    || (b.e.times_done > 0) - (a.e.times_done > 0)
    || String(b.e.last_done || "").localeCompare(String(a.e.last_done || ""))
    || a.e.name.localeCompare(b.e.name));
  return scored.map((x) => x.e);
}

