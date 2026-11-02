// Sorting and filtering a member's past takes.
//
// Pure, so it runs under plain node. Three rules the screen depends on:
//  * A take that has no value for the field sorts LAST in either direction. A take
//    scored before a dimension existed is "not measured", never a 0 — and a 0 at the
//    top of "lowest first" would send somebody to fix something nobody measured.
//  * "Overall" ties break on the exact (decimal) score the member was shown, then on
//    date, so two 6s are not left in whatever order the server happened to send.
//  * Anything other than the default order needs EVERY take, not the first page: the
//    ten newest sorted by score are not the member's best ten. `needsAll` says so and
//    the screen loads the rest before it sorts.

export const DEFAULT_SORT = { by: "date", dir: "desc" };
export const DEFAULT_FILTER = { pbOnly: false, genre: "" };

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The value a take is sorted by, or null when it has none. */
export function sortValue(t, by) {
  if (by === "date") { const d = Date.parse(t.at); return Number.isFinite(d) ? d : null; }
  if (by === "overall") return num(t.exact) ?? num(t.overall);
  return num((t.scores || {})[by]);
}

export function sortTakes(takes, { by, dir } = DEFAULT_SORT) {
  const sign = dir === "asc" ? 1 : -1;
  return [...takes].sort((a, b) => {
    const x = sortValue(a, by), y = sortValue(b, by);
    if (x == null && y == null) return 0;
    if (x == null) return 1;           // missing sorts last whichever way it is read
    if (y == null) return -1;
    if (x !== y) return (x - y) * sign;
    if (by !== "date") {
      const dx = sortValue(a, "date") ?? 0, dy = sortValue(b, "date") ?? 0;
      return (dx - dy) * -1;           // ties: newest first
    }
    return 0;
  });
}

export function filterTakes(takes, { pbOnly, genre } = DEFAULT_FILTER) {
  return takes.filter((t) => (!pbOnly || t.pb) && (!genre || t.genre === genre));
}

export const genresOf = (takes) => [...new Set(takes.map((t) => t.genre).filter(Boolean))].sort();

export const isDefault = (sort, filter) =>
  sort.by === DEFAULT_SORT.by && sort.dir === DEFAULT_SORT.dir && !filter.pbOnly && !filter.genre;

/** Whether the view needs every take rather than the first page. */
export const needsAll = (sort, filter) => !isDefault(sort, filter);
