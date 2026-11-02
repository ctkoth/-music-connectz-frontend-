import { ENERGY } from "./resources.js";

// SocialZ's small decisions, kept free of React and of `import.meta.env` so plain node
// can test them. Neither computes anything the platform decides: the rate is the server's, and
// these only word the DIFFERENCE between two reads of it.

const LOOK = {
  verified: { label: "✓ Counts", cls: "border-emerald-300/50 text-emerald-300" },
  pending: { label: "With a person", cls: "border-amber-300/50 text-amber-300" },
  rejected: { label: "Not confirmed", cls: "border-mcz-ember/50 text-mcz-ember" },
  unverified: { label: "Not counted", cls: "border-white/20 text-white/55" },
};

/** The chip for an account's status. An unknown word from a newer server reads as not counted,
 *  never as verified — the cautious direction, because verified is what pays. */
export function statusLook(status) {
  return LOOK[status] || LOOK.unverified;
}

/** What a check moved, in the units the screen already shows (⚡ an hour). `before` is null the
 *  first time (nothing to compare), and a drop is said as plainly as a rise: a verified count can
 *  come back lower than the one a member hoped for, and hiding that is a made-up gain. */
export function rateChange(before, after) {
  if (before == null || after == null) return null;
  const diff = after - before;
  if (diff > 0) return { tone: "up", diff, text: `▲ Your rate went from ${before} to ${after} ${ENERGY} an hour (+${diff}).` };
  if (diff < 0) return { tone: "down", diff, text: `▼ Your rate went from ${before} to ${after} ${ENERGY} an hour (${diff}).` };
  return { tone: "same", diff: 0, text: `Your rate is unchanged at ${after} ${ENERGY} an hour.` };
}

/** One key for an address however it was typed or stored: no scheme, no trailing slash, lower
 *  case. The server completes a bare "instagram.com/x" to https:// on the way in, so the row it
 *  comes back as and the text the member typed are the same account and must find each other —
 *  otherwise the sentence about the check lands on a row that is not there. */
export const nkey = (u) => String(u || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
