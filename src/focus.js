// Focus mode: what this app IS, for now, is an AI coach.
//
// Sixty-odd tabs told a newcomer this was a music coach, a fitness log, a
// dating search, a label, a distributor and a game — and most of them are
// two-sided rooms (collabs, venues, marketplaces) that are empty until there
// are people in them, so every one of them said "nobody's here". The coach
// is the one thing that works for one person on day one, so it leads, and
// everything else is one tap behind "More apps".
//
// HIDDEN, NEVER REMOVED. Every app still routes, still searches from the ⊞
// drawer, and a member's own pins and most-used apps still land in their dock
// whatever is on this list — focus decides what is OFFERED, never what a
// member is allowed to keep using.
//
// Reversible in one line: FOCUS_MODE = false restores the old menus exactly.
export const FOCUS_MODE = true;

// The coaches — the product. Ordered as the home screen shows them.
export const FOCUS_COACHES = ["singz", "rapz", "guitarz", "bassz", "keyz", "drumz", "violinz"];

// What a coached member needs around the coach: somewhere to post the take,
// a profile, messages, a friend to challenge, practice tools the coach's own
// notes link into, and the account screens that make it payable.
export const FOCUS_SUPPORT = [
  "postz", "profilez", "messagez", "battlez",
  "metz", "tunerz", "chordz",
  "membershipz", "onboardz", "logz",
  // Not music, kept on purpose: Corey uses it.
  "bodiez",
];

const FOCUS_SET = new Set(["toolz", ...FOCUS_COACHES, ...FOCUS_SUPPORT]);

/** Is this tab offered up front? Everything is, with focus mode off. */
export function inFocus(key) {
  return !FOCUS_MODE || FOCUS_SET.has(key);
}
