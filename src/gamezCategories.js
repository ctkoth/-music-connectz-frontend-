// GameZ files every game under the spec's genres and subgenres. The taxonomy is the server's (served with the list);
// this is only the counting and filtering over a member's own games, kept pure so it is tested.
export function tally(games) {
  const genre = {}, sub = {};
  let none = 0;
  for (const g of games) {
    if (!g.genre) { none++; continue; }
    genre[g.genre] = (genre[g.genre] || 0) + 1;
    if (g.subgenre) sub[g.subgenre] = (sub[g.subgenre] || 0) + 1;
  }
  return { genre, sub, none };
}

/** genre: "" = all, "none" = uncategorised, else a genre key. sub: "" = the whole genre, else a subgenre name. */
export function inCategory(games, genre, sub) {
  if (!genre) return games;
  if (genre === "none") return games.filter((g) => !g.genre);
  return games.filter((g) => g.genre === genre && (!sub || g.subgenre === sub));
}
