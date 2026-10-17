// The small, pure decisions Sentence ConnectZ's screen makes about what the
// server sent. Kept out of the component so they can be tested without a
// browser — and kept small, because everything that matters (the kinds, whose
// voice each is written in, the brief limit, the price) is the server's and this
// file only chooses what to SHOW of it.
// Not imported from limits.js: that pulls in api.js, which reads import.meta.env,
// and this file has to run under plain node for its tests. These are tier NAMES;
// every number comes from the server.
const UP = { free: "premium", premium: "statz" };
const NAME = { premium: "Premium", statz: "StatZ" };

/**
 * Which kinds a screen lists. The standalone app has no ProfileZ to add the
 * Manager or A&R Scout persona in, so a persona-gated agreement there would be a
 * locked door with no key anywhere in the app — it is left out rather than shown
 * as something to want. The main app lists them all, locked ones included, with
 * the way to unlock them.
 */
export function visibleKinds(kinds, standalone) {
  const list = Array.isArray(kinds) ? kinds : [];
  // A fixer repairs a score the music coach gave (punchlines, hooks…); the
  // writer-only standalone has no coach, so offering one there is a door to a
  // screen that is not there.
  return standalone ? list.filter((k) => k.allowed !== false && !k.fixer) : list;
}

/**
 * The kind to land on: the one asked for if it is on offer, otherwise the first
 * that is. An older API may not know a kind this build asks for first, and the
 * standalone may have dropped it.
 */
export function pickKind(kinds, wanted) {
  if (kinds.some((k) => k.key === wanted)) return wanted;
  return kinds[0]?.key || wanted;
}

/**
 * What the next tier up takes in a brief, from the server's ladder — never typed
 * here. `chars: null` is "no limit". Null when the member is on the top tier or
 * the server did not send a ladder (an older API), so the screen says nothing
 * rather than guessing a number.
 */
export function nextTierBrief(s) {
  const up = UP[String(s?.tier || "free").toLowerCase()];
  if (!up || !Array.isArray(s?.brief_ladder)) return null;
  const row = s.brief_ladder.find((r) => r.tier === up);
  return row ? { tier: up, label: NAME[up] || up, chars: row.chars } : null;
}

/**
 * A brief held to the tier's limit — and HOW MUCH was left off. `maxLength` on the
 * textarea truncated a paste before any handler saw it, so a resume pasted over
 * the limit lost its tail without a word; the field takes the whole paste now and
 * this is where it is cut. The first characters are the ones kept, the same as a
 * pasted list of links keeps its first.
 */
export function briefCut(full, limit) {
  const text = String(full ?? "");
  if (!Number.isFinite(limit) || limit == null || text.length <= limit) return { kept: text, cut: 0 };
  return { kept: text.slice(0, limit), cut: text.length - limit };
}

/** The sentence for a cut brief, or "" when nothing was. */
export function cutNote(cut, limit) {
  if (!cut) return "";
  const n = cut.toLocaleString();
  return `${n} character${cut === 1 ? "" : "s"} didn't fit and ${cut === 1 ? "was" : "were"} left off the end — your brief holds ${Number(limit).toLocaleString()}.`;
}
