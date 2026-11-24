// Finding an FX chain among a hundred and thirty: search, and the ones that suit this track first.
//
// Pure, so it runs under plain node. A chain is a built-in starter ({ key, name, what, group, statz }); applying one is the
// caller's business. "Suits this track" is the track's role (set on import or guessed from its name) mapped to the groups of
// chains written for that kind of sound — a hint for ordering, never a filter: every chain stays one search away.
import { guessRole } from "../mastering/multitrack.js";

const SUITS = {
  lead: /^(Voice|Rap|Hook|StatZ chains|Acting)/,
  backing: /^(Voice|Rap|Hook|StatZ chains)/,
  bass: /^Bass/,
  drums: /^Drums/,
  beat: /^Mix/,
  instrument: /^(Guitar|Keys|Strings|More instruments)/,
};

/** The role a track plays: its own, else a guess from its name. */
export const roleOfTrack = (t) => (t && (t.role || guessRole(t.name))) || "other";

/** Does this chain suit a track of this role? */
export const suitsRole = (starter, role) => !!(SUITS[role] && SUITS[role].test(starter.group || ""));

const norm = (s) => String(s || "").toLowerCase();

/** Chains matching every word of the query (in name, group or what it does), suiting-first, then in the list's own order.
 *  An empty query returns everything. */
export function searchChains(starters, query, role = "other") {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const hit = (s) => words.every((w) => norm(`${s.name} ${s.group} ${s.what}`).includes(w));
  const list = (starters || []).filter(hit);
  const suit = list.filter((s) => suitsRole(s, role));
  return [...suit, ...list.filter((s) => !suitsRole(s, role))];
}
