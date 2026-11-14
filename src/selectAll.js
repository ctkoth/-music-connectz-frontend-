// "Select all" for any pick-several list: the pure half, so it runs under plain node.
//
// WHERE IT BELONGS (Corey: "add select all where appropriate"): a list of options the
// member ticks several of, where ticking every one is allowed, costs nothing more and
// is still the member's own choice. Where it does NOT: a declaration about a person
// (interests, languages, skills, substances), a privacy or consent tick, a list with a
// ceiling lower than its length, or one where each tick adds to a price.

/** Everything in `all`, keeping the member's own order first and appending the rest in
 *  list order — some pickers use the order things were ticked in. */
export function pickEvery(all, picked = []) {
  const known = new Set(all);
  const kept = picked.filter((k) => known.has(k));
  const have = new Set(kept);
  return [...kept, ...all.filter((k) => !have.has(k))];
}

/** How much of `all` is picked: "none" | "some" | "all". */
export function pickState(all, picked = []) {
  if (!all.length) return "none";
  const have = new Set(picked);
  const n = all.filter((k) => have.has(k)).length;
  return n === 0 ? "none" : n === all.length ? "all" : "some";
}

/** How many of `all` are picked. */
export const pickCount = (all, picked = []) => {
  const have = new Set(picked);
  return all.filter((k) => have.has(k)).length;
};
