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
  return standalone ? list.filter((k) => k.allowed !== false) : list;
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
