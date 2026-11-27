// Copy for tier counts the server served. A screen never types a plan's number: it hands these
// helpers the served values. A count nobody served says nothing, rather than a guessed figure.
//
// A served count is a number, `null` for unlimited, or `undefined` when it was not sent.
// Pure: no DOM and no import.meta, so it runs under plain node (tierCount.test.mjs).

/** One served count as a word: "12", "unlimited", or null while it is unknown. */
export const countWords = (n) => (n === undefined ? null : n === null ? "unlimited" : String(n));

/**
 * What the plans ABOVE a member read, from their own served count and the served ladder for the
 * same key. A plan is named only when its number is strictly above the member's, and unlimited is
 * above everything. A plan whose number was not sent is left out. `verb` is "has" on a screen and
 * "keeps" in a refusal sentence, matching the backend's `higher_tiers_keep`.
 *
 *   upgradeWords(3, { premium: 6, statz: 12 })              -> "Premium has 6, StatZ has 12"
 *   upgradeWords(6, { premium: 6, statz: 12 })              -> "StatZ has 12"
 *   upgradeWords(12, { premium: 6, statz: 12 })             -> ""
 *   upgradeWords(3, { premium: 6, statz: null }, "keeps")   -> "Premium keeps 6, StatZ keeps as many as you like"
 */
export function upgradeWords(count, ladder, verb = "has") {
  if (count === undefined || count === null) return ""; // unknown, or unlimited: nothing above it to name
  return [["Premium", ladder?.premium], ["StatZ", ladder?.statz]]
    .filter(([, n]) => n !== undefined && (n === null || n > count))
    .map(([label, n]) => (n === null
      ? (verb === "keeps" ? `${label} keeps as many as you like` : `${label} is unlimited`)
      : `${label} ${verb} ${n}`))
    .join(", ");
}

/** The served ladder for one key, read off a `/limits/` payload's `tiers`: { premium, statz }. */
export const ladderOf = (lim, key) => ({ premium: lim?.tiers?.premium?.[key], statz: lim?.tiers?.statz?.[key] });

/** The plans above the member's own count for one served key, read off one `/limits/` payload. */
export const planWords = (lim, key, verb = "has") => upgradeWords(lim?.[key], ladderOf(lim, key), verb);
