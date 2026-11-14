// The coach's scoring options, said in one line. Pure, so it runs under plain node.
//
// The member recorder folds its options away (Record comes first) and this line is
// what stays on screen: what the take will be judged against, before it is recorded.
// It words the member's own choices and nothing else.

/** "Trap · Boom Bap · Performer · lyrics rated · 3 extra scores · mix rated" */
export function scoringSummary({ genre = "", style = "", difficulty = "", lyrics = false, extras = 0, mix = false } = {}) {
  const bits = [genre, style, difficulty].map((s) => String(s || "").trim()).filter(Boolean);
  if (lyrics) bits.push("lyrics rated");
  if (extras > 0) bits.push(`${extras} extra score${extras === 1 ? "" : "s"}`);
  if (mix) bits.push("mix rated");
  return bits.join(" · ") || "the defaults";
}

const KEY = "mcz_coach_opts_open";

/** Whether the member left the options open. Closed unless they opened them. */
export function readOptsOpen(store = globalThis.localStorage) {
  try { return store.getItem(KEY) === "1"; } catch { return false; }
}

export function writeOptsOpen(open, store = globalThis.localStorage) {
  try { store.setItem(KEY, open ? "1" : "0"); } catch { /* it still opens for this visit */ }
}
