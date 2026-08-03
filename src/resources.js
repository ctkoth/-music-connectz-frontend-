// The resource emoji, in one place.
//
// SpinaZ was rendering three different ways — a ✦ glyph in the header and
// BattleZ, a lucide <Star> in ProfileZ / AdZ / OfferZ, and nothing at all in
// most copy. Same currency, three symbols, so it never read as one thing.
//
// These are the canonical marks from CLAUDE.md. Import them; never retype the
// character. A resource with two symbols is the same class of bug as a tier
// number hardcoded in nine places.
export const ENERGY = "⚡";
export const SPINAZ = "🍥";
export const PROMPTZ = "🏷️";
export const MONEY = "💵";
export const XP = "⭐";

/** "+300 🍥" — an amount with its resource, the way the paradigm wants it. */
export const amount = (n, emoji, sign = "") =>
  `${sign}${Number(n ?? 0).toLocaleString()} ${emoji}`;

export const spinaz = (n, sign = "") => amount(n, SPINAZ, sign);
export const energy = (n, sign = "") => amount(n, ENERGY, sign);
